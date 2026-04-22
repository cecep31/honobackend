import { and, count, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import {
  users as usersModel,
  posts as postsModel,
  post_likes as postLikesModel,
  posts_to_tags,
  tags as tagsModel,
} from '../../../database/schemas/postgres/schema';
import { PostQueryHelpers } from './postQueryHelpers';

export class PostAnalyticsService {
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
