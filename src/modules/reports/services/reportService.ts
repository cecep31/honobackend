import { db } from '../../../database/drizzle';
import {
  users,
  posts,
  post_likes,
  post_comments,
  post_views,
  tags,
  posts_to_tags,
} from '../../../database/schemas/postgres/schema';
import { sql, eq, gte, lte, and, count, desc, inArray, isNull } from 'drizzle-orm';

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export interface OverviewStats {
  totalUsers: number;
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  newUsersToday: number;
  newPostsToday: number;
  activeUsersThisWeek: number;
}

export interface UserGrowthData {
  date: string;
  newUsers: number;
  cumulativeUsers: number;
}

export interface UserReport {
  totalUsers: number;
  newUsersThisPeriod: number;
  activeUsers: number;
  topContributors: Array<{
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    postCount: number;
    totalViews: number;
    totalLikes: number;
  }>;
  growthTrend: UserGrowthData[];
}

export interface PostPerformanceData {
  id: string;
  title: string;
  slug: string;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
  author: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  createdAt: string;
}

export interface TagPerformance {
  id: number;
  name: string;
  postCount: number;
  totalViews: number;
  totalLikes: number;
}

export interface PostReport {
  totalPosts: number;
  newPostsThisPeriod: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgEngagementRate: number;
  topPosts: PostPerformanceData[];
  tagPerformance: TagPerformance[];
}

export interface EngagementMetrics {
  totalEngagements: number;
  avgLikesPerPost: number;
  avgCommentsPerPost: number;
  avgViewsPerPost: number;
  periodComparison: {
    current: number;
    previous: number;
    changePercent: number;
  };
}

export class ReportService {
  private buildDateFilter(dateRange: DateRange): ReturnType<typeof and> | undefined {
    const conditions = [];

    if (dateRange.startDate) {
      conditions.push(gte(sql`DATE(created_at)`, dateRange.startDate));
    }
    if (dateRange.endDate) {
      conditions.push(lte(sql`DATE(created_at)`, dateRange.endDate));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  async getOverviewStats(): Promise<OverviewStats> {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [
      totalUsersResult,
      totalPostsResult,
      totalViewsResult,
      totalLikesResult,
      totalCommentsResult,
      newUsersTodayResult,
      newPostsTodayResult,
      activeUsersResult,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(users)
        .where(sql`deleted_at IS NULL`),
      db
        .select({ count: count() })
        .from(posts)
        .where(sql`deleted_at IS NULL AND published = true`),
      db
        .select({ count: count() })
        .from(post_views)
        .where(sql`deleted_at IS NULL`),
      db.select({ count: count() }).from(post_likes),
      db
        .select({ count: count() })
        .from(post_comments)
        .where(sql`deleted_at IS NULL`),
      db
        .select({ count: count() })
        .from(users)
        .where(and(sql`deleted_at IS NULL`, gte(sql`DATE(created_at)`, today))),
      db
        .select({ count: count() })
        .from(posts)
        .where(
          and(sql`deleted_at IS NULL AND published = true`, gte(sql`DATE(created_at)`, today))
        ),
      db
        .select({ count: sql`COUNT(DISTINCT user_id)` })
        .from(post_views)
        .where(and(sql`deleted_at IS NULL`, gte(sql`DATE(created_at)`, weekAgo))),
    ]);

    return {
      totalUsers: Number(totalUsersResult[0]?.count || 0),
      totalPosts: Number(totalPostsResult[0]?.count || 0),
      totalViews: Number(totalViewsResult[0]?.count || 0),
      totalLikes: Number(totalLikesResult[0]?.count || 0),
      totalComments: Number(totalCommentsResult[0]?.count || 0),
      newUsersToday: Number(newUsersTodayResult[0]?.count || 0),
      newPostsToday: Number(newPostsTodayResult[0]?.count || 0),
      activeUsersThisWeek: Number(activeUsersResult[0]?.count || 0),
    };
  }

  async getUserReport(dateRange: DateRange, limit: number = 10): Promise<UserReport> {
    const dateFilter = this.buildDateFilter(dateRange);

    const [totalUsersResult, newUsersResult] = await Promise.all([
      db
        .select({ count: count() })
        .from(users)
        .where(sql`deleted_at IS NULL`),
      dateFilter
        ? db
            .select({ count: count() })
            .from(users)
            .where(and(sql`deleted_at IS NULL`, dateFilter))
        : db
            .select({ count: count() })
            .from(users)
            .where(sql`deleted_at IS NULL`),
    ]);

    const topContributors = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.first_name,
        lastName: users.last_name,
        postCount: count(posts.id),
        totalViews: sql`COALESCE(SUM(${posts.view_count}), 0)`.as('totalViews'),
        totalLikes: sql`COALESCE(SUM(${posts.like_count}), 0)`.as('totalLikes'),
      })
      .from(users)
      .leftJoin(posts, eq(users.id, posts.created_by))
      .where(sql`${users.deleted_at} IS NULL AND ${posts.deleted_at} IS NULL`)
      .groupBy(users.id, users.username, users.first_name, users.last_name)
      .orderBy(desc(sql`count(${posts.id})`))
      .limit(limit);

    const growthTrend = await this.getUserGrowthTrend(dateRange);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const activeUsersResult = await db
      .select({ count: sql`COUNT(DISTINCT ${post_views.user_id})` })
      .from(post_views)
      .where(
        and(sql`${post_views.user_id} IS NOT NULL`, gte(post_views.created_at, thirtyDaysAgo))
      );

    return {
      totalUsers: Number(totalUsersResult[0]?.count || 0),
      newUsersThisPeriod: Number(newUsersResult[0]?.count || 0),
      activeUsers: Number(activeUsersResult[0]?.count || 0),
      topContributors: topContributors.map((u) => ({
        id: u.id,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        postCount: Number(u.postCount),
        totalViews: Number(u.totalViews),
        totalLikes: Number(u.totalLikes),
      })),
      growthTrend,
    };
  }

  private async getUserGrowthTrend(dateRange: DateRange): Promise<UserGrowthData[]> {
    const startDate = dateRange.startDate
      ? new Date(dateRange.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange.endDate ? new Date(dateRange.endDate) : new Date();

    const dailyData = await db.execute(sql`
      WITH date_series AS (
        SELECT generate_series(
          DATE(${startDate.toISOString()}),
          DATE(${endDate.toISOString()}),
          '1 day'::interval
        )::date as date
      )
      SELECT
        ds.date as date,
        COALESCE(COUNT(u.id), 0) as new_users,
        (SELECT COUNT(*) FROM ${users} WHERE DATE(created_at) <= ds.date AND deleted_at IS NULL) as cumulative_users
      FROM date_series ds
      LEFT JOIN ${users} u ON DATE(u.created_at) = ds.date AND u.deleted_at IS NULL
      GROUP BY ds.date
      ORDER BY ds.date
    `);

    return (dailyData as any[]).map((row: any) => ({
      date: row.date.toISOString().split('T')[0],
      newUsers: Number(row.new_users),
      cumulativeUsers: Number(row.cumulative_users),
    }));
  }

  async getPostReport(
    dateRange: DateRange,
    limit: number = 10,
    tagId?: number
  ): Promise<PostReport> {
    const dateFilter = this.buildDateFilter(dateRange);

    const basePostCondition = sql`${posts.deleted_at} IS NULL AND ${posts.published} = true`;
    const postConditions = dateFilter ? and(basePostCondition, dateFilter) : basePostCondition;

    const [
      totalPostsResult,
      newPostsResult,
      totalViewsResult,
      totalLikesResult,
      totalCommentsResult,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(posts)
        .where(sql`${posts.deleted_at} IS NULL AND ${posts.published} = true`),
      db.select({ count: count() }).from(posts).where(postConditions),
      db
        .select({ total: sql`COALESCE(SUM(${posts.view_count}), 0)` })
        .from(posts)
        .where(sql`${posts.deleted_at} IS NULL AND ${posts.published} = true`),
      db
        .select({ total: sql`COALESCE(SUM(${posts.like_count}), 0)` })
        .from(posts)
        .where(sql`${posts.deleted_at} IS NULL AND ${posts.published} = true`),
      db
        .select({ count: count() })
        .from(post_comments)
        .where(sql`${post_comments.deleted_at} IS NULL`),
    ]);

    const totalPosts = Number(totalPostsResult[0]?.count || 0);
    const totalViews = Number(totalViewsResult[0]?.total || 0);
    const totalLikes = Number(totalLikesResult[0]?.total || 0);
    const totalComments = Number(totalCommentsResult[0]?.count || 0);

    let topPostsQuery = db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        views: posts.view_count,
        likes: posts.like_count,
        createdAt: posts.created_at,
        authorId: users.id,
        authorUsername: users.username,
        authorFirstName: users.first_name,
        authorLastName: users.last_name,
      })
      .from(posts)
      .innerJoin(users, eq(posts.created_by, users.id))
      .where(sql`${posts.deleted_at} IS NULL AND ${posts.published} = true`)
      .orderBy(desc(posts.view_count))
      .limit(limit);

    if (tagId) {
      topPostsQuery = db
        .select({
          id: posts.id,
          title: posts.title,
          slug: posts.slug,
          views: posts.view_count,
          likes: posts.like_count,
          createdAt: posts.created_at,
          authorId: users.id,
          authorUsername: users.username,
          authorFirstName: users.first_name,
          authorLastName: users.last_name,
        })
        .from(posts)
        .innerJoin(users, eq(posts.created_by, users.id))
        .innerJoin(posts_to_tags, eq(posts.id, posts_to_tags.post_id))
        .where(and(sql`${posts.deleted_at} IS NULL`, eq(posts_to_tags.tag_id, tagId)))
        .orderBy(desc(posts.view_count))
        .limit(limit);
    }

    const topPostsData = await topPostsQuery;
    const topPostIds = topPostsData.map((p) => p.id);

    // Pre-fetch comment counts in a single query to avoid N+1
    const commentCounts = topPostIds.length
      ? await db
          .select({ post_id: post_comments.post_id, count: count() })
          .from(post_comments)
          .where(
            and(inArray(post_comments.post_id, topPostIds), isNull(post_comments.deleted_at))
          )
          .groupBy(post_comments.post_id)
      : [];

    const commentCountMap = new Map(commentCounts.map((c) => [c.post_id, Number(c.count)]));

    const topPosts: PostPerformanceData[] = topPostsData.map((post) => {
      const comments = commentCountMap.get(post.id) || 0;
      const engagementRate =
        Number(post.views) > 0 ? ((Number(post.likes) + comments) / Number(post.views)) * 100 : 0;

      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        views: Number(post.views),
        likes: Number(post.likes),
        comments,
        engagementRate: Math.round(engagementRate * 100) / 100,
        author: {
          id: post.authorId,
          username: post.authorUsername,
          firstName: post.authorFirstName,
          lastName: post.authorLastName,
        },
        createdAt: post.createdAt ?? new Date().toISOString(),
      };
    });

    const tagPerformance = await db
      .select({
        id: tags.id,
        name: tags.name,
        postCount: count(posts_to_tags.post_id),
        totalViews: sql`COALESCE(SUM(${posts.view_count}), 0)`.as('totalViews'),
        totalLikes: sql`COALESCE(SUM(${posts.like_count}), 0)`.as('totalLikes'),
      })
      .from(tags)
      .innerJoin(posts_to_tags, eq(tags.id, posts_to_tags.tag_id))
      .innerJoin(posts, eq(posts_to_tags.post_id, posts.id))
      .where(sql`${posts.deleted_at} IS NULL AND ${posts.published} = true`)
      .groupBy(tags.id, tags.name)
      .orderBy(desc(count(posts_to_tags.post_id)))
      .limit(10);

    const avgEngagementRate =
      totalPosts > 0
        ? Math.round(((totalLikes + totalComments) / (totalViews || 1)) * 100 * 100) / 100
        : 0;

    return {
      totalPosts,
      newPostsThisPeriod: Number(newPostsResult[0]?.count || 0),
      totalViews,
      totalLikes,
      totalComments,
      avgEngagementRate,
      topPosts,
      tagPerformance: tagPerformance.map((t) => ({
        id: t.id,
        name: t.name,
        postCount: Number(t.postCount),
        totalViews: Number(t.totalViews),
        totalLikes: Number(t.totalLikes),
      })),
    };
  }

  async getEngagementMetrics(dateRange: DateRange): Promise<EngagementMetrics> {
    const dateFilter = this.buildDateFilter(dateRange);

    const currentPeriodLikes = dateFilter
      ? await db
          .select({ count: count() })
          .from(post_likes)
          .where(
            and(
              gte(
                post_likes.created_at,
                dateRange.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
              )
            )
          )
      : await db.select({ count: count() }).from(post_likes);

    const currentPeriodComments = dateFilter
      ? await db
          .select({ count: count() })
          .from(post_comments)
          .where(
            and(
              sql`${post_comments.deleted_at} IS NULL`,
              gte(
                post_comments.created_at,
                dateRange.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
              )
            )
          )
      : await db
          .select({ count: count() })
          .from(post_comments)
          .where(sql`${post_comments.deleted_at} IS NULL`);

    const totalPostsResult = await db
      .select({ count: count() })
      .from(posts)
      .where(sql`${posts.deleted_at} IS NULL AND ${posts.published} = true`);

    const totalPosts = Number(totalPostsResult[0]?.count || 1);

    const currentLikes = Number(currentPeriodLikes[0]?.count || 0);
    const currentComments = Number(currentPeriodComments[0]?.count || 0);

    const prevPeriodStart = dateRange.startDate
      ? new Date(
          new Date(dateRange.startDate).getTime() -
            (new Date(dateRange.endDate || new Date()).getTime() -
              new Date(dateRange.startDate).getTime())
        ).toISOString()
      : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const prevPeriodEnd =
      dateRange.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const prevLikesResult = await db
      .select({ count: count() })
      .from(post_likes)
      .where(
        and(gte(post_likes.created_at, prevPeriodStart), lte(post_likes.created_at, prevPeriodEnd))
      );

    const prevLikes = Number(prevLikesResult[0]?.count || 0);

    const changePercent =
      prevLikes > 0 ? Math.round(((currentLikes - prevLikes) / prevLikes) * 100 * 100) / 100 : 0;

    return {
      totalEngagements: currentLikes + currentComments,
      avgLikesPerPost: Math.round((currentLikes / totalPosts) * 100) / 100,
      avgCommentsPerPost: Math.round((currentComments / totalPosts) * 100) / 100,
      avgViewsPerPost: 0,
      periodComparison: {
        current: currentLikes,
        previous: prevLikes,
        changePercent,
      },
    };
  }
}


