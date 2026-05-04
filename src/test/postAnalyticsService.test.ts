import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { PostAnalyticsService } from '../modules/posts/services/postAnalyticsService';
import { createDrizzleMocks } from './helpers/drizzleMock';

const mocks = createDrizzleMocks();
const mockFindMany = mock();

mock.module('../database/drizzle', () => ({
  db: {
    select: mocks.mockSelect,
    query: {
      posts: {
        findMany: mockFindMany,
      },
    },
  },
}));

mock.module('../modules/posts/services/postQueryHelpers', () => ({
  PostQueryHelpers: {
    buildPublishedVisibilityClause: () => ({}),
  },
}));

describe('PostAnalyticsService', () => {
  let service: PostAnalyticsService;

  beforeEach(() => {
    service = new PostAnalyticsService();
    mocks.reset();
    mockFindMany.mockReset();
  });

  describe('getPostsOverTime', () => {
    it('returns grouped posts by day', async () => {
      mocks.mockFrom.mockReturnValue({
        where: mock(() => ({
          groupBy: mock(() => ({
            orderBy: mock(() => Promise.resolve([
              { date: '2024-01-01', count: 5 },
              { date: '2024-01-02', count: 3 },
            ])),
          })),
        })),
      });

      const result = await service.getPostsOverTime(30, 'day');

      expect(result).toHaveLength(2);
      expect(result[0].count).toBe(5);
    });

    it('groups by week', async () => {
      mocks.mockFrom.mockReturnValue({
        where: mock(() => ({
          groupBy: mock(() => ({
            orderBy: mock(() => Promise.resolve([
              { date: '2024-01', count: 10 },
            ])),
          })),
        })),
      });

      const result = await service.getPostsOverTime(90, 'week');

      expect(result).toHaveLength(1);
    });

    it('groups by month', async () => {
      mocks.mockFrom.mockReturnValue({
        where: mock(() => ({
          groupBy: mock(() => ({
            orderBy: mock(() => Promise.resolve([
              { date: '2024-01', count: 15 },
            ])),
          })),
        })),
      });

      const result = await service.getPostsOverTime(365, 'month');

      expect(result).toHaveLength(1);
    });
  });

  describe('getMyLikesByMonth', () => {
    it('returns likes grouped by month', async () => {
      mocks.mockFrom.mockReturnValue({
        innerJoin: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => ({
              orderBy: mock(() => Promise.resolve([
                { month: '2024-01', count: 10 },
                { month: '2024-02', count: 20 },
              ])),
            })),
          })),
        })),
      });

      const result = await service.getMyLikesByMonth('user-1', 12);

      expect(result).toHaveLength(2);
      expect(result[0].count).toBe(10);
    });
  });

  describe('getPostsByTagDistribution', () => {
    it('returns tag distribution', async () => {
      mocks.mockFrom.mockReturnValue({
        leftJoin: mock(() => ({
          leftJoin: mock(() => ({
            groupBy: mock(() => ({
              orderBy: mock(() => ({
                limit: mock(() => Promise.resolve([
                  { tag_name: 'javascript', tag_id: 't1', post_count: 15 },
                  { tag_name: 'typescript', tag_id: 't2', post_count: 8 },
                ])),
              })),
            })),
          })),
        })),
      });

      const result = await service.getPostsByTagDistribution(10);

      expect(result).toHaveLength(2);
      expect(result[0].post_count).toBe(15);
    });
  });

  describe('getTopPostsByViews', () => {
    it('returns top posts by views', async () => {
      mockFindMany.mockResolvedValue([
        { id: 'p1', title: 'Post 1', view_count: 100, user: { id: 'u1' } },
        { id: 'p2', title: 'Post 2', view_count: 50, user: { id: 'u2' } },
      ]);

      const result = await service.getTopPostsByViews(10);

      expect(result).toHaveLength(2);
      expect(result[0].view_count).toBe(100);
    });
  });

  describe('getTopPostsByLikes', () => {
    it('returns top posts by likes', async () => {
      mockFindMany.mockResolvedValue([
        { id: 'p1', title: 'Post 1', like_count: 50, user: { id: 'u1' } },
        { id: 'p2', title: 'Post 2', like_count: 30, user: { id: 'u2' } },
      ]);

      const result = await service.getTopPostsByLikes(10);

      expect(result).toHaveLength(2);
      expect(result[0].like_count).toBe(50);
    });
  });

  describe('getUserActivity', () => {
    it('returns user activity stats', async () => {
      mocks.mockFrom.mockReturnValue({
        leftJoin: mock(() => ({
          groupBy: mock(() => ({
            orderBy: mock(() => ({
              limit: mock(() => Promise.resolve([
                { user_id: 'u1', username: 'alice', first_name: 'Alice', last_name: 'Smith', post_count: 10, total_views: 500, total_likes: 50 },
                { user_id: 'u2', username: 'bob', first_name: 'Bob', last_name: 'Jones', post_count: 5, total_views: 200, total_likes: 20 },
              ])),
            })),
          })),
        })),
      });

      const result = await service.getUserActivity(10);

      expect(result).toHaveLength(2);
      expect(result[0].post_count).toBe(10);
    });
  });

  describe('getEngagementMetrics', () => {
    it('returns engagement overview', async () => {
      mocks.mockFrom.mockReturnValue({
        where: mock(() => Promise.resolve([
          {
            total_posts: 100,
            total_views: 5000,
            total_likes: 500,
            avg_views_per_post: 50,
            avg_likes_per_post: 5,
            published_posts: 80,
            draft_posts: 20,
          },
        ])),
      });

      const result = await service.getEngagementMetrics();

      expect(result.total_posts).toBe(100);
      expect(result.total_views).toBe(5000);
      expect(result.published_posts).toBe(80);
      expect(result.draft_posts).toBe(20);
    });
  });

  describe('getEngagementComparison', () => {
    it('returns engagement comparison with rate', async () => {
      mocks.mockFrom.mockReturnValue({
        where: mock(() => ({
          orderBy: mock(() => ({
            limit: mock(() => Promise.resolve([
              { id: 'p1', title: 'Post 1', view_count: 100, like_count: 10, engagement_rate: 10 },
              { id: 'p2', title: 'Post 2', view_count: 200, like_count: 20, engagement_rate: 10 },
            ])),
          })),
        })),
      });

      const result = await service.getEngagementComparison(20);

      expect(result).toHaveLength(2);
      expect(result[0].engagement_rate).toBe(10);
    });
  });

  describe('getPostsForSitemap', () => {
    it('returns posts for sitemap', async () => {
      mocks.mockFrom.mockReturnValue({
        innerJoin: mock(() => ({
          where: mock(() => ({
            orderBy: mock(() => ({
              limit: mock(() => Promise.resolve([
                { slug: 'post-1', username: 'alice', created_at: '2024-01-01', updated_at: '2024-01-02' },
                { slug: 'post-2', username: 'bob', created_at: '2024-02-01', updated_at: '2024-02-02' },
              ])),
            })),
          })),
        })),
      });

      const result = await service.getPostsForSitemap();

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('post-1');
    });
  });
});
