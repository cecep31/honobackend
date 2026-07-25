import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createDrizzleMocks } from './helpers/drizzleMock';

const mocks = createDrizzleMocks();
const mockWhereSelect = mock();
const mockFrom = mock(() => ({ where: mockWhereSelect }));
const mockPostFindFirst = mock();

mock.module('../database/drizzle', () => ({
  db: {
    select: mocks.mockSelect,
    insert: mocks.mockInsert,
    update: mocks.mockUpdate,
    query: {
      posts: { findFirst: mockPostFindFirst },
    },
  },
}));

const { PostViewService } = await import('../modules/posts/services/postViewService');

describe('PostViewService', () => {
  let service: InstanceType<typeof PostViewService>;

  beforeEach(() => {
    service = new PostViewService();
    mocks.reset();
    mockWhereSelect.mockReset();
    mockFrom.mockClear();
    mockPostFindFirst.mockReset();
    mocks.mockSelect.mockReturnValue({ from: mockFrom });
  });

  describe('recordView', () => {
    it('records a view and increments the counter for a new viewer', async () => {
      mockPostFindFirst.mockResolvedValue({ id: 'post-1' });
      mockWhereSelect.mockResolvedValue([{ count: 0 }]); // hasUserViewed -> false

      const result = await service.recordView('post-1', 'user-1', '127.0.0.1', 'agent');

      expect(result.recorded).toBe(true);
      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockUpdate).toHaveBeenCalled();
    });

    it('records an anonymous view without a user id', async () => {
      mockPostFindFirst.mockResolvedValue({ id: 'post-1' });

      const result = await service.recordView('post-1', null, '127.0.0.1', 'agent');

      expect(result.recorded).toBe(true);
      expect(mocks.mockSelect).not.toHaveBeenCalled(); // no dedupe check
      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockUpdate).toHaveBeenCalled();
    });

    it('deduplicates repeated views from the same user', async () => {
      mockPostFindFirst.mockResolvedValue({ id: 'post-1' });
      mockWhereSelect.mockResolvedValue([{ count: 1 }]); // hasUserViewed -> true

      const result = await service.recordView('post-1', 'user-1');

      expect(result.recorded).toBe(false);
      expect(mocks.mockInsert).not.toHaveBeenCalled();
      expect(mocks.mockUpdate).not.toHaveBeenCalled();
    });

    it('throws NotFound when the post does not exist', async () => {
      mockPostFindFirst.mockResolvedValue(undefined);

      await expect(service.recordView('missing-post', 'user-1')).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mocks.mockInsert).not.toHaveBeenCalled();
    });
  });

  describe('getViewStats', () => {
    it('returns aggregated statistics', async () => {
      mockWhereSelect.mockResolvedValue([
        {
          total_views: 10,
          unique_views: 4,
          anonymous_views: 6,
          authenticated_views: 4,
        },
      ]);

      const stats = await service.getViewStats('post-1');

      expect(stats).toEqual({
        post_id: 'post-1',
        total_views: 10,
        unique_views: 4,
        anonymous_views: 6,
        authenticated_views: 4,
      });
    });
  });

  describe('hasUserViewed', () => {
    it('returns true when a view row exists', async () => {
      mockWhereSelect.mockResolvedValue([{ count: 2 }]);
      await expect(service.hasUserViewed('post-1', 'user-1')).resolves.toBe(true);
    });

    it('returns false when no view row exists', async () => {
      mockWhereSelect.mockResolvedValue([{ count: 0 }]);
      await expect(service.hasUserViewed('post-1', 'user-1')).resolves.toBe(false);
    });
  });
});
