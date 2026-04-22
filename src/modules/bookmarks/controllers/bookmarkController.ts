import { Hono } from 'hono';
import { auth } from '../../../middlewares/auth';
import type { AppServices } from '../../../services';
import type { Variables } from '../../../types/context';
import { safeLimit, safeOffset } from '../../../utils/request';
import { sendSuccess } from '../../../utils/response';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

type BookmarkService = AppServices['bookmarkService'];

const toggleBookmarkSchema = z.object({
  folder_id: z.string().uuid().optional(),
  name: z.string().max(255).optional(),
  notes: z.string().optional(),
});

const createFolderSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

const updateFolderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

const updateBookmarkSchema = z.object({
  name: z.string().max(255).optional(),
  notes: z.string().optional(),
});

const moveBookmarkSchema = z.object({
  folder_id: z.string().uuid().nullable().optional(),
});

export const createBookmarkController = (bookmarkService: BookmarkService) => {
  const bookmarkController = new Hono<{ Variables: Variables }>();

  bookmarkController.post(
    '/:post_id',
    auth,
    zValidator('json', toggleBookmarkSchema),
    async (c) => {
      const { post_id } = c.req.param();
      const { user_id } = c.get('user');
      const { folder_id, name, notes } = c.req.valid('json');
      const result = await bookmarkService.toggleBookmark(post_id, user_id, folder_id, name, notes);
      return sendSuccess(c, result, 'Bookmark toggled successfully');
    }
  );

  bookmarkController.get('/', auth, async (c) => {
    const { user_id } = c.get('user');
    const folder_id = c.req.query('folder_id');
    const limit = safeLimit(c.req.query('limit'), 50);
    const offset = safeOffset(c.req.query('offset'), 0);
    const result = await bookmarkService.getBookmarksByUser(user_id, folder_id, limit, offset);
    return sendSuccess(c, result, 'Bookmarks fetched successfully');
  });

  bookmarkController.patch(
    '/:bookmark_id',
    auth,
    zValidator('json', updateBookmarkSchema),
    async (c) => {
      const { bookmark_id } = c.req.param();
      const { user_id } = c.get('user');
      const data = c.req.valid('json');
      const result = await bookmarkService.updateBookmark(bookmark_id, user_id, data);
      return sendSuccess(c, result, 'Bookmark updated successfully');
    }
  );

  bookmarkController.patch(
    '/:bookmark_id/move',
    auth,
    zValidator('json', moveBookmarkSchema),
    async (c) => {
      const { bookmark_id } = c.req.param();
      const { user_id } = c.get('user');
      const { folder_id } = c.req.valid('json');
      const result = await bookmarkService.moveToFolder(bookmark_id, user_id, folder_id || null);
      return sendSuccess(c, result, 'Bookmark moved successfully');
    }
  );

  bookmarkController.post('/folders', auth, zValidator('json', createFolderSchema), async (c) => {
    const { user_id } = c.get('user');
    const { name, description } = c.req.valid('json');
    const result = await bookmarkService.createFolder(user_id, name, description);
    return sendSuccess(c, result, 'Folder created successfully', 201);
  });

  bookmarkController.get('/folders', auth, async (c) => {
    const { user_id } = c.get('user');
    const result = await bookmarkService.getFoldersByUser(user_id);
    return sendSuccess(c, result, 'Folders fetched successfully');
  });

  bookmarkController.patch(
    '/folders/:folder_id',
    auth,
    zValidator('json', updateFolderSchema),
    async (c) => {
      const { folder_id } = c.req.param();
      const { user_id } = c.get('user');
      const data = c.req.valid('json');
      const result = await bookmarkService.updateFolder(folder_id, user_id, data);
      return sendSuccess(c, result, 'Folder updated successfully');
    }
  );

  bookmarkController.delete('/folders/:folder_id', auth, async (c) => {
    const { folder_id } = c.req.param();
    const { user_id } = c.get('user');
    const result = await bookmarkService.deleteFolder(folder_id, user_id);
    return sendSuccess(c, result, 'Folder deleted successfully');
  });

  return bookmarkController;
};
