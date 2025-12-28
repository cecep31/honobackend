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
    postBookmarks: {
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

    it('toggleBookmark adds bookmark if not exists', async () => {
        const postId = 'post-1';
        const userId = 'user-1';

        // Mock select finding nothing
        mockWhereSelect.mockResolvedValue([]);
        
        // Mock insert returning new bookmark
        mockReturning.mockResolvedValue([{ id: 'new-bookmark-id', post_id: postId, user_id: userId }]);

        const result = await bookmarkService.toggleBookmark(postId, userId);

        expect(result.action).toBe('added');
        expect(result.id).toBe('new-bookmark-id');
        expect(mockInsert).toHaveBeenCalled();
    });

    it('toggleBookmark removes bookmark if exists', async () => {
        const postId = 'post-1';
        const userId = 'user-1';

        // Mock select finding existing bookmark
        mockWhereSelect.mockResolvedValue([{ id: 'existing-id' }]);
        
        // Mock delete returning deleted bookmark
        mockReturning.mockResolvedValue([{ id: 'existing-id', post_id: postId, user_id: userId }]);

        const result = await bookmarkService.toggleBookmark(postId, userId);

        expect(result.action).toBe('removed');
        expect(result.id).toBe('existing-id');
        expect(mockDelete).toHaveBeenCalled();
    });
    
    it('getBookmarksByUser returns bookmarks', async () => {
        const userId = 'user-1';
        const mockBookmarks = [{ id: 'b1', post: { title: 'Post 1' } }];
        
        mockFindMany.mockResolvedValue(mockBookmarks);
        
        const result = await bookmarkService.getBookmarksByUser(userId);
        
        expect(result).toBe(mockBookmarks);
        expect(mockFindMany).toHaveBeenCalled();
    });
});
