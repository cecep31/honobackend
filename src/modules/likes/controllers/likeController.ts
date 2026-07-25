import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { auth } from '../../../middlewares/auth';
import type { AppServices } from '../../../services';
import type { Variables } from '../../../types/context';
import { sendSuccess } from '../../../utils/response';
import { createRateLimiter } from '../../../utils/rateLimiter';

type LikeService = AppServices['likeService'];

const postIdParamSchema = z.object({
  post_id: z.string().uuid(),
});

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

  likeController.get('/:post_id/stats', zValidator('param', postIdParamSchema), async (c) => {
    const { post_id } = c.req.valid('param');
    const result = await likeService.getLikeStats(post_id);
    return sendSuccess(c, result, 'Like stats retrieved successfully');
  });

  likeController.get(
    '/:post_id/check',
    auth,
    zValidator('param', postIdParamSchema),
    async (c) => {
      const { post_id } = c.req.valid('param');
      const { user_id } = c.get('user');
      const result = await likeService.hasUserLiked(post_id, user_id);
      return sendSuccess(c, result, 'Like status retrieved successfully');
    }
  );

  likeController.get('/:post_id', async (c) => {
    const post_id = c.req.param('post_id');
    const result = await likeService.getLikes(post_id);
    return sendSuccess(c, result, 'Likes fetched successfully');
  });

  return likeController;
};
