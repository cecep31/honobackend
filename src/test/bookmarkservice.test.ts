import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { BookmarkService } from '../pkg/services/bookmarkService';

// Mock DB chain
const mockReturning = mock();
const mockValues = mock(() => ({ returning: mockReturning }));
const mockInsert = mock(() => ({ values: mockValues }));

const mockWhereDelete = mock(() => ({ returning: mockReturning }));
const mockDelete = mock(() => ({ where: mockWhereDelete }));

const mockWhereSelect = mock();
const mockFrom = mock(() => ({ where: mockWhereSelect }));
const mockSelect = mock(() => ({ from: mockFrom }));

const mockFindMany = mock();
const mockQuery = {
    post_bookmarks: {
        findMany: mockFindMany
    }
};

mock.module('../database/drizzle', () => {
    return {
        db: {
            insert: mockInsert,
            delete: mockDelete,
            select: mockSelect,
            query: mockQuery
        }
    }
});

describe('BookmarkService', () => {
    let bookmarkService: BookmarkService;

    beforeEach(() => {
        bookmarkService = new BookmarkService();
        mockReturning.mockReset();
        mockValues.mockClear();
        mockInsert.mockClear();
        mockDelete.mockClear();
        mockWhereDelete.mockClear();
        mockSelect.mockClear();
        mockFrom.mockClear();
        mockWhereSelect.mockReset();
        mockFindMany.mockReset();
    });

    describe('toggleBookmark', () => {
        it('adds bookmark if not exists', async () => {
            const postId = 'post-1';
            const userId = 'user-1';

            mockWhereSelect.mockResolvedValue([]);
            mockReturning.mockResolvedValue([{ id: 'new-bookmark-id', post_id: postId, user_id: userId }]);

            const result = await bookmarkService.toggleBookmark(postId, userId);

            expect(result.action).toBe('added');
            expect(result.id).toBe('new-bookmark-id');
            expect(mockInsert).toHaveBeenCalled();
        });

        it('removes bookmark if exists', async () => {
            const postId = 'post-1';
            const userId = 'user-1';

            mockWhereSelect.mockResolvedValue([{ id: 'existing-id' }]);
            mockReturning.mockResolvedValue([{ id: 'existing-id', post_id: postId, user_id: userId }]);

            const result = await bookmarkService.toggleBookmark(postId, userId);

            expect(result.action).toBe('removed');
            expect(result.id).toBe('existing-id');
            expect(mockDelete).toHaveBeenCalled();
        });

        it('throws internal server error on db error during check', async () => {
            const postId = 'post-1';
            const userId = 'user-1';

            mockWhereSelect.mockRejectedValue(new Error('DB Error'));

            try {
                await bookmarkService.toggleBookmark(postId, userId);
            } catch (error: any) {
                expect(error.statusCode).toBe(500);
                expect(error.message).toBe('Internal server error');
            }
        });

        it('throws internal server error on db error during insert', async () => {
            const postId = 'post-1';
            const userId = 'user-1';

            mockWhereSelect.mockResolvedValue([]);
            mockReturning.mockRejectedValue(new Error('Insert Error'));

            try {
                await bookmarkService.toggleBookmark(postId, userId);
            } catch (error: any) {
                expect(error.statusCode).toBe(500);
            }
        });

        it('throws internal server error on db error during delete', async () => {
            const postId = 'post-1';
            const userId = 'user-1';

            mockWhereSelect.mockResolvedValue([{ id: 'existing-id' }]);
            mockReturning.mockRejectedValue(new Error('Delete Error'));

            try {
                await bookmarkService.toggleBookmark(postId, userId);
            } catch (error: any) {
                expect(error.statusCode).toBe(500);
            }
        });
    });
    
    describe('getBookmarksByUser', () => {
        it('returns bookmarks for a user', async () => {
            const userId = 'user-1';
            const mockBookmarks = [{ id: 'b1', post: { title: 'Post 1' } }];
            
            mockFindMany.mockResolvedValue(mockBookmarks);
            
            const result = await bookmarkService.getBookmarksByUser(userId);
            
            expect(result).toBe(mockBookmarks);
            expect(mockFindMany).toHaveBeenCalled();
        });

        it('returns empty array when user has no bookmarks', async () => {
            const userId = 'user-1';
            
            mockFindMany.mockResolvedValue([]);
            
            const result = await bookmarkService.getBookmarksByUser(userId);
            
            expect(result).toEqual([]);
            expect(result).toHaveLength(0);
        });

        it('returns bookmarks with post details and user info', async () => {
            const userId = 'user-1';
            const mockBookmarks = [
                { 
                    id: 'b1', 
                    post: { 
                        id: 'post-1',
                        title: 'Post 1',
                        user: { id: 'author-1', username: 'author' }
                    } 
                },
                { 
                    id: 'b2', 
                    post: { 
                        id: 'post-2',
                        title: 'Post 2',
                        user: { id: 'author-2', username: 'author2' }
                    } 
                }
            ];
            
            mockFindMany.mockResolvedValue(mockBookmarks);
            
            const result = await bookmarkService.getBookmarksByUser(userId);
            
            expect(result).toHaveLength(2);
            expect(result[0].post).toHaveProperty('user');
        });

        it('throws internal server error on db error', async () => {
            const userId = 'user-1';
            
            mockFindMany.mockRejectedValue(new Error('DB Error'));

            try {
                await bookmarkService.getBookmarksByUser(userId);
            } catch (error: any) {
                expect(error.statusCode).toBe(500);
                expect(error.message).toBe('Internal server error');
            }
        });
    });
});
