import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { bookmarkService } from '../services';
import { createDrizzleMocks } from './helpers/drizzleMock';

// Create mocks using helper
const mocks = createDrizzleMocks();

// Mock select chain for this specific service
const mockWhereSelect = mock();
const mockFrom = mock(() => ({ where: mockWhereSelect }));

const mockFindMany = mock();
const mockQuery = {
  post_bookmarks: {
    findMany: mockFindMany,
  },
};

mock.module('../database/drizzle', () => {
  return {
    db: {
      insert: mocks.mockInsert,
      delete: mocks.mockDelete,
      select: mocks.mockSelect,
      query: mockQuery,
    },
  };
});

describe('BookmarkService', () => {
  beforeEach(() => {
    mocks.reset();
    mockWhereSelect.mockReset();
    mockFrom.mockClear();
    mockFindMany.mockReset();
    mocks.mockSelect.mockReturnValue({ from: mockFrom });
  });

    describe('toggleBookmark', () => {
        it('adds bookmark if not exists', async () => {
            const postId = 'post-1';
            const userId = 'user-1';

            mockWhereSelect.mockResolvedValue([]);
            mocks.mockReturning.mockResolvedValue([{ id: 'new-bookmark-id', post_id: postId, user_id: userId }]);

            const result = await bookmarkService.toggleBookmark(postId, userId);

            expect(result.action).toBe('added');
            expect(result.id).toBe('new-bookmark-id');
            expect(mocks.mockInsert).toHaveBeenCalled();
        });

        it('removes bookmark if exists', async () => {
            const postId = 'post-1';
            const userId = 'user-1';

            mockWhereSelect.mockResolvedValue([{ id: 'existing-id' }]);
            mocks.mockReturning.mockResolvedValue([{ id: 'existing-id', post_id: postId, user_id: userId }]);

            const result = await bookmarkService.toggleBookmark(postId, userId);

            expect(result.action).toBe('removed');
            expect(result.id).toBe('existing-id');
            expect(mocks.mockDelete).toHaveBeenCalled();
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
            mocks.mockReturning.mockRejectedValue(new Error('Insert Error'));

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
            mocks.mockReturning.mockRejectedValue(new Error('Delete Error'));

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
