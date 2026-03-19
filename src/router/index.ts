import { Hono } from 'hono';
import { createAuthController } from '../modules/auth/controllers/authController';
import { createBookmarkController } from '../modules/bookmarks/controllers/bookmarkController';
import { createChatController } from '../modules/chat/controllers/chatController';
import { createCommentController } from '../modules/comments/controllers/commentController';
import { createHoldingController } from '../modules/holdings/controllers/holdingController';
import { createLikeController } from '../modules/likes/controllers/likeController';
import { createPostController } from '../modules/posts/controllers/postController';
import { createTagController } from '../modules/tags/controllers/tagController';
import { createUserController } from '../modules/users/controllers/userController';
import { createWriterController } from '../modules/writers/controllers/writerController';
import { createServices } from '../services';
import type { Variables } from '../types/context';

const setupRouter = (app: Hono<{ Variables: Variables }>) => {
  const services = createServices();
  const authController = createAuthController(
    services.authService,
    services.userService,
    services.activityService
  );
  const userController = createUserController(services.userService);
  const postController = createPostController(services.postService, services.userService);
  const tagController = createTagController(services.tagService);
  const likeController = createLikeController(services.likeService);
  const writerController = createWriterController(services.writerService, services.postService);
  const chatController = createChatController(services.chatService);
  const holdingController = createHoldingController(services.holdingService);
  const bookmarkController = createBookmarkController(services.bookmarkService);
  const commentController = createCommentController(services.commentService);

  const v1 = new Hono<{ Variables: Variables }>()
    .route('/auth', authController)
    .route('/users', userController)
    .route('/posts', postController)
    .route('/tags', tagController)
    .route('/likes', likeController)
    .route('/writers', writerController)
    .route('/chat', chatController)
    .route('/holdings', holdingController)
    .route('/bookmarks', bookmarkController)
    .route('/comments', commentController);

  app.route('/v1', v1);
};

export default setupRouter;
