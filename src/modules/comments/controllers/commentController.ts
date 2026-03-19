import { Hono } from 'hono';
import { auth } from '../../../middlewares/auth';
import { validateRequest } from '../../../middlewares/validateRequest';
import type { AppServices } from '../../../services';
import type { Variables } from '../../../types/context';
import { sendSuccess } from '../../../utils/response';
import { createCommentSchema, getCommentsQuerySchema, updateCommentSchema } from '../validation';

type CommentService = AppServices['commentService'];

export const createCommentController = (commentService: CommentService) => {
  const commentController = new Hono<{ Variables: Variables }>();

  commentController.post('/', auth, validateRequest('json', createCommentSchema), async (c) => {
    const { user_id } = c.get('user');
    const data = c.req.valid('json');
    const result = await commentService.createComment(data, user_id);
    return sendSuccess(c, result, 'Comment created successfully', 201);
  });

  commentController.get(
    '/post/:post_id',
    validateRequest('query', getCommentsQuerySchema),
    async (c) => {
      const { post_id } = c.req.param();
      const { offset, limit } = c.req.valid('query');
      const result = await commentService.getCommentsByPost(post_id, offset, limit);
      return sendSuccess(c, result.data, 'Comments fetched successfully', 200, result.meta);
    }
  );

  commentController.get('/:comment_id/replies', async (c) => {
    const { comment_id } = c.req.param();
    const result = await commentService.getCommentReplies(comment_id);
    return sendSuccess(c, result, 'Comment replies fetched successfully');
  });

  commentController.get('/:comment_id', async (c) => {
    const { comment_id } = c.req.param();
    const result = await commentService.getCommentById(comment_id);
    return sendSuccess(c, result, 'Comment fetched successfully');
  });

  commentController.put(
    '/:comment_id',
    auth,
    validateRequest('json', updateCommentSchema),
    async (c) => {
      const { comment_id } = c.req.param();
      const { user_id } = c.get('user');
      const data = c.req.valid('json');
      const result = await commentService.updateComment(comment_id, data, user_id);
      return sendSuccess(c, result, 'Comment updated successfully');
    }
  );

  commentController.delete('/:comment_id', auth, async (c) => {
    const { comment_id } = c.req.param();
    const { user_id } = c.get('user');
    const result = await commentService.deleteComment(comment_id, user_id);
    return sendSuccess(c, result, 'Comment deleted successfully');
  });

  commentController.get(
    '/user/:user_id',
    validateRequest('query', getCommentsQuerySchema),
    async (c) => {
      const { user_id } = c.req.param();
      const { offset, limit } = c.req.valid('query');
      const result = await commentService.getCommentsByUser(user_id, offset, limit);
      return sendSuccess(c, result.data, 'User comments fetched successfully', 200, result.meta);
    }
  );

  return commentController;
};
