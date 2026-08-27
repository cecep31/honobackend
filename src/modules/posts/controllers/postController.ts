import { Hono } from 'hono';
import { auth } from '../../../middlewares/auth';
import { optionalAuth } from '../../../middlewares/optionalAuth';
import { createSuperAdminMiddleware } from '../../../middlewares/superAdmin';
import { validateRequest } from '../../../middlewares/validateRequest';
import type { AppServices } from '../../../services';
import type { jwtPayload } from '../../../types/auth';
import type { Variables } from '../../../types/context';
import { Errors } from '../../../utils/error';
import { getClientIp } from '../../../utils/request';
import { sendSuccess } from '../../../utils/response';
import { getS3Helper } from '../../../utils/s3';
import { createRateLimiter } from '../../../utils/rateLimiter';
import { z } from 'zod';
import {
  chartLimitQuerySchema,
  createPostSchema,
  listPostsQuerySchema,
  myAnalyticsQuerySchema,
  myLikesByMonthQuerySchema,
  postByUsernameSlugSchema,
  postIdSchema,
  postsOverTimeQuerySchema,
  presignedUrlSchema,
  updatePostSchema,
} from '../validation';

type PostService = AppServices['postService'];
type PostViewService = AppServices['postViewService'];
type UserService = AppServices['userService'];
type CommentService = AppServices['commentService'];
type LikeService = AppServices['likeService'];

const POST_UPLOAD_ACCESS_TYPE = 'public';

const postCommentBodySchema = z.object({
  text: z.string().trim().min(1, 'Comment text is required').max(1000, 'Comment is too long'),
  parent_comment_id: z.string().uuid().optional(),
});

const updateCommentBodySchema = z.object({
  text: z.string().trim().min(1, 'Comment text is required').max(1000, 'Comment is too long'),
});

const postCommentParamsSchema = z.object({
  id: z.string().uuid(),
  comment_id: z.string().uuid(),
});

export const createPostController = (
  postService: PostService,
  userService: UserService,
  postViewService: PostViewService,
  commentService?: CommentService,
  likeService?: LikeService
) => {
  const superAdminMiddleware = createSuperAdminMiddleware(userService);
  const postController = new Hono<{ Variables: Variables }>();

  postController.get('/', validateRequest('query', listPostsQuerySchema), async (c) => {
    const q = c.req.valid('query');
    const params = {
      offset: q.offset,
      limit: q.limit,
      search: q.search ?? q.q,
      orderBy: q.orderBy,
      orderDirection: q.orderDirection,
    };
    const { data, meta } = await postService.getPosts(params);
    return sendSuccess(c, data, 'Posts fetched successfully', 200, meta);
  });

  postController.get(
    '/random',
    createRateLimiter(5 * 60 * 1000, 100),
    async (c) => {
      const posts = await postService.getPostsRandom();
      return sendSuccess(c, posts, 'Random posts fetched successfully');
    }
  );

  postController.get(
    '/trending',
    createRateLimiter(5 * 60 * 1000, 30),
    async (c) => {
      const posts = await postService.getTrendingPosts(5);
      return sendSuccess(c, posts, 'Trending posts fetched successfully');
    }
  );

  postController.get('/me', auth, validateRequest('query', listPostsQuerySchema), async (c) => {
    const q = c.req.valid('query');
    const params = {
      offset: q.offset,
      limit: q.limit,
      search: q.search ?? q.q,
      orderBy: q.orderBy,
      orderDirection: q.orderDirection,
    };
    const authUser = c.get('user');
    const { data, meta } = await postService.getPostsByUser(authUser.user_id, params);
    return sendSuccess(c, data, 'My posts fetched successfully', 200, meta);
  });

  postController.get('/me/liked', auth, validateRequest('query', listPostsQuerySchema), async (c) => {
    const q = c.req.valid('query');
    const params = {
      offset: q.offset,
      limit: q.limit,
    };
    const authUser = c.get('user');
    const { data, meta } = await postService.getLikedPostsByUser(authUser.user_id, params);
    return sendSuccess(c, data, 'Liked posts fetched successfully', 200, meta);
  });

  postController.get(
    '/me/analytics',
    auth,
    validateRequest('query', myAnalyticsQuerySchema),
    async (c) => {
      const { start_date, end_date } = c.req.valid('query');
      const authUser = c.get('user');
      const analytics = await postViewService.getMyPostsAnalytics(
        authUser.user_id,
        start_date,
        end_date
      );
      return sendSuccess(c, analytics, 'Successfully retrieved post analytics');
    }
  );

  postController.get(
    '/me/analytics/likes-by-month',
    auth,
    validateRequest('query', myLikesByMonthQuerySchema),
    async (c) => {
      const { months } = c.req.valid('query');
      const { user_id } = c.get('user');
      const data = await postService.getMyLikesByMonth(user_id, months);
      return sendSuccess(c, data, 'Monthly likes on your posts fetched successfully');
    }
  );

  postController.get(
    '/feed/following',
    auth,
    validateRequest('query', listPostsQuerySchema),
    async (c) => {
      const q = c.req.valid('query');
      const params = {
        offset: q.offset,
        limit: q.limit,
        search: q.search ?? q.q,
        orderBy: q.orderBy,
        orderDirection: q.orderDirection,
      };
      const authUser = c.get('user');
      const { data, meta } = await postService.getFollowingFeed(authUser.user_id, params);
      return sendSuccess(c, data, 'Following feed fetched successfully', 200, meta);
    }
  );

  postController.get(
    '/feed/for-you',
    auth,
    validateRequest('query', listPostsQuerySchema),
    async (c) => {
      const q = c.req.valid('query');
      const params = {
        offset: q.offset,
        limit: q.limit,
        search: q.search ?? q.q,
      };
      const authUser = c.get('user');
      const { data, meta } = await postService.getForYouFeed(authUser.user_id, params);
      return sendSuccess(c, data, 'For you feed fetched successfully', 200, meta);
    }
  );

  postController.get('/tag/:tag', validateRequest('query', listPostsQuerySchema), async (c) => {
    const tag = c.req.param('tag');
    const q = c.req.valid('query');
    const params = { offset: q.offset, limit: q.limit };
    const { data, meta } = await postService.getPostsByTag(tag, params);
    return sendSuccess(c, data, 'Posts by tag fetched successfully', 200, meta);
  });

  const getPostsByAuthorHandler = async (c: any) => {
    const username = c.req.param('username');
    const q = c.req.valid('query');
    const params = {
      offset: q.offset,
      limit: q.limit,
      search: q.search ?? q.q,
      orderBy: q.orderBy,
      orderDirection: q.orderDirection,
    };
    const { data, meta } = await postService.getPostsByUsername(
      username,
      params.limit,
      params.offset
    );
    return sendSuccess(c, data, `Posts by ${username} fetched successfully`, 200, meta);
  };

  postController.get(
    '/author/:username',
    validateRequest('query', listPostsQuerySchema),
    getPostsByAuthorHandler
  );

  postController.get(
    '/username/:username',
    validateRequest('query', listPostsQuerySchema),
    getPostsByAuthorHandler
  );

  postController.get('/slug/:slug', async (c) => {
    const post = await postService.getPostBySlug(c.req.param('slug'));
    if (!post) {
      throw Errors.NotFound('Post');
    }
    return sendSuccess(c, post, 'Post fetched successfully');
  });

  postController.get(
    '/sitemap',
    createRateLimiter(5 * 60 * 1000, 10),
    async (c) => {
      const posts = await postService.getPostsForSitemap();
      return sendSuccess(c, posts, 'Sitemap posts fetched successfully');
    }
  );

  postController.get(
    '/u/:username/:slug',
    validateRequest('param', postByUsernameSlugSchema),
    async (c) => {
      const params = c.req.valid('param');
      const post = await postService.getPostByUsernameSlug(params.username, params.slug);
      if (!post) {
        throw Errors.NotFound('Post');
      }
      return sendSuccess(c, post, 'Post fetched successfully');
    }
  );

  postController.get('/all', auth, superAdminMiddleware, async (c) => {
    const posts = await postService.getAllPosts();
    return sendSuccess(c, posts, 'All posts fetched successfully');
  });

  postController.get(
    '/charts/posts-over-time',
    validateRequest('query', postsOverTimeQuerySchema),
    async (c) => {
      const { days, groupBy } = c.req.valid('query');
      const data = await postService.getPostsOverTime(days, groupBy);
      return sendSuccess(c, data, 'Posts over time data fetched successfully');
    }
  );

  postController.get(
    '/charts/posts-by-tag',
    validateRequest('query', chartLimitQuerySchema),
    async (c) => {
      const { limit } = c.req.valid('query');
      const data = await postService.getPostsByTagDistribution(limit);
      return sendSuccess(c, data, 'Posts by tag distribution fetched successfully');
    }
  );

  postController.get(
    '/charts/top-by-views',
    validateRequest('query', chartLimitQuerySchema),
    async (c) => {
      const { limit } = c.req.valid('query');
      const data = await postService.getTopPostsByViews(limit);
      return sendSuccess(c, data, 'Top posts by views fetched successfully');
    }
  );

  postController.get(
    '/charts/top-by-likes',
    validateRequest('query', chartLimitQuerySchema),
    async (c) => {
      const { limit } = c.req.valid('query');
      const data = await postService.getTopPostsByLikes(limit);
      return sendSuccess(c, data, 'Top posts by likes fetched successfully');
    }
  );

  postController.get(
    '/charts/user-activity',
    validateRequest('query', chartLimitQuerySchema),
    async (c) => {
      const { limit } = c.req.valid('query');
      const data = await postService.getUserActivity(limit);
      return sendSuccess(c, data, 'User activity data fetched successfully');
    }
  );

  postController.get('/charts/engagement-metrics', async (c) => {
    const data = await postService.getEngagementMetrics();
    return sendSuccess(c, data, 'Engagement metrics fetched successfully');
  });

  postController.get(
    '/charts/my-likes-by-month',
    auth,
    validateRequest('query', myLikesByMonthQuerySchema),
    async (c) => {
      const { months } = c.req.valid('query');
      const { user_id } = c.get('user');
      const data = await postService.getMyLikesByMonth(user_id, months);
      return sendSuccess(c, data, 'Monthly likes on your posts fetched successfully');
    }
  );

  postController.get(
    '/charts/engagement-comparison',
    validateRequest('query', chartLimitQuerySchema),
    async (c) => {
      const { limit } = c.req.valid('query');
      const data = await postService.getEngagementComparison(limit);
      return sendSuccess(c, data, 'Engagement comparison data fetched successfully');
    }
  );

  const deletePostHandler = async (c: any) => {
    const id = c.req.param('id');
    const authUser = c.get('user') as jwtPayload;
    const post = await postService.deletePost(id, authUser.user_id);
    return sendSuccess(c, post, 'Post deleted successfully');
  };

  const updatePostHandler = async (c: any) => {
    const id = c.req.param('id');
    const authUser = c.get('user') as jwtPayload;
    const body = c.req.valid('json');
    const post = await postService.updatePost(id, authUser.user_id, body);
    return sendSuccess(c, post, 'Post updated successfully');
  };

  postController.get('/me/:id', auth, validateRequest('param', postIdSchema), async (c) => {
    const id = c.req.param('id');
    const authUser = c.get('user');
    const post = await postService.getPostByIdForOwner(id, authUser.user_id);
    if (!post) {
      throw Errors.NotFound('Post');
    }
    return sendSuccess(c, post, 'Post fetched successfully');
  });

  postController.put(
    '/me/:id',
    auth,
    validateRequest('param', postIdSchema),
    validateRequest('json', updatePostSchema),
    updatePostHandler
  );

  postController.delete('/me/:id', auth, validateRequest('param', postIdSchema), deletePostHandler);

  postController.get('/:id', validateRequest('param', postIdSchema), async (c) => {
    const id = c.req.param('id');
    const post = await postService.getPost(id);
    if (!post) {
      throw Errors.NotFound('Post');
    }
    return sendSuccess(c, post, 'Post fetched successfully');
  });

  postController.post('/', auth, validateRequest('json', createPostSchema), async (c) => {
    const authUser = c.get('user');
    const body = c.req.valid('json');
    const post = await postService.addPost(authUser.user_id, body);
    return sendSuccess(c, post, 'Post created successfully', 201);
  });

  postController.patch(
    '/:id',
    auth,
    validateRequest('param', postIdSchema),
    validateRequest('json', updatePostSchema),
    updatePostHandler
  );

  postController.put(
    '/:id',
    auth,
    validateRequest('param', postIdSchema),
    validateRequest('json', updatePostSchema),
    updatePostHandler
  );

  postController.delete('/:id', auth, validateRequest('param', postIdSchema), deletePostHandler);

  postController.post(
    '/:id/view',
    createRateLimiter(60 * 1000, 60),
    optionalAuth,
    validateRequest('param', postIdSchema),
    async (c) => {
      const id = c.req.param('id');
      const user = c.get('user');
      const result = await postViewService.recordView(
        id,
        user?.user_id ?? null,
        getClientIp(c),
        c.req.header('User-Agent')
      );
      return sendSuccess(c, result, 'View recorded successfully');
    }
  );

  postController.get(
    '/:id/views',
    auth,
    validateRequest('param', postIdSchema),
    validateRequest('query', listPostsQuerySchema),
    async (c) => {
      const id = c.req.param('id');
      const q = c.req.valid('query');
      const { data, meta } = await postViewService.getViewsByPostId(id, q.limit, q.offset);
      return sendSuccess(c, data, 'Successfully retrieved post views', 200, meta);
    }
  );

  postController.get('/:id/view-stats', validateRequest('param', postIdSchema), async (c) => {
    const id = c.req.param('id');
    const stats = await postViewService.getViewStats(id);
    return sendSuccess(c, stats, 'Successfully retrieved view statistics');
  });

  postController.get('/:id/viewed', auth, validateRequest('param', postIdSchema), async (c) => {
    const id = c.req.param('id');
    const authUser = c.get('user');
    const hasViewed = await postViewService.hasUserViewed(id, authUser.user_id);
    return sendSuccess(c, { has_viewed: hasViewed }, 'Successfully checked view status');
  });

  // ---------------------------------------------------------------------------
  // Post Like Sub-routes
  // ---------------------------------------------------------------------------
  postController.post('/:id/like', auth, validateRequest('param', postIdSchema), async (c) => {
    if (!likeService) throw Errors.InternalServerError();
    const { id } = c.req.valid('param');
    const authUser = c.get('user');
    const result = await likeService.likePost(id, authUser.user_id);
    return sendSuccess(c, result, 'Post liked successfully', 200);
  });

  postController.delete('/:id/like', auth, validateRequest('param', postIdSchema), async (c) => {
    if (!likeService) throw Errors.InternalServerError();
    const { id } = c.req.valid('param');
    const authUser = c.get('user');
    const result = await likeService.unlikePost(id, authUser.user_id);
    return sendSuccess(c, result, 'Post unliked successfully', 200);
  });

  postController.get('/:id/likes', validateRequest('param', postIdSchema), async (c) => {
    if (!likeService) throw Errors.InternalServerError();
    const { id } = c.req.valid('param');
    const likes = await likeService.getLikes(id);
    return sendSuccess(c, likes, 'Successfully retrieved post likes');
  });

  postController.get('/:id/like-stats', validateRequest('param', postIdSchema), async (c) => {
    if (!likeService) throw Errors.InternalServerError();
    const { id } = c.req.valid('param');
    const stats = await likeService.getLikeStats(id);
    return sendSuccess(c, stats, 'Successfully retrieved like statistics');
  });

  postController.get('/:id/liked', auth, validateRequest('param', postIdSchema), async (c) => {
    if (!likeService) throw Errors.InternalServerError();
    const { id } = c.req.valid('param');
    const authUser = c.get('user');
    const result = await likeService.hasUserLiked(id, authUser.user_id);
    return sendSuccess(c, result, 'Successfully checked liked status');
  });

  // ---------------------------------------------------------------------------
  // Post Comments Sub-routes
  // ---------------------------------------------------------------------------
  postController.get(
    '/:id/comments',
    validateRequest('param', postIdSchema),
    validateRequest('query', listPostsQuerySchema),
    async (c) => {
      if (!commentService) throw Errors.InternalServerError();
      const { id } = c.req.valid('param');
      const q = c.req.valid('query');
      const { data, meta } = await commentService.getCommentsByPost(id, q.offset, q.limit);
      return sendSuccess(c, data, 'Successfully retrieved comments', 200, meta);
    }
  );

  postController.post(
    '/:id/comments',
    auth,
    validateRequest('param', postIdSchema),
    validateRequest('json', postCommentBodySchema),
    async (c) => {
      if (!commentService) throw Errors.InternalServerError();
      const { id } = c.req.valid('param');
      const authUser = c.get('user');
      const body = c.req.valid('json');
      const comment = await commentService.createComment(
        {
          post_id: id,
          text: body.text,
          parent_comment_id: body.parent_comment_id,
        },
        authUser.user_id
      );
      return sendSuccess(c, comment, 'Comment created successfully', 201);
    }
  );

  postController.put(
    '/:id/comments/:comment_id',
    auth,
    validateRequest('param', postCommentParamsSchema),
    validateRequest('json', updateCommentBodySchema),
    async (c) => {
      if (!commentService) throw Errors.InternalServerError();
      const { comment_id } = c.req.valid('param');
      const authUser = c.get('user');
      const body = c.req.valid('json');
      const updated = await commentService.updateComment(
        comment_id,
        { text: body.text },
        authUser.user_id
      );
      return sendSuccess(c, updated, 'Comment updated successfully');
    }
  );

  postController.delete(
    '/:id/comments/:comment_id',
    auth,
    validateRequest('param', postCommentParamsSchema),
    async (c) => {
      if (!commentService) throw Errors.InternalServerError();
      const { comment_id } = c.req.valid('param');
      const authUser = c.get('user');
      const deleted = await commentService.deleteComment(comment_id, authUser.user_id);
      return sendSuccess(c, deleted, 'Comment deleted successfully');
    }
  );

  postController.post(
    '/upload/presigned-url',
    auth,
    validateRequest('json', presignedUrlSchema),
    async (c) => {
      const authUser = c.get('user') as jwtPayload;
      const { contentType, filename, size } = c.req.valid('json');

      const mimeToExtension: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
      };

      const extension = mimeToExtension[contentType];
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const keyName = filename
        ? filename.replace(/[^a-zA-Z0-9.-]/g, '_')
        : `${timestamp}-${randomStr}`;
      const key = `posts/${authUser.user_id}/${keyName}.${extension}`;

      const s3 = getS3Helper();
      const presignedUrl = await s3.generatePresignedUrl(key, 300, {
        accessType: POST_UPLOAD_ACCESS_TYPE,
      }); // 5 minutes
      const publicUrl = s3.getPublicUrl(key, { accessType: POST_UPLOAD_ACCESS_TYPE });

      return sendSuccess(
        c,
        {
          presignedUrl,
          key,
          publicUrl,
          expiresIn: 300,
          maxSize: 1 * 1024 * 1024,
          requestedSize: size,
        },
        'Presigned URL generated successfully',
        201
      );
    }
  );

  const uploadImageHandler = async (c: any) => {
    const authUser = c.get('user') as jwtPayload;
    const formData = await c.req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      throw Errors.InvalidInput('image', 'No image file provided');
    }

    const MAX_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_SIZE) {
      throw Errors.InvalidInput(
        'image',
        `File size exceeds 1MB limit. Received: ${(file.size / 1024).toFixed(1)}KB`
      );
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw Errors.InvalidInput('image', 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP');
    }

    const mimeToExtension: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };

    const extension = mimeToExtension[file.type] || 'jpg';
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const key = `posts/${authUser.user_id}/${timestamp}-${randomStr}.${extension}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const s3 = getS3Helper();
    const url = await s3.uploadFile(key, buffer, { accessType: POST_UPLOAD_ACCESS_TYPE });

    return sendSuccess(c, { url }, 'Image uploaded successfully', 201);
  };

  postController.post('/upload/image', auth, uploadImageHandler);
  postController.post('/image', auth, uploadImageHandler);

  return postController;
};
