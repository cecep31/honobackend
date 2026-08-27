import { Hono } from 'hono';
import { z } from 'zod';
import { auth } from '../../../middlewares/auth';
import { createSuperAdminMiddleware } from '../../../middlewares/superAdmin';
import { validateRequest } from '../../../middlewares/validateRequest';
import type { AppServices } from '../../../services';
import type { Variables } from '../../../types/context';
import { Errors } from '../../../utils/error';
import { sendSuccess } from '../../../utils/response';
import {
  createUserSchema,
  listUsersQuerySchema,
  meQuerySchema,
  updateProfileSchema,
  updateUserImageSchema,
  updateUserSchema,
  userIdSchema,
  usernameParamSchema,
} from '../validation';

type UserService = AppServices['userService'];

const followUserBodySchema = z
  .object({
    user_id: z.string().uuid().optional(),
    following_id: z.string().uuid().optional(),
  })
  .refine((data) => Boolean(data.user_id || data.following_id), {
    message: 'user_id or following_id is required',
  });

export const createUserController = (userService: UserService) => {
  const superAdminMiddleware = createSuperAdminMiddleware(userService);

  const checkFollowStatusHandler = async (c: any) => {
    const authUser = c.get('user');
    const { id: following_id } = c.req.valid('param');
    const isFollowing = await userService.isFollowing(authUser.user_id, following_id);
    return sendSuccess(
      c,
      { is_following: isFollowing, isFollowing },
      'Follow status checked successfully'
    );
  };

  return new Hono<{ Variables: Variables }>()
    .get(
      '/',
      auth,
      superAdminMiddleware,
      validateRequest('query', listUsersQuerySchema),
      async (c) => {
        const q = c.req.valid('query');
        const params = {
          offset: q.offset,
          limit: q.limit,
          search: q.search ?? q.q,
          orderBy: q.orderBy,
          orderDirection: q.orderDirection,
        };
        const { data, meta } = await userService.getUsers(params);
        return sendSuccess(c, data, 'Users fetched successfully', 200, meta);
      }
    )
    .get('/me', auth, validateRequest('query', meQuerySchema), async (c) => {
      const authUser = c.get('user');
      const { profile } = c.req.valid('query');
      const user = await userService.getUserMe(authUser.user_id, profile);

      if (!user) {
        throw Errors.NotFound('User');
      }

      return sendSuccess(c, user, 'User profile fetched successfully');
    })
    .patch('/me/profile', auth, validateRequest('json', updateProfileSchema), async (c) => {
      const authUser = c.get('user');
      const body = c.req.valid('json');
      const profile = await userService.updateProfile(authUser.user_id, body);
      return sendSuccess(c, profile, 'Profile updated successfully');
    })
    .patch('/me', auth, validateRequest('json', updateUserSchema), async (c) => {
      const authUser = c.get('user');
      const body = c.req.valid('json');
      await userService.updateUser(authUser.user_id, body);
      return sendSuccess(c, null, 'User updated successfully');
    })
    .patch('/me/image', auth, validateRequest('form', updateUserImageSchema), async (c) => {
      const authUser = c.get('user');
      const { image } = c.req.valid('form');
      const updatedUser = await userService.updateUserImage(authUser.user_id, image);
      return sendSuccess(c, updatedUser, 'Profile image updated successfully');
    })
    .get('/username/:username', validateRequest('param', usernameParamSchema), async (c) => {
      const params = c.req.valid('param');
      const user = await userService.getUserByUsername(params.username);

      if (!user) {
        throw Errors.NotFound('User');
      }

      return sendSuccess(c, user, 'User fetched successfully');
    })
    .get(
      '/:id',
      auth,
      superAdminMiddleware,
      validateRequest('param', userIdSchema),
      async (c) => {
        const params = c.req.valid('param');
        const user = await userService.getUser(params.id);

        if (!user) {
          throw Errors.NotFound('User');
        }

        return sendSuccess(c, user, 'User fetched successfully');
      }
    )
    .post('/', auth, superAdminMiddleware, validateRequest('json', createUserSchema), async (c) => {
      const body = c.req.valid('json');
      const user = await userService.addUser(body);
      return sendSuccess(c, user, 'User created successfully', 201);
    })
    .patch(
      '/:id',
      auth,
      superAdminMiddleware,
      validateRequest('param', userIdSchema),
      validateRequest('json', updateUserSchema),
      async (c) => {
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        const user = await userService.updateUser(id, body);
        return sendSuccess(c, user, 'User updated successfully');
      }
    )
    .delete(
      '/:id',
      auth,
      superAdminMiddleware,
      validateRequest('param', userIdSchema),
      async (c) => {
        const { id } = c.req.valid('param');
        const user = await userService.deleteUser(id);
        return sendSuccess(c, user, 'User deleted successfully');
      }
    )
    .post('/follow', auth, validateRequest('json', followUserBodySchema), async (c) => {
      const authUser = c.get('user');
      const body = c.req.valid('json');
      const targetId = (body.user_id || body.following_id)!;

      if (authUser.user_id === targetId) {
        throw Errors.BusinessRuleViolation('Cannot follow yourself');
      }

      const follow = await userService.followUser(authUser.user_id, targetId);
      return sendSuccess(c, follow, 'User followed successfully', 201);
    })
    .post('/:id/follow', auth, validateRequest('param', userIdSchema), async (c) => {
      const authUser = c.get('user');
      const { id: following_id } = c.req.valid('param');

      if (authUser.user_id === following_id) {
        throw Errors.BusinessRuleViolation('Cannot follow yourself');
      }

      const follow = await userService.followUser(authUser.user_id, following_id);
      return sendSuccess(c, follow, 'User followed successfully', 201);
    })
    .delete('/:id/follow', auth, validateRequest('param', userIdSchema), async (c) => {
      const authUser = c.get('user');
      const { id: following_id } = c.req.valid('param');
      const unfollow = await userService.unfollowUser(authUser.user_id, following_id);
      return sendSuccess(c, unfollow, 'User unfollowed successfully');
    })
    .get(
      '/:id/followers',
      validateRequest('param', userIdSchema),
      validateRequest('query', listUsersQuerySchema),
      async (c) => {
        const { id } = c.req.valid('param');
        const q = c.req.valid('query');
        const params = {
          offset: q.offset,
          limit: q.limit,
          search: q.search ?? q.q,
          orderBy: q.orderBy,
          orderDirection: q.orderDirection,
        };
        const { data, meta } = await userService.getFollowers(id, params);
        return sendSuccess(c, data, 'Followers fetched successfully', 200, meta);
      }
    )
    .get(
      '/:id/following',
      validateRequest('param', userIdSchema),
      validateRequest('query', listUsersQuerySchema),
      async (c) => {
        const { id } = c.req.valid('param');
        const q = c.req.valid('query');
        const params = {
          offset: q.offset,
          limit: q.limit,
          search: q.search ?? q.q,
          orderBy: q.orderBy,
          orderDirection: q.orderDirection,
        };
        const { data, meta } = await userService.getFollowing(id, params);
        return sendSuccess(c, data, 'Following fetched successfully', 200, meta);
      }
    )
    .get('/:id/follow-stats', validateRequest('param', userIdSchema), async (c) => {
      const { id } = c.req.valid('param');
      const stats = await userService.getFollowStats(id);
      return sendSuccess(c, stats, 'Follow statistics fetched successfully');
    })
    .get('/:id/mutual-follows', auth, validateRequest('param', userIdSchema), async (c) => {
      const authUser = c.get('user');
      const { id } = c.req.valid('param');
      const mutuals = await userService.getMutualFollows(authUser.user_id, id);
      return sendSuccess(c, mutuals, 'Mutual follows fetched successfully');
    })
    .get(
      '/:id/is-following',
      auth,
      validateRequest('param', userIdSchema),
      checkFollowStatusHandler
    )
    .get(
      '/:id/follow-status',
      auth,
      validateRequest('param', userIdSchema),
      checkFollowStatusHandler
    )
    .post(
      '/:id/restore',
      auth,
      superAdminMiddleware,
      validateRequest('param', userIdSchema),
      async (c) => {
        const { id } = c.req.valid('param');
        const user = await userService.restoreUser(id);
        return sendSuccess(c, user, 'User restored successfully');
      }
    );
};
