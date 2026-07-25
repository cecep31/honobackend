import { and, count, countDistinct, desc, eq, gte, isNull, lt, lte, sql } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import {
  post_views as postViewsModel,
  posts as postsModel,
} from '../../../database/schemas/postgres/schema';
import { Errors } from '../../../utils/error';
import { getPaginationMetadata } from '../../../utils/paginate';

export interface PostViewStats {
  post_id: string;
  total_views: number;
  unique_views: number;
  anonymous_views: number;
  authenticated_views: number;
}

export interface MyPostsAnalyticsSummary {
  total_posts: number;
  published_posts: number;
  total_views: number;
  total_likes: number;
}

export interface MyPostsViewTrendPoint {
  date: string;
  views: number;
  cumulative_views: number;
}

export interface MyPostPerformance {
  id: string;
  title: string | null;
  slug: string | null;
  view_count: number;
  like_count: number;
}

export interface MyPostsAnalyticsResponse {
  summary: MyPostsAnalyticsSummary;
  view_trend: MyPostsViewTrendPoint[];
  top_posts: MyPostPerformance[];
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Tracks per-row post views (user, IP, user agent) and exposes view
 * statistics — mirrors echobackend's PostViewService.
 *
 * Unlike echobackend (which relies on a DB trigger), `view_count` on posts
 * is incremented here in app code whenever a new view row is recorded.
 */
export class PostViewService {
  /**
   * Record a view for a post. Authenticated users are deduplicated:
   * a user who already viewed the post does not create another row.
   * @returns `recorded` — whether a new view row was created
   */
  async recordView(
    postId: string,
    userId: string | null,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ recorded: boolean }> {
    const post = await db.query.posts.findFirst({
      columns: { id: true },
      where: and(eq(postsModel.id, postId), isNull(postsModel.deleted_at)),
    });
    if (!post) {
      throw Errors.NotFound('Post');
    }

    if (userId) {
      const hasViewed = await this.hasUserViewed(postId, userId);
      if (hasViewed) {
        return { recorded: false };
      }
    }

    await db.insert(postViewsModel).values({
      post_id: postId,
      user_id: userId || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    });

    await db
      .update(postsModel)
      .set({ view_count: sql`${postsModel.view_count} + 1` })
      .where(eq(postsModel.id, postId));

    return { recorded: true };
  }

  /** Paginated list of view rows for a post (newest first). */
  async getViewsByPostId(postId: string, limit = 10, offset = 0) {
    const where = and(eq(postViewsModel.post_id, postId), isNull(postViewsModel.deleted_at));

    const [views, totalRows] = await Promise.all([
      db
        .select({
          id: postViewsModel.id,
          post_id: postViewsModel.post_id,
          user_id: postViewsModel.user_id,
          ip_address: postViewsModel.ip_address,
          user_agent: postViewsModel.user_agent,
          created_at: postViewsModel.created_at,
          updated_at: postViewsModel.updated_at,
        })
        .from(postViewsModel)
        .where(where)
        .orderBy(desc(postViewsModel.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(postViewsModel).where(where),
    ]);

    return { data: views, meta: getPaginationMetadata(totalRows[0].count, offset, limit) };
  }

  /** Aggregated view statistics for a post. */
  async getViewStats(postId: string): Promise<PostViewStats> {
    const where = and(eq(postViewsModel.post_id, postId), isNull(postViewsModel.deleted_at));

    const [totals] = await db
      .select({
        total_views: count(),
        unique_views: countDistinct(postViewsModel.user_id),
        anonymous_views: sql<number>`COUNT(*) FILTER (WHERE ${postViewsModel.user_id} IS NULL)`,
        authenticated_views: sql<number>`COUNT(*) FILTER (WHERE ${postViewsModel.user_id} IS NOT NULL)`,
      })
      .from(postViewsModel)
      .where(where);

    return {
      post_id: postId,
      total_views: totals?.total_views ?? 0,
      unique_views: totals?.unique_views ?? 0,
      anonymous_views: Number(totals?.anonymous_views ?? 0),
      authenticated_views: Number(totals?.authenticated_views ?? 0),
    };
  }

  /** Check whether a user has already viewed a post. */
  async hasUserViewed(postId: string, userId: string): Promise<boolean> {
    const rows = await db
      .select({ count: count() })
      .from(postViewsModel)
      .where(
        and(
          eq(postViewsModel.post_id, postId),
          eq(postViewsModel.user_id, userId),
          isNull(postViewsModel.deleted_at)
        )
      );
    return (rows[0]?.count ?? 0) > 0;
  }

  /**
   * Author analytics: summary stats, daily view trend (with cumulative
   * views), and top posts — mirrors echobackend's
   * `GET /api/posts/me/analytics` (default range: last 30 days).
   * @param startDate Optional YYYY-MM-DD range start
   * @param endDate Optional YYYY-MM-DD range end
   */
  async getMyPostsAnalytics(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<MyPostsAnalyticsResponse> {
    let start = new Date();
    start.setDate(start.getDate() - 30);
    let end = new Date();

    if (startDate && DATE_KEY_RE.test(startDate)) {
      const parsed = new Date(`${startDate}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) start = parsed;
    }
    if (endDate && DATE_KEY_RE.test(endDate)) {
      const parsed = new Date(`${endDate}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) end = parsed;
    }
    if (start > end) {
      [start, end] = [end, start];
    }

    const startKey = formatDateKey(start);
    const endKey = formatDateKey(end);

    const [summaryRow] = await db
      .select({
        total_posts: count(),
        published_posts: sql<number>`COUNT(*) FILTER (WHERE ${postsModel.published} = true)`,
        total_views: sql<number>`COALESCE(SUM(${postsModel.view_count}), 0)`,
        total_likes: sql<number>`COALESCE(SUM(${postsModel.like_count}), 0)`,
      })
      .from(postsModel)
      .where(and(eq(postsModel.created_by, userId), isNull(postsModel.deleted_at)));

    const topPosts = await db
      .select({
        id: postsModel.id,
        title: postsModel.title,
        slug: postsModel.slug,
        view_count: postsModel.view_count,
        like_count: postsModel.like_count,
      })
      .from(postsModel)
      .where(and(eq(postsModel.created_by, userId), isNull(postsModel.deleted_at)))
      .orderBy(desc(postsModel.view_count))
      .limit(5);

    const trendRows = await db
      .select({
        date: sql<string>`TO_CHAR(${postViewsModel.created_at}, 'YYYY-MM-DD')`,
        count: count(),
      })
      .from(postViewsModel)
      .innerJoin(
        postsModel,
        and(eq(postViewsModel.post_id, postsModel.id), isNull(postsModel.deleted_at))
      )
      .where(
        and(
          eq(postsModel.created_by, userId),
          isNull(postViewsModel.deleted_at),
          gte(sql`${postViewsModel.created_at}::date`, sql`${startKey}::date`),
          lte(sql`${postViewsModel.created_at}::date`, sql`${endKey}::date`)
        )
      )
      .groupBy(sql`TO_CHAR(${postViewsModel.created_at}, 'YYYY-MM-DD')`);

    const [viewsBefore] = await db
      .select({ count: count() })
      .from(postViewsModel)
      .innerJoin(
        postsModel,
        and(eq(postViewsModel.post_id, postsModel.id), isNull(postsModel.deleted_at))
      )
      .where(
        and(
          eq(postsModel.created_by, userId),
          isNull(postViewsModel.deleted_at),
          lt(sql`${postViewsModel.created_at}::date`, sql`${startKey}::date`)
        )
      );

    const viewsByDate = new Map<string, number>();
    for (const row of trendRows) {
      viewsByDate.set(row.date, row.count);
    }

    const viewTrend: MyPostsViewTrendPoint[] = [];
    let cumulative = viewsBefore?.count ?? 0;
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = formatDateKey(d);
      const views = viewsByDate.get(dateKey) ?? 0;
      cumulative += views;
      viewTrend.push({ date: dateKey, views, cumulative_views: cumulative });
    }

    return {
      summary: {
        total_posts: summaryRow?.total_posts ?? 0,
        published_posts: Number(summaryRow?.published_posts ?? 0),
        total_views: Number(summaryRow?.total_views ?? 0),
        total_likes: Number(summaryRow?.total_likes ?? 0),
      },
      view_trend: viewTrend,
      top_posts: topPosts.map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        view_count: post.view_count ?? 0,
        like_count: post.like_count ?? 0,
      })),
    };
  }
}
