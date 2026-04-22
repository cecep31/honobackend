import { and, desc, eq, exists, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import {
  users as usersModel,
  posts as postsModel,
  posts_to_tags,
  user_follows,
  user_tag_follows,
} from '../../../database/schemas/postgres/schema';
import { PostQueryHelpers } from './postQueryHelpers';
import type { GetPaginationParams } from '../../../types/paginate';
import { getPaginationMetadata } from '../../../utils/paginate';

export class PostFeedService {
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
}
