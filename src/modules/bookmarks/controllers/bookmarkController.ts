import { Hono } from 'hono';
import { auth } from '../../../middlewares/auth';
import type { AppServices } from '../../../services';
import type { Variables } from '../../../types/context';
import { sendSuccess } from '../../../utils/response';

type BookmarkService = AppServices['bookmarkService'];

export const createBookmarkController = (bookmarkService: BookmarkService) => {
  const bookmarkController = new Hono<{ Variables: Variables }>();

  bookmarkController.post('/:post_id', auth, async (c) => {
    const { post_id } = c.req.param();
    const { user_id } = c.get('user');
    const result = await bookmarkService.toggleBookmark(post_id, user_id);
    return sendSuccess(c, result, 'Bookmark toggled successfully');
  });

  bookmarkController.get('/', auth, async (c) => {
    const { user_id } = c.get('user');
    const result = await bookmarkService.getBookmarksByUser(user_id);
    return sendSuccess(c, result, 'Bookmarks fetched successfully');
  });

  return bookmarkController;
};
