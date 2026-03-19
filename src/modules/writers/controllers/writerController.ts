import { Hono } from 'hono';
import { validateRequest } from '../../../middlewares/validateRequest';
import type { AppServices } from '../../../services';
import type { Variables } from '../../../types/context';
import { Errors } from '../../../utils/error';
import { sendSuccess } from '../../../utils/response';
import { writerPostsQuerySchema } from '../validation';

type WriterService = AppServices['writerService'];
type PostService = AppServices['postService'];

export const createWriterController = (writerService: WriterService, postService: PostService) =>
  new Hono<{ Variables: Variables }>()
    .get('/:username', async (c) => {
      const username = c.req.param('username');
      const user = await writerService.getWriterByUsername(username);
      if (!user) {
        throw Errors.NotFound('Writer');
      }
      return sendSuccess(c, user, 'Writer profile fetched successfully');
    })
    .get('/:username/posts', validateRequest('query', writerPostsQuerySchema), async (c) => {
      const username = c.req.param('username');
      const { limit, offset } = c.req.valid('query');
      const { data, meta } = await postService.getPostsByUsername(username, limit, offset);
      return sendSuccess(c, data, 'Writer posts fetched successfully', 200, meta);
    });
