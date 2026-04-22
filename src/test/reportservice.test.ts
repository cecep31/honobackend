import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createDrizzleMocks, createChainableMock } from './helpers/drizzleMock';

const mocks = createDrizzleMocks();
const mockExecute = mock();

mock.module('../database/drizzle', () => {
  return {
    db: {
      select: mocks.mockSelect,
      insert: mocks.mockInsert,
      update: mocks.mockUpdate,
      delete: mocks.mockDelete,
      execute: mockExecute,
    },
  };
});

import { ReportService } from '../modules/reports/services/reportService';

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(() => {
    service = new ReportService();
    mocks.reset();
    mockExecute.mockReset();
  });

  const setupCountSelectMock = (countValue: number) => {
    mocks.mockSelect.mockReturnValueOnce({
      from: mock(() => ({
        where: mock(() => Promise.resolve([{ count: countValue }])),
      })),
    });
  };

  const setupSumSelectMock = (totalValue: number) => {
    mocks.mockSelect.mockReturnValueOnce({
      from: mock(() => ({
        where: mock(() => Promise.resolve([{ total: totalValue }])),
      })),
    });
  };

  describe('getOverviewStats', () => {
    it('returns overview stats successfully', async () => {
      let callCount = 0;
      mocks.mockSelect.mockImplementation(() => ({
        from: mock(() => ({
          where: mock(() => {
            callCount++;
            return Promise.resolve([{ count: callCount, total: callCount * 10 }]);
          }),
        })),
      }));

      const result = await service.getOverviewStats();

      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('totalPosts');
      expect(result).toHaveProperty('totalViews');
      expect(result).toHaveProperty('totalLikes');
      expect(result).toHaveProperty('totalComments');
      expect(result).toHaveProperty('newUsersToday');
      expect(result).toHaveProperty('newPostsToday');
      expect(result).toHaveProperty('activeUsersThisWeek');
    });
  });

  describe('getUserReport', () => {
    it('returns user report with default limit', async () => {
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 100 }])),
        })),
      });

      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 10 }])),
        })),
      });

      const topContributorsChain = createChainableMock([
        {
          id: 'user-1',
          username: 'writer1',
          firstName: 'John',
          lastName: 'Doe',
          postCount: 5,
          totalViews: 100,
          totalLikes: 20,
        },
      ]);
      mocks.mockSelect.mockReturnValueOnce(topContributorsChain);

      mockExecute.mockResolvedValue([
        { date: new Date('2025-01-01'), new_users: 2, cumulative_users: 10 },
      ]);

      // activeUsersResult
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 15 }])),
        })),
      });

      const result = await service.getUserReport({}, 10);

      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('newUsersThisPeriod');
      expect(result).toHaveProperty('activeUsers');
      expect(result).toHaveProperty('topContributors');
      expect(result).toHaveProperty('growthTrend');
      expect(Array.isArray(result.topContributors)).toBe(true);
      expect(Array.isArray(result.growthTrend)).toBe(true);
    });

    it('returns user report with date range', async () => {
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 50 }])),
        })),
      });

      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 5 }])),
        })),
      });

      const chainMock = createChainableMock([]);
      mocks.mockSelect.mockReturnValueOnce(chainMock);

      mockExecute.mockResolvedValue([]);

      // activeUsersResult
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 0 }])),
        })),
      });

      const result = await service.getUserReport(
        { startDate: '2025-01-01', endDate: '2025-01-31' },
        5
      );

      expect(result.totalUsers).toBe(50);
      expect(result.topContributors).toEqual([]);
    });
  });

  describe('getPostReport', () => {
    it('returns post report without tag filter', async () => {
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 100 }])),
        })),
      });
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 100 }])),
        })),
      });
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ total: 1000 }])),
        })),
      });
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ total: 1000 }])),
        })),
      });
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 100 }])),
        })),
      });

      // topPostsQuery
      const topPostsChain = createChainableMock([
        {
          id: 'post-1',
          title: 'Test Post',
          slug: 'test-post',
          views: 100,
          likes: 10,
          createdAt: '2025-01-01T00:00:00.000Z',
          authorId: 'user-1',
          authorUsername: 'writer1',
          authorFirstName: 'John',
          authorLastName: 'Doe',
        },
      ]);
      mocks.mockSelect.mockReturnValueOnce(topPostsChain);

      // commentCounts
      const commentCountsChain = createChainableMock([{ post_id: 'post-1', count: 5 }]);
      mocks.mockSelect.mockReturnValueOnce(commentCountsChain);

      // tagPerformance
      const tagChain = createChainableMock([
        { id: 1, name: 'javascript', postCount: 10, totalViews: 500, totalLikes: 50 },
      ]);
      mocks.mockSelect.mockReturnValueOnce(tagChain);

      const result = await service.getPostReport({}, 10);

      expect(result).toHaveProperty('totalPosts');
      expect(result).toHaveProperty('totalViews');
      expect(result).toHaveProperty('totalLikes');
      expect(result).toHaveProperty('totalComments');
      expect(result).toHaveProperty('avgEngagementRate');
      expect(result).toHaveProperty('topPosts');
      expect(result).toHaveProperty('tagPerformance');
      expect(Array.isArray(result.topPosts)).toBe(true);
      expect(Array.isArray(result.tagPerformance)).toBe(true);
      expect(result.topPosts[0]).toHaveProperty('comments');
      expect(result.topPosts[0]).toHaveProperty('engagementRate');
    });

    it('returns post report with tag filter', async () => {
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 50 }])),
        })),
      });
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 50 }])),
        })),
      });
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ total: 500 }])),
        })),
      });
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ total: 500 }])),
        })),
      });
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 50 }])),
        })),
      });

      const topPostsChain = createChainableMock([]);
      mocks.mockSelect.mockReturnValueOnce(topPostsChain);

      const commentCountsChain = createChainableMock([]);
      mocks.mockSelect.mockReturnValueOnce(commentCountsChain);

      // tagPerformance
      const tagChain = createChainableMock([]);
      mocks.mockSelect.mockReturnValueOnce(tagChain);

      const result = await service.getPostReport({}, 10, 5);

      expect(result.totalPosts).toBe(50);
      expect(result.topPosts).toEqual([]);
    });

    it('calculates engagement rate correctly', async () => {
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 10 }])),
        })),
      });
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 10 }])),
        })),
      });
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ total: 100 }])),
        })),
      });
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ total: 50 }])),
        })),
      });
      mocks.mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 10 }])),
        })),
      });

      const topPostsChain = createChainableMock([
        {
          id: 'post-1',
          title: 'Test',
          slug: 'test',
          views: 100,
          likes: 10,
          createdAt: '2025-01-01T00:00:00.000Z',
          authorId: 'user-1',
          authorUsername: 'writer1',
          authorFirstName: 'John',
          authorLastName: 'Doe',
        },
      ]);
      mocks.mockSelect.mockReturnValueOnce(topPostsChain);

      const commentCountsChain = createChainableMock([{ post_id: 'post-1', count: 5 }]);
      mocks.mockSelect.mockReturnValueOnce(commentCountsChain);

      const tagChain = createChainableMock([]);
      mocks.mockSelect.mockReturnValueOnce(tagChain);

      const result = await service.getPostReport({}, 10);

      expect(result.avgEngagementRate).toBeGreaterThan(0);
      expect(result.topPosts[0].engagementRate).toBeGreaterThan(0);
    });
  });

  describe('getEngagementMetrics', () => {
    it('returns engagement metrics without date filter', async () => {
      let callCount = 0;
      mocks.mockSelect.mockImplementation(() => ({
        from: mock(() => ({
          where: mock(() => {
            callCount++;
            return Promise.resolve([{ count: callCount * 10 }]);
          }),
        })),
      }));

      const result = await service.getEngagementMetrics({});

      expect(result).toHaveProperty('totalEngagements');
      expect(result).toHaveProperty('avgLikesPerPost');
      expect(result).toHaveProperty('avgCommentsPerPost');
      expect(result).toHaveProperty('periodComparison');
      expect(result.periodComparison).toHaveProperty('current');
      expect(result.periodComparison).toHaveProperty('previous');
      expect(result.periodComparison).toHaveProperty('changePercent');
    });

    it('returns engagement metrics with date filter', async () => {
      let callCount = 0;
      mocks.mockSelect.mockImplementation(() => ({
        from: mock(() => ({
          where: mock(() => {
            callCount++;
            return Promise.resolve([{ count: callCount * 5 }]);
          }),
        })),
      }));

      const result = await service.getEngagementMetrics({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(result).toHaveProperty('totalEngagements');
      expect(result).toHaveProperty('periodComparison');
    });
  });
});
