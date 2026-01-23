import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { LikeService } from '../modules/likes/services/likeService';

// Mock DB chain
const mockReturning = mock();
const mockValues = mock(() => ({ returning: mockReturning }));
const mockInsert = mock(() => ({ values: mockValues }));

const mockWhereDelete = mock(() => ({ returning: mockReturning }));
const mockDelete = mock(() => ({ where: mockWhereDelete }));

const mockWhereSelect = mock();
const mockFrom = mock(() => ({ where: mockWhereSelect }));
const mockSelect = mock(() => ({ from: mockFrom }));

mock.module('../database/drizzle', () => {
    return {
        db: {
            insert: mockInsert,
            delete: mockDelete,
            select: mockSelect,
        }
    }
});

describe('LikeService', () => {
    let likeService: LikeService;

    beforeEach(() => {
        likeService = new LikeService();
        mockReturning.mockReset();
        mockValues.mockClear();
        mockInsert.mockClear();
        mockDelete.mockClear();
        mockWhereDelete.mockClear();
        mockSelect.mockClear();
        mockFrom.mockClear();
        mockWhereSelect.mockReset();
    });

    describe('updateLike', () => {
        it('should add a like if it does not exist', async () => {
            const postId = 'post-1';
            const userId = 'user-1';

            // Mock select finding nothing
            mockWhereSelect.mockResolvedValue([]);
            
            // Mock insert returning new like
            mockReturning.mockResolvedValue([{ id: 'new-like-id' }]);

            const result = await likeService.updateLike(postId, userId);

            expect(result.id).toBe('new-like-id');
            expect(mockSelect).toHaveBeenCalled();
            expect(mockInsert).toHaveBeenCalled();
        });

        it('should remove a like if it exists (hard delete)', async () => {
            const postId = 'post-1';
            const userId = 'user-1';

            // Mock select finding existing like
            mockWhereSelect.mockResolvedValue([{ id: 'existing-id' }]);
            
            // Mock delete returning deleted like
            mockReturning.mockResolvedValue([{ id: 'existing-id' }]);

            const result = await likeService.updateLike(postId, userId);

            expect(result.id).toBe('existing-id');
            expect(mockSelect).toHaveBeenCalled();
            expect(mockDelete).toHaveBeenCalled();
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
            expect(mockSelect).toHaveBeenCalled();
        });
    });
});
