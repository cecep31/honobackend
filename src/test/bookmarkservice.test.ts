import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { bookmarkService } from '../services';
import { createDrizzleMocks } from './helpers/drizzleMock';

// Create mocks using helper
const mocks = createDrizzleMocks();

// Mock select chain for this specific service
const mockWhereSelect = mock();
const mockFrom = mock(() => ({ where: mockWhereSelect }));

const mockFindMany = mock();
const mockFolderFindFirst = mock();
const mockFolderFindMany = mock();
const mockQuery = {
  post_bookmarks: {
    findMany: mockFindMany,
  },
  bookmark_folders: {
    findFirst: mockFolderFindFirst,
    findMany: mockFolderFindMany,
  },
};

mock.module('../database/drizzle', () => {
  return {
    db: {
      insert: mocks.mockInsert,
      update: mocks.mockUpdate,
      delete: mocks.mockDelete,
      select: mocks.mockSelect,
      query: mockQuery,
      transaction: async (cb: any) =>
        cb({
          select: mocks.mockSelect,
          insert: mocks.mockInsert,
          update: mocks.mockUpdate,
          delete: mocks.mockDelete,
        }),
    },
  };
});

describe('BookmarkService', () => {
  beforeEach(() => {
    mocks.reset();
    mockWhereSelect.mockReset();
    mockFrom.mockClear();
    mockFindMany.mockReset();
    mockFolderFindFirst.mockReset();
    mockFolderFindMany.mockReset();
    mocks.mockSelect.mockReturnValue({ from: mockFrom });
  });

  describe('toggleBookmark', () => {
    it('adds bookmark if not exists', async () => {
      const postId = 'post-1';
      const userId = 'user-1';

      mockWhereSelect.mockResolvedValue([]);
      mocks.mockReturning.mockResolvedValue([
        { id: 'new-bookmark-id', post_id: postId, user_id: userId },
      ]);

      const result = await bookmarkService.toggleBookmark(postId, userId);

      expect(result.action).toBe('added');
      expect(result.id).toBe('new-bookmark-id');
      expect(mocks.mockInsert).toHaveBeenCalled();
    });

    it('removes bookmark if exists', async () => {
      const postId = 'post-1';
      const userId = 'user-1';

      mockWhereSelect.mockResolvedValue([{ id: 'existing-id' }]);
      mocks.mockReturning.mockResolvedValue([
        { id: 'existing-id', post_id: postId, user_id: userId },
      ]);

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
            user: { id: 'author-1', username: 'author' },
          },
        },
        {
          id: 'b2',
          post: {
            id: 'post-2',
            title: 'Post 2',
            user: { id: 'author-2', username: 'author2' },
          },
        },
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

  describe('moveToFolder', () => {
    it('moves bookmark to a folder', async () => {
      mockFolderFindFirst.mockResolvedValue({ id: 'folder-1', name: 'My Folder' });
      mocks.mockReturning.mockResolvedValue([{ id: 'bm-1', folder_id: 'folder-1' }]);

      const result = await bookmarkService.moveToFolder('bm-1', 'user-1', 'folder-1');

      expect(result.folder_id).toBe('folder-1');
      expect(mockFolderFindFirst).toHaveBeenCalled();
    });

    it('moves bookmark out of folder (null)', async () => {
      mocks.mockReturning.mockResolvedValue([{ id: 'bm-1', folder_id: null }]);

      const result = await bookmarkService.moveToFolder('bm-1', 'user-1', null);

      expect(result.folder_id).toBeNull();
      expect(mockFolderFindFirst).not.toHaveBeenCalled();
    });

    it('throws NotFound when folder does not exist', async () => {
      mockFolderFindFirst.mockResolvedValue(null);

      await expect(bookmarkService.moveToFolder('bm-1', 'user-1', 'folder-999')).rejects.toThrow(
        'Folder not found'
      );
    });

    it('throws NotFound when bookmark not found', async () => {
      mockFolderFindFirst.mockResolvedValue({ id: 'folder-1' });
      mocks.mockReturning.mockResolvedValue([]);

      await expect(bookmarkService.moveToFolder('bm-999', 'user-1', 'folder-1')).rejects.toThrow(
        'Bookmark not found'
      );
    });
  });

  describe('updateBookmark', () => {
    it('updates bookmark name and notes', async () => {
      mocks.mockReturning.mockResolvedValue([
        { id: 'bm-1', name: 'Updated Name', notes: 'Updated notes' },
      ]);

      const result = await bookmarkService.updateBookmark('bm-1', 'user-1', {
        name: 'Updated Name',
        notes: 'Updated notes',
      });

      expect(result.name).toBe('Updated Name');
      expect(result.notes).toBe('Updated notes');
    });

    it('throws NotFound when bookmark not found', async () => {
      mocks.mockReturning.mockResolvedValue([]);

      await expect(
        bookmarkService.updateBookmark('bm-999', 'user-1', { name: 'Name' })
      ).rejects.toThrow('Bookmark not found');
    });

    it('throws internal server error on db error', async () => {
      mocks.mockReturning.mockRejectedValue(new Error('DB Error'));

      try {
        await bookmarkService.updateBookmark('bm-1', 'user-1', { name: 'Name' });
      } catch (error: any) {
        expect(error.statusCode).toBe(500);
        expect(error.message).toBe('Internal server error');
      }
    });
  });

  describe('createFolder', () => {
    it('creates a folder', async () => {
      mocks.mockReturning.mockResolvedValue([
        { id: 'folder-1', name: 'New Folder', description: 'Desc' },
      ]);

      const result = await bookmarkService.createFolder('user-1', 'New Folder', 'Desc');

      expect(result.name).toBe('New Folder');
      expect(result.description).toBe('Desc');
    });

    it('throws internal server error on db error', async () => {
      mocks.mockReturning.mockRejectedValue(new Error('DB Error'));

      try {
        await bookmarkService.createFolder('user-1', 'New Folder');
      } catch (error: any) {
        expect(error.statusCode).toBe(500);
        expect(error.message).toBe('Internal server error');
      }
    });
  });

  describe('updateFolder', () => {
    it('updates folder name and description', async () => {
      mocks.mockReturning.mockResolvedValue([
        { id: 'folder-1', name: 'Updated Folder', description: 'Updated Desc' },
      ]);

      const result = await bookmarkService.updateFolder('folder-1', 'user-1', {
        name: 'Updated Folder',
        description: 'Updated Desc',
      });

      expect(result.name).toBe('Updated Folder');
    });

    it('throws NotFound when folder not found', async () => {
      mocks.mockReturning.mockResolvedValue([]);

      await expect(
        bookmarkService.updateFolder('folder-999', 'user-1', { name: 'Name' })
      ).rejects.toThrow('Folder not found');
    });

    it('throws internal server error on db error', async () => {
      mocks.mockReturning.mockRejectedValue(new Error('DB Error'));

      try {
        await bookmarkService.updateFolder('folder-1', 'user-1', { name: 'Name' });
      } catch (error: any) {
        expect(error.statusCode).toBe(500);
        expect(error.message).toBe('Internal server error');
      }
    });
  });

  describe('deleteFolder', () => {
    it('deletes a folder', async () => {
      mocks.mockReturning.mockResolvedValue([{ id: 'folder-1', name: 'Deleted' }]);

      const result = await bookmarkService.deleteFolder('folder-1', 'user-1');

      expect(result.id).toBe('folder-1');
    });

    it('throws NotFound when folder not found', async () => {
      mocks.mockReturning.mockResolvedValue([]);

      await expect(bookmarkService.deleteFolder('folder-999', 'user-1')).rejects.toThrow(
        'Folder not found'
      );
    });

    it('throws internal server error on db error', async () => {
      mocks.mockReturning.mockRejectedValue(new Error('DB Error'));

      try {
        await bookmarkService.deleteFolder('folder-1', 'user-1');
      } catch (error: any) {
        expect(error.statusCode).toBe(500);
        expect(error.message).toBe('Internal server error');
      }
    });
  });

  describe('getFoldersByUser', () => {
    it('returns folders with bookmark counts', async () => {
      mockFolderFindMany.mockResolvedValue([
        {
          id: 'folder-1',
          name: 'Folder 1',
          post_bookmarks: [{ id: 'bm-1' }, { id: 'bm-2' }],
        },
        {
          id: 'folder-2',
          name: 'Folder 2',
          post_bookmarks: [],
        },
      ]);

      const result = await bookmarkService.getFoldersByUser('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].bookmark_count).toBe(2);
      expect(result[1].bookmark_count).toBe(0);
      expect(result[0].post_bookmarks).toBeUndefined();
    });

    it('throws internal server error on db error', async () => {
      mockFolderFindMany.mockRejectedValue(new Error('DB Error'));

      try {
        await bookmarkService.getFoldersByUser('user-1');
      } catch (error: any) {
        expect(error.statusCode).toBe(500);
        expect(error.message).toBe('Internal server error');
      }
    });
  });
});
