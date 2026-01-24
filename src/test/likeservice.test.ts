import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { LikeService } from '../modules/likes/services/likeService';
import { createDrizzleMocks } from './helpers/drizzleMock';

// Create mocks using helper
const mocks = createDrizzleMocks();

// Mock select chain for this specific service
const mockWhereSelect = mock();
const mockFrom = mock(() => ({ where: mockWhereSelect }));

mock.module('../database/drizzle', () => {
  return {
    db: {
      insert: mocks.mockInsert,
      delete: mocks.mockDelete,
      select: mocks.mockSelect,
    },
  };
});

describe('LikeService', () => {
  let likeService: LikeService;

  beforeEach(() => {
    likeService = new LikeService();
    mocks.reset();
    mockWhereSelect.mockReset();
    mockFrom.mockClear();
    mocks.mockSelect.mockReturnValue({ from: mockFrom });
  });

    describe('updateLike', () => {
        it('should add a like if it does not exist', async () => {
            const postId = 'post-1';
            const userId = 'user-1';

            // Mock select finding nothing
            mockWhereSelect.mockResolvedValue([]);
            
            // Mock insert returning new like
            mocks.mockReturning.mockResolvedValue([{ id: 'new-like-id' }]);

            const result = await likeService.updateLike(postId, userId);

            expect(result.id).toBe('new-like-id');
            expect(mocks.mockSelect).toHaveBeenCalled();
            expect(mocks.mockInsert).toHaveBeenCalled();
        });

        it('should remove a like if it exists (hard delete)', async () => {
            const postId = 'post-1';
            const userId = 'user-1';

            // Mock select finding existing like
            mockWhereSelect.mockResolvedValue([{ id: 'existing-id' }]);
            
            // Mock delete returning deleted like
            mocks.mockReturning.mockResolvedValue([{ id: 'existing-id' }]);

            const result = await likeService.updateLike(postId, userId);

            expect(result.id).toBe('existing-id');
            expect(mocks.mockSelect).toHaveBeenCalled();
            expect(mocks.mockDelete).toHaveBeenCalled();
        });

        it('should throw internal server error on db error', async () => {
            const postId = 'post-1';
            const userId = 'user-1';

            mockWhereSelect.mockRejectedValue(new Error('DB Error'));

            try {
                await likeService.updateLike(postId, userId);
            } catch (error: any) {
                expect(error.statusCode).toBe(500);
                expect(error.message).toBe('Internal server error');
            }
        });
    });

    describe('getLikes', () => {
        it('should return likes for a post', async () => {
            const postId = 'post-1';
            const mockLikes = [
                { id: '1', created_at: new Date() },
                { id: '2', created_at: new Date() }
            ];

            mockWhereSelect.mockResolvedValue(mockLikes);

            const result = await likeService.getLikes(postId);

            expect(result).toEqual(mockLikes);
            expect(mocks.mockSelect).toHaveBeenCalled();
        });
    });
});
