import { and, count, desc, eq, exists, ilike, inArray, isNull, or, sql, gte } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import {
  users as usersModel,
  posts as postsModel,
  post_likes as postLikesModel,
  posts_to_tags,
  tags as tagsModel,
  user_follows,
  user_tag_follows,
} from '../../../database/schemas/postgres/schema';
import { PostQueryHelpers } from './postQueryHelpers';
import { PostTagManager } from './postTagManager';
import type { PostCreateBody, PostUpdateBody } from '../validation';
import type { GetPaginationParams } from '../../../types/paginate';
import { getPaginationMetadata } from '../../../utils/paginate';
import { Errors } from '../../../utils/error';

export class PostService {
  constructor() {}

  private resolvePublicationState(
    body: Pick<PostCreateBody | PostUpdateBody, 'published' | 'published_at'>,
    current?: { published: boolean | null; published_at: string | null }
  ) {
    const published = body.published ?? current?.published ?? true;

    if (!published) {
      return {
        published: false,
        published_at: null,
      };
    }

    if (body.published_at !== undefined) {
      return {
        published: true,
        published_at: body.published_at ?? new Date().toISOString(),
      };
    }

    if (!current) {
      return {
        published: true,
        published_at: new Date().toISOString(),
      };
    }

    if (!current.published || !current.published_at) {
      return {
        published: true,
        published_at: new Date().toISOString(),
      };
    }

    return {
      published: true,
      published_at: current.published_at,
    };
  }

  /** User ids and tag ids the viewer follows (for feeds). */
  private async getFollowGraphIds(followerId: string): Promise<{
    authorIds: string[];
    tagIds: number[];
  }> {
    const [followingRows, tagFollowRows] = await Promise.all([
      db
        .select({ id: user_follows.following_id })
        .from(user_follows)
        .where(and(eq(user_follows.follower_id, followerId), isNull(user_follows.deleted_at))),
      db
        .select({ id: user_tag_follows.tag_id })
        .from(user_tag_follows)
        .where(and(eq(user_tag_follows.user_id, followerId), isNull(user_tag_follows.deleted_at))),
    ]);

    return {
      authorIds: followingRows.map((r) => r.id),
      tagIds: tagFollowRows.map((r) => r.id),
    };
  }

  /**
   * Ranking score: recency decay + log engagement + boosts for followed authors/tags.
   * Weights are tuned for a simple "For You" MVP (no ML).
   */
  private buildForYouScoreSql(authorIds: string[], tagIds: number[]) {
    const ageDays = sql`GREATEST(0::double precision, EXTRACT(EPOCH FROM (NOW() - ${postsModel.created_at}::timestamptz)) / 86400.0)`;
    const recency = sql`(2.0 / (1.0 + ${ageDays}))`;
    const engagement = sql`(
      0.5 * LN(GREATEST(COALESCE(${postsModel.like_count}, 0)::double precision, 0) + 1)
      + 0.15 * LN(GREATEST(COALESCE(${postsModel.view_count}, 0)::double precision, 0) + 1)
    )`;

    const authorBoost =
      authorIds.length > 0
        ? sql`(CASE WHEN ${postsModel.created_by} IN (${sql.join(
            authorIds.map((id) => sql`${id}`),
            sql`, `
          )}) THEN 1.5::double precision ELSE 0::double precision END)`
        : sql`0::double precision`;

    const followedTagMatch =
      tagIds.length > 0
        ? exists(
            db
              .select({ one: sql`1` })
              .from(posts_to_tags)
              .where(
                and(eq(posts_to_tags.post_id, postsModel.id), inArray(posts_to_tags.tag_id, tagIds))
              )
          )
        : undefined;

    const tagBoost =
      tagIds.length > 0 && followedTagMatch
        ? sql`(CASE WHEN ${followedTagMatch} THEN 1.0::double precision ELSE 0::double precision END)`
        : sql`0::double precision`;

    return sql`(${recency} + ${engagement} + ${authorBoost} + ${tagBoost})`;
  }

  private mapPostRowToFeedItem(post: any) {
    return {
      id: post.id,
      title: post.title,
      body: post.body_snippet ? post.body_snippet + '...' : '',
      slug: post.slug,
      photo_url: post.photo_url,
      created_at: post.created_at,
      updated_at: post.updated_at,
      published: post.published,
      published_at: post.published_at,
      status: PostQueryHelpers.getLifecycleStatus(post),
      view_count: post.view_count ?? 0,
      like_count: post.like_count ?? 0,
      bookmark_count: post.bookmark_count ?? 0,
      user: post.user,
      tags: post.posts_to_tags.map((tag: any) => tag.tag),
    };
  }

  async updatePost(post_id: string, auth_id: string, body: PostUpdateBody) {
    return await db.transaction(async (tx) => {
      const existingPost = await tx.query.posts.findFirst({
        where: and(
          eq(postsModel.id, post_id),
          eq(postsModel.created_by, auth_id),
          isNull(postsModel.deleted_at)
        ),
        columns: { id: true, published: true, published_at: true },
      });

      if (!existingPost) {
        throw Errors.NotFound('Post not found or unauthorized');
      }

      const { tags, ...updateFields } = body;
      const publicationState = this.resolvePublicationState(updateFields, existingPost);
      const updateData = {
        ...Object.fromEntries(Object.entries(updateFields).filter(([, value]) => value !== undefined)),
        ...publicationState,
        updated_at: new Date().toISOString(),
      };

      const [updatedPost] = await tx
        .update(postsModel)
        .set(updateData)
        .where(eq(postsModel.id, post_id))
        .returning();

      if (tags) {
        await PostTagManager.updatePostTags(post_id, tags, tx);
      }

      return {
        ...updatedPost,
        status: PostQueryHelpers.getLifecycleStatus(updatedPost),
      };
    });
  }

  async incrementView(post_id: string) {
    return await db
      .update(postsModel)
      .set({ view_count: sql`${postsModel.view_count} + 1` })
      .where(eq(postsModel.id, post_id))
      .returning({ id: postsModel.id, view_count: postsModel.view_count });
  }

  async getTrendingPosts(limit = 5) {
    const queryConfig = PostQueryHelpers.getPublishedPostQuery();

    const posts = await db.query.posts.findMany({
      ...queryConfig,
      orderBy: [desc(postsModel.view_count), desc(postsModel.like_count)],
      columns: {
        body: false,
      },
      extras: {
        body: sql<string>`substring(${postsModel.body} from 1 for 200)`.as('body'),
      },
      with: {
        user: { columns: { username: true } },
        posts_to_tags: { columns: {}, with: { tag: true } },
      },
      limit: limit,
    });

    return posts.map((post) => ({
      ...post,
      body: post.body ? post.body + '...' : '',
      user: post.user,
      tags: post.posts_to_tags.map((t: any) => t.tag),
    }));
  }

  async getAllPosts(limit = 100, offset = 0) {
    const [posts, totalRows] = await Promise.all([
      db.query.posts.findMany({
        where: isNull(postsModel.deleted_at),
        orderBy: desc(postsModel.created_at),
        with: {
          user: {
            columns: { password: false, github_id: false, last_logged_at: false },
          },
          posts_to_tags: { columns: {}, with: { tag: true } },
        },
        limit: limit,
        offset: offset,
      }),
      db.select({ count: count() }).from(postsModel).where(isNull(postsModel.deleted_at)),
    ]);
    return { data: posts, total: totalRows[0].count };
  }

  async addPost(auth_id: string, body: PostCreateBody) {
    return await db.transaction(async (tx) => {
      try {
        const publicationState = this.resolvePublicationState(body);
        const [post] = await tx
          .insert(postsModel)
          .values({
            body: body.body,
            title: body.title,
            slug: body.slug,
            photo_url: body.photo_url,
            created_by: auth_id,
            ...publicationState,
          })
          .returning({ id: postsModel.id });

        if (body.tags && body.tags.length > 0) {
          await PostTagManager.linkTagsToPost(post.id, body.tags, tx);
        }

        return post;
      } catch (error) {
        console.error('Error adding post:', error);
        throw Errors.DatabaseError({ message: 'Failed to create post', error });
      }
    });
  }

  async getPostByUsernameSlug(username: string, slug: string) {
    const user = await db.query.users.findFirst({
      where: eq(usersModel.username, username),
      columns: { id: true },
    });

    if (!user) {
      return null;
    }

    const post = await db.query.posts.findFirst({
      where: and(
        eq(postsModel.slug, slug),
        eq(postsModel.created_by, user.id),
        PostQueryHelpers.buildPublishedVisibilityClause(),
        isNull(postsModel.deleted_at)
      ),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            email: true,
            first_name: true,
            last_name: true,
            image: true,
            is_super_admin: true,
          },
        },
        posts_to_tags: {
          columns: {},
          with: {
            tag: true,
          },
        },
      },
    });

    if (!post) {
      return null;
    }

    return {
      ...post,
      status: PostQueryHelpers.getLifecycleStatus(post),
      user: post.user,
      tags: post.posts_to_tags.map((t) => t.tag),
    };
  }

  async getPosts(params: GetPaginationParams) {
    const { offset, limit, search, orderBy, orderDirection } = params;

    const whereClause = PostQueryHelpers.buildSearchClause(search);
    const orderByClause = PostQueryHelpers.buildOrderByClause(orderBy, orderDirection);

    const [posts, total] = await Promise.all([
      db.query.posts.findMany({
        where: whereClause,
        orderBy: orderByClause,
        columns: {
          body: false,
        },
        extras: {
          body_snippet: sql<string>`substring(${postsModel.body} from 1 for 200)`.as(
            'body_snippet'
          ),
        },
        with: {
          user: {
            columns: { password: false, github_id: false, last_logged_at: false },
          },
          posts_to_tags: { columns: {}, with: { tag: true } },
        },
        limit: limit,
        offset: offset,
      }),
      PostQueryHelpers.getTotalCount(whereClause),
    ]);
    const response = posts.map((post: any) => ({
      id: post.id,
      title: post.title,
      body: post.body_snippet ? post.body_snippet + '...' : '',
      slug: post.slug,
      photo_url: post.photo_url,
      created_at: post.created_at,
      updated_at: post.updated_at,
      published: post.published,
      published_at: post.published_at,
      status: PostQueryHelpers.getLifecycleStatus(post),
      view_count: post.view_count ?? 0,
      like_count: post.like_count ?? 0,
      bookmark_count: post.bookmark_count ?? 0,
      user: post.user,
      tags: post.posts_to_tags.map((tag: any) => tag.tag),
    }));

    const meta = getPaginationMetadata(total, params.offset, params.limit);
    return { data: response, meta };
  }

  /**
   * Published posts from users you follow (`user_follows`) and from tags you follow
   * (`user_tag_follows` + `posts_to_tags`). Newest first by default; each post once.
   */
  async getFollowingFeed(followerId: string, params: GetPaginationParams) {
    const { offset, limit, search, orderBy, orderDirection } = params;

    const { authorIds, tagIds } = await this.getFollowGraphIds(followerId);

    if (authorIds.length === 0 && tagIds.length === 0) {
      const meta = getPaginationMetadata(0, offset, limit);
      return { data: [], meta };
    }

    const searchFilter = search
      ? or(ilike(postsModel.title, `%${search}%`), ilike(postsModel.body, `%${search}%`))
      : undefined;

    const fromFollowedAuthors =
      authorIds.length > 0 ? inArray(postsModel.created_by, authorIds) : undefined;
    const fromFollowedTags =
      tagIds.length > 0
        ? exists(
            db
              .select({ one: sql`1` })
              .from(posts_to_tags)
              .where(
                and(eq(posts_to_tags.post_id, postsModel.id), inArray(posts_to_tags.tag_id, tagIds))
              )
          )
        : undefined;

    let feedMatch;
    if (fromFollowedAuthors && fromFollowedTags) {
      feedMatch = or(fromFollowedAuthors, fromFollowedTags);
    } else {
      feedMatch = fromFollowedAuthors ?? fromFollowedTags;
    }

    const whereClause = and(
      isNull(postsModel.deleted_at),
      PostQueryHelpers.buildPublishedVisibilityClause(),
      feedMatch,
      searchFilter
    );

    const orderByClause = PostQueryHelpers.buildOrderByClause(orderBy, orderDirection);

    const [posts, total] = await Promise.all([
      db.query.posts.findMany({
        where: whereClause,
        orderBy: orderByClause,
        columns: {
          body: false,
        },
        extras: {
          body_snippet: sql<string>`substring(${postsModel.body} from 1 for 200)`.as(
            'body_snippet'
          ),
        },
        with: {
          user: {
            columns: { password: false, github_id: false, last_logged_at: false },
          },
          posts_to_tags: { columns: {}, with: { tag: true } },
        },
        limit: limit,
        offset: offset,
      }),
      PostQueryHelpers.getTotalCount(whereClause),
    ]);

    const response = posts.map((post: any) => this.mapPostRowToFeedItem(post));

    const meta = getPaginationMetadata(total, offset, limit);
    return { data: response, meta };
  }

  /**
   * All published posts, ranked by recency + engagement + light personalization
   * (followed authors / followed tags). Unlike `getFollowingFeed`, empty follow graph
   * still returns global discovery (cold start).
   */
  async getForYouFeed(followerId: string, params: GetPaginationParams) {
    const { offset, limit, search } = params;

    const { authorIds, tagIds } = await this.getFollowGraphIds(followerId);

    const searchFilter = search
      ? or(ilike(postsModel.title, `%${search}%`), ilike(postsModel.body, `%${search}%`))
      : undefined;

    const whereClause = and(
      isNull(postsModel.deleted_at),
      PostQueryHelpers.buildPublishedVisibilityClause(),
      searchFilter
    );

    const scoreSql = this.buildForYouScoreSql(authorIds, tagIds);

    const [posts, total] = await Promise.all([
      db.query.posts.findMany({
        where: whereClause,
        orderBy: [desc(scoreSql), desc(postsModel.created_at), desc(postsModel.id)],
        columns: {
          body: false,
        },
        extras: {
          body_snippet: sql<string>`substring(${postsModel.body} from 1 for 200)`.as(
            'body_snippet'
          ),
        },
        with: {
          user: {
            columns: { password: false, github_id: false, last_logged_at: false },
          },
          posts_to_tags: { columns: {}, with: { tag: true } },
        },
        limit: limit,
        offset: offset,
      }),
      PostQueryHelpers.getTotalCount(whereClause),
    ]);

    const response = posts.map((post: any) => this.mapPostRowToFeedItem(post));
    const meta = getPaginationMetadata(total, offset, limit);
    return { data: response, meta };
  }

  async getPostsByTag(tag: string, params: { offset: number; limit: number }) {
    const { offset, limit } = params;
    const whereByTag = and(
      eq(tagsModel.name, tag),
      PostQueryHelpers.buildPublishedVisibilityClause(),
      isNull(postsModel.deleted_at)
    );

    const [data, totalRow] = await Promise.all([
      db
        .select({
          id: postsModel.id,
          title: postsModel.title,
          slug: postsModel.slug,
          body: sql<string>`substring(${postsModel.body} from 1 for 200)`,
          created_at: postsModel.created_at,
          published: postsModel.published,
          published_at: postsModel.published_at,
          view_count: postsModel.view_count,
          like_count: postsModel.like_count,
          bookmark_count: postsModel.bookmark_count,
          user: {
            id: usersModel.id,
            username: usersModel.username,
            email: usersModel.email,
            first_name: usersModel.first_name,
            last_name: usersModel.last_name,
            image: usersModel.image,
          },
        })
        .from(postsModel)
        .innerJoin(posts_to_tags, eq(postsModel.id, posts_to_tags.post_id))
        .innerJoin(tagsModel, eq(posts_to_tags.tag_id, tagsModel.id))
        .leftJoin(usersModel, eq(postsModel.created_by, usersModel.id))
        .where(whereByTag)
        .orderBy(desc(postsModel.created_at))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(postsModel)
        .innerJoin(posts_to_tags, eq(postsModel.id, posts_to_tags.post_id))
        .innerJoin(tagsModel, eq(posts_to_tags.tag_id, tagsModel.id))
        .where(whereByTag),
    ]);

    const total = totalRow[0]?.count ?? 0;
    const meta = getPaginationMetadata(total, offset, limit);
    return {
      data: data.map((post) => ({
        ...post,
        status: PostQueryHelpers.getLifecycleStatus(post),
      })),
      meta,
    };
  }

  async getPostsRandom(limit = 6) {
    const data = await db
      .select({
        id: postsModel.id,
        title: postsModel.title,
        slug: postsModel.slug,
        body: sql<string>`substring(${postsModel.body} from 1 for 200)`.as('body'),
        created_at: postsModel.created_at,
        published: postsModel.published,
        published_at: postsModel.published_at,
        user: {
          id: usersModel.id,
          username: usersModel.username,
          email: usersModel.email,
          first_name: usersModel.first_name,
          last_name: usersModel.last_name,
          image: usersModel.image,
        },
      })
      .from(postsModel)
      .leftJoin(usersModel, eq(postsModel.created_by, usersModel.id))
      .where(and(isNull(postsModel.deleted_at), PostQueryHelpers.buildPublishedVisibilityClause()))
      .orderBy(sql.raw('RANDOM()'))
      .limit(limit);

    return data.map((post) => ({
      ...post,
      body: post.body ? post.body + '...' : '',
      status: PostQueryHelpers.getLifecycleStatus(post),
    }));
  }

  async getPost(id_post: string) {
    const post = await db.query.posts.findFirst({
      where: and(
        isNull(postsModel.deleted_at),
        eq(postsModel.id, id_post),
        PostQueryHelpers.buildPublishedVisibilityClause()
      ),
      with: {
        user: {
          columns: { password: false, github_id: false, last_logged_at: false },
        },
        posts_to_tags: { columns: {}, with: { tag: true } },
      },
    });

    return post ? PostQueryHelpers.transformPostWithRelations(post) : null;
  }

  /**
   * Get post by ID only for the owner (auth required). Returns draft and published.
   */
  async getPostByIdForOwner(post_id: string, user_id: string) {
    const post = await db.query.posts.findFirst({
      where: and(
        isNull(postsModel.deleted_at),
        eq(postsModel.id, post_id),
        eq(postsModel.created_by, user_id)
      ),
      with: {
        user: {
          columns: { password: false, github_id: false, last_logged_at: false },
        },
        posts_to_tags: { columns: {}, with: { tag: true } },
      },
    });

    return post ? PostQueryHelpers.transformPostWithRelations(post) : null;
  }

  async getPostBySlug(slug: string) {
    const post = await db.query.posts.findFirst({
      where: and(
        isNull(postsModel.deleted_at),
        eq(postsModel.slug, slug),
        PostQueryHelpers.buildPublishedVisibilityClause()
      ),
      with: {
        user: {
          columns: { password: false, github_id: false, last_logged_at: false },
        },
        posts_to_tags: { columns: {}, with: { tag: true } },
      },
    });

    return post ? PostQueryHelpers.transformPostWithRelations(post) : null;
  }

  async deletePost(post_id: string, auth_id: string) {
    const deletedPost = await db
      .update(postsModel)
      .set({ deleted_at: new Date().toISOString() })
      .where(and(eq(postsModel.id, post_id), eq(postsModel.created_by, auth_id)))
      .returning({ id: postsModel.id });

    if (!deletedPost[0]) {
      throw Errors.NotFound('Post');
    }
    return deletedPost;
  }

  async getPostsByUser(user_id: string, params: GetPaginationParams) {
    const { offset, limit } = params;
    const [posts, totalRows] = await Promise.all([
      db.query.posts.findMany({
        where: and(eq(postsModel.created_by, user_id), isNull(postsModel.deleted_at)),
        columns: {
          body: false,
        },
        extras: {
          body_snippet: sql<string>`substring(${postsModel.body} from 1 for 200)`.as(
            'body_snippet'
          ),
        },
        with: {
          user: {
            columns: { password: false, github_id: false, last_logged_at: false },
          },
          posts_to_tags: { columns: {}, with: { tag: true } },
        },
        limit: limit,
        offset: offset,
        orderBy: desc(postsModel.created_at),
      }),
      db
        .select({ count: count() })
        .from(postsModel)
        .where(and(eq(postsModel.created_by, user_id), isNull(postsModel.deleted_at))),
    ]);

    const data = posts.map((post) => ({
      ...post,
      body: post.body_snippet ? post.body_snippet + '...' : '',
      status: PostQueryHelpers.getLifecycleStatus(post),
    }));

    const meta = getPaginationMetadata(totalRows[0].count, params.offset, params.limit);
    return { data, meta };
  }

  async getPostsByUsername(username: string, limit = 10, offset = 0) {
    const usernamePublishedWhere = and(
      eq(usersModel.username, username),
      PostQueryHelpers.buildPublishedVisibilityClause(),
      isNull(postsModel.deleted_at)
    );

    const [posts, totalRows] = await Promise.all([
      db
        .select({
          id: postsModel.id,
          title: postsModel.title,
          slug: postsModel.slug,
          body: sql<string>`substring(${postsModel.body} from 1 for 200)`.as('body'),
          created_at: postsModel.created_at,
          published: postsModel.published,
          published_at: postsModel.published_at,
          view_count: postsModel.view_count,
          like_count: postsModel.like_count,
          bookmark_count: postsModel.bookmark_count,
          user: {
            id: usersModel.id,
            username: usersModel.username,
            email: usersModel.email,
            first_name: usersModel.first_name,
            last_name: usersModel.last_name,
            image: usersModel.image,
          },
        })
        .from(postsModel)
        .innerJoin(usersModel, eq(postsModel.created_by, usersModel.id))
        .where(usernamePublishedWhere)
        .orderBy(desc(postsModel.created_at))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(postsModel)
        .innerJoin(usersModel, eq(postsModel.created_by, usersModel.id))
        .where(usernamePublishedWhere),
    ]);

    const meta = getPaginationMetadata(totalRows[0].count, offset, limit);
    return {
      data: posts.map((post) => ({
        ...post,
        status: PostQueryHelpers.getLifecycleStatus(post),
      })),
      meta,
    };
  }

  async getLikedPostsByUser(user_id: string, params: GetPaginationParams) {
    const { offset, limit } = params;

    const likedPostIds = await db
      .select({ post_id: postLikesModel.post_id })
      .from(postLikesModel)
      .where(eq(postLikesModel.user_id, user_id));

    const postIds = likedPostIds.map((lp) => lp.post_id);

    if (postIds.length === 0) {
      const meta = getPaginationMetadata(0, offset, limit);
      return { data: [], meta };
    }

    const whereClause = and(
      inArray(postsModel.id, postIds),
      isNull(postsModel.deleted_at),
      PostQueryHelpers.buildPublishedVisibilityClause()
    );

    const [posts, total] = await Promise.all([
      db.query.posts.findMany({
        where: whereClause,
        columns: {
          body: false,
        },
        extras: {
          body_snippet: sql<string>`substring(${postsModel.body} from 1 for 200)`.as(
            'body_snippet'
          ),
        },
        with: {
          user: {
            columns: { password: false, github_id: false, last_logged_at: false },
          },
          posts_to_tags: { columns: {}, with: { tag: true } },
        },
        orderBy: desc(postsModel.created_at),
        limit: limit,
        offset: offset,
      }),
      PostQueryHelpers.getTotalCount(whereClause),
    ]);

    const data = posts.map((post: any) => ({
      ...post,
      body: post.body_snippet ? post.body_snippet + '...' : '',
      status: PostQueryHelpers.getLifecycleStatus(post),
      tags: post.posts_to_tags.map((tag: any) => tag.tag),
    }));

    const meta = getPaginationMetadata(total, params.offset, params.limit);
    return { data, meta };
  }

  /**
   * Get posts created over time (grouped by date)
   * @param days Number of days to look back (default: 30)
   * @param groupBy Group by 'day', 'week', or 'month' (default: 'day')
   */
  async getPostsOverTime(days = 30, groupBy: 'day' | 'week' | 'month' = 'day') {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let dateFormat: string;
    switch (groupBy) {
      case 'week':
        dateFormat = 'YYYY-IW'; // ISO week
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }

    const result = await db
      .select({
        date: sql<string>`TO_CHAR(${postsModel.created_at}, ${dateFormat})`,
        count: count(),
      })
      .from(postsModel)
      .where(
        and(gte(postsModel.created_at, startDate.toISOString()), isNull(postsModel.deleted_at))
      )
      .groupBy(sql`TO_CHAR(${postsModel.created_at}, ${dateFormat})`)
      .orderBy(sql`TO_CHAR(${postsModel.created_at}, ${dateFormat})`);

    return result;
  }

  /**
   * Like counts per calendar month on the current user's posts (from post_likes timestamps).
   * @param userId Post author id
   * @param months How many past months to include (from the 1st of month N months ago)
   */
  async getMyLikesByMonth(userId: string, months = 12) {
    const startDate = new Date();
    startDate.setUTCDate(1);
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCMonth(startDate.getUTCMonth() - months);

    const result = await db
      .select({
        month: sql<string>`TO_CHAR(${postLikesModel.created_at}, 'YYYY-MM')`,
        count: count(),
      })
      .from(postLikesModel)
      .innerJoin(postsModel, eq(postLikesModel.post_id, postsModel.id))
      .where(
        and(
          eq(postsModel.created_by, userId),
          isNull(postsModel.deleted_at),
          gte(postLikesModel.created_at, startDate.toISOString())
        )
      )
      .groupBy(sql`TO_CHAR(${postLikesModel.created_at}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${postLikesModel.created_at}, 'YYYY-MM')`);

    return result;
  }

  /**
   * Get distribution of posts by tags
   * @param limit Number of top tags to return (default: 10)
   */
  async getPostsByTagDistribution(limit = 10) {
    const result = await db
      .select({
        tag_name: tagsModel.name,
        tag_id: tagsModel.id,
        post_count: count(posts_to_tags.post_id),
      })
      .from(tagsModel)
      .leftJoin(posts_to_tags, eq(tagsModel.id, posts_to_tags.tag_id))
      .leftJoin(
        postsModel,
        and(eq(posts_to_tags.post_id, postsModel.id), isNull(postsModel.deleted_at))
      )
      .groupBy(tagsModel.id, tagsModel.name)
      .orderBy(desc(count(posts_to_tags.post_id)))
      .limit(limit);

    return result;
  }

  private async getTopPostsBy(orderByField: 'view_count' | 'like_count', limit = 10) {
    const column = orderByField === 'view_count' ? postsModel.view_count : postsModel.like_count;
    const posts = await db.query.posts.findMany({
      where: and(isNull(postsModel.deleted_at), PostQueryHelpers.buildPublishedVisibilityClause()),
      columns: {
        id: true,
        title: true,
        slug: true,
        view_count: true,
        like_count: true,
        bookmark_count: true,
        created_at: true,
      },
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: desc(column),
      limit,
    });

    return posts.map((post) => ({ ...post, user: post.user }));
  }

  /**
   * Get top posts by views
   * @param limit Number of posts to return (default: 10)
   */
  async getTopPostsByViews(limit = 10) {
    return this.getTopPostsBy('view_count', limit);
  }

  /**
   * Get top posts by likes
   * @param limit Number of posts to return (default: 10)
   */
  async getTopPostsByLikes(limit = 10) {
    return this.getTopPostsBy('like_count', limit);
  }

  /**
   * Get user activity (posts per user)
   * @param limit Number of users to return (default: 10)
   */
  async getUserActivity(limit = 10) {
    const result = await db
      .select({
        user_id: usersModel.id,
        username: usersModel.username,
        first_name: usersModel.first_name,
        last_name: usersModel.last_name,
        post_count: count(postsModel.id),
        total_views: sql<number>`COALESCE(SUM(${postsModel.view_count}), 0)`,
        total_likes: sql<number>`COALESCE(SUM(${postsModel.like_count}), 0)`,
      })
      .from(usersModel)
      .leftJoin(
        postsModel,
        and(eq(usersModel.id, postsModel.created_by), isNull(postsModel.deleted_at))
      )
      .groupBy(usersModel.id, usersModel.username, usersModel.first_name, usersModel.last_name)
      .orderBy(desc(count(postsModel.id)))
      .limit(limit);

    return result;
  }

  /**
   * Get engagement metrics overview
   */
  async getEngagementMetrics() {
    const result = await db
      .select({
        total_posts: count(postsModel.id),
        total_views: sql<number>`COALESCE(SUM(${postsModel.view_count}), 0)`,
        total_likes: sql<number>`COALESCE(SUM(${postsModel.like_count}), 0)`,
        avg_views_per_post: sql<number>`COALESCE(AVG(${postsModel.view_count}), 0)`,
        avg_likes_per_post: sql<number>`COALESCE(AVG(${postsModel.like_count}), 0)`,
        published_posts: sql<number>`COUNT(CASE WHEN ${postsModel.published} = true THEN 1 END)`,
        draft_posts: sql<number>`COUNT(CASE WHEN ${postsModel.published} = false THEN 1 END)`,
      })
      .from(postsModel)
      .where(isNull(postsModel.deleted_at));

    return result[0];
  }

  /**
   * Get posts engagement comparison (views vs likes)
   * @param limit Number of posts to return (default: 20)
   */
  async getEngagementComparison(limit = 20) {
    const posts = await db
      .select({
        id: postsModel.id,
        title: postsModel.title,
        slug: postsModel.slug,
        view_count: postsModel.view_count,
        like_count: postsModel.like_count,
        engagement_rate: sql<number>`CASE
          WHEN ${postsModel.view_count} > 0
          THEN (${postsModel.like_count}::float / ${postsModel.view_count}::float * 100)
          ELSE 0
        END`,
        created_at: postsModel.created_at,
      })
      .from(postsModel)
      .where(and(isNull(postsModel.deleted_at), PostQueryHelpers.buildPublishedVisibilityClause()))
      .orderBy(desc(postsModel.view_count))
      .limit(limit);

    return posts;
  }

  /**
   * Get minimal post data for sitemap (slug + author username + timestamps)
   */
  async getPostsForSitemap() {
    const posts = await db
      .select({
        slug: postsModel.slug,
        username: usersModel.username,
        created_at: postsModel.created_at,
        updated_at: postsModel.updated_at,
      })
      .from(postsModel)
      .innerJoin(usersModel, eq(postsModel.created_by, usersModel.id))
      .where(
        and(
          isNull(postsModel.deleted_at),
          PostQueryHelpers.buildPublishedVisibilityClause(),
          isNull(usersModel.deleted_at)
        )
      )
      .orderBy(desc(postsModel.created_at))
      .limit(5000);

    return posts;
  }
}
