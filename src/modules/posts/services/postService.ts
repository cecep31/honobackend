import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import {
  users as usersModel,
  posts as postsModel,
  post_likes as postLikesModel,
  posts_to_tags,
  tags as tagsModel,
} from '../../../database/schemas/postgres/schema';
import { PostQueryHelpers } from './postQueryHelpers';
import { PostTagManager } from './postTagManager';
import { PostFeedService } from './postFeedService';
import { PostAnalyticsService } from './postAnalyticsService';
import type { PostCreateBody, PostUpdateBody } from '../validation';
import type { GetPaginationParams } from '../../../types/paginate';
import { getPaginationMetadata } from '../../../utils/paginate';
import { Errors } from '../../../utils/error';

export class PostService {
  private feedService = new PostFeedService();
  private analyticsService = new PostAnalyticsService();

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

  // ===== Feed delegation =====
  async getTrendingPosts(limit = 5) {
    return this.feedService.getTrendingPosts(limit);
  }

  async getPostsRandom(limit = 6) {
    return this.feedService.getPostsRandom(limit);
  }

  async getFollowingFeed(followerId: string, params: GetPaginationParams) {
    return this.feedService.getFollowingFeed(followerId, params);
  }

  async getForYouFeed(followerId: string, params: GetPaginationParams) {
    return this.feedService.getForYouFeed(followerId, params);
  }

  // ===== Analytics delegation =====
  async getPostsOverTime(days = 30, groupBy: 'day' | 'week' | 'month' = 'day') {
    return this.analyticsService.getPostsOverTime(days, groupBy);
  }

  async getMyLikesByMonth(userId: string, months = 12) {
    return this.analyticsService.getMyLikesByMonth(userId, months);
  }

  async getPostsByTagDistribution(limit = 10) {
    return this.analyticsService.getPostsByTagDistribution(limit);
  }

  async getTopPostsByViews(limit = 10) {
    return this.analyticsService.getTopPostsByViews(limit);
  }

  async getTopPostsByLikes(limit = 10) {
    return this.analyticsService.getTopPostsByLikes(limit);
  }

  async getUserActivity(limit = 10) {
    return this.analyticsService.getUserActivity(limit);
  }

  async getEngagementMetrics() {
    return this.analyticsService.getEngagementMetrics();
  }

  async getEngagementComparison(limit = 20) {
    return this.analyticsService.getEngagementComparison(limit);
  }

  async getPostsForSitemap() {
    return this.analyticsService.getPostsForSitemap();
  }

  // ===== Core CRUD =====
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
}
