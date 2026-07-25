import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createDrizzleMocks } from './helpers/drizzleMock';

const mocks = createDrizzleMocks();
const mockWhereSelect = mock();
const mockLimit = mock();
const mockFrom = mock(() => ({ where: mockWhereSelect }));

mock.module('../database/drizzle', () => ({
  db: {
    select: mocks.mockSelect,
  },
}));

const { LikeService } = await import('../modules/likes/services/likeService');

describe('LikeService stats & check', () => {
  let likeService: InstanceType<typeof LikeService>;

  beforeEach(() => {
    likeService = new LikeService();
    mocks.reset();
    mockWhereSelect.mockReset();
    mockLimit.mockReset();
    mockFrom.mockClear();
    mocks.mockSelect.mockReturnValue({ from: mockFrom });
  });

  describe('getLikeStats', () => {
    it('returns the total like count for a post', async () => {
      mockWhereSelect.mockResolvedValue([{ total_likes: 7 }]);

      const stats = await likeService.getLikeStats('post-1');

      expect(stats).toEqual({ post_id: 'post-1', total_likes: 7 });
    });

    it('returns zero when the post has no likes', async () => {
      mockWhereSelect.mockResolvedValue([{ total_likes: 0 }]);

      const stats = await likeService.getLikeStats('post-1');

      expect(stats.total_likes).toBe(0);
    });
  });

  describe('hasUserLiked', () => {
    it('returns has_liked=true when the like exists', async () => {
      mockWhereSelect.mockReturnValue({ limit: mockLimit });
      mockLimit.mockResolvedValue([{ id: 'like-1' }]);

      const result = await likeService.hasUserLiked('post-1', 'user-1');

      expect(result).toEqual({ has_liked: true, post_id: 'post-1', user_id: 'user-1' });
    });

    it('returns has_liked=false when the like does not exist', async () => {
      mockWhereSelect.mockReturnValue({ limit: mockLimit });
      mockLimit.mockResolvedValue([]);

      const result = await likeService.hasUserLiked('post-1', 'user-1');

      expect(result.has_liked).toBe(false);
    });
  });
});
