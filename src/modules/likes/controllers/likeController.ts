import { Hono } from 'hono';
import { auth } from '../../../middlewares/auth';
import type { AppServices } from '../../../services';
import type { Variables } from '../../../types/context';
import { sendSuccess } from '../../../utils/response';
import { createRateLimiter } from '../../../utils/rateLimiter';

type LikeService = AppServices['likeService'];

export const createLikeController = (likeService: LikeService) => {
  const likeController = new Hono<{ Variables: Variables }>();

  likeController.post(
    '/:post_id',
    auth,
    createRateLimiter(60 * 1000, 30),
    async (c) => {
      const { post_id } = c.req.param();
      const { user_id } = c.get('user');
      const result = await likeService.updateLike(post_id, user_id);
      return sendSuccess(c, result, 'Like updated successfully');
    }
  );

  likeController.get('/:post_id', auth, async (c) => {
    const post_id = c.req.param('post_id');
    const result = await likeService.getLikes(post_id);
    return sendSuccess(c, result, 'Likes fetched successfully');
  });

  return likeController;
};
