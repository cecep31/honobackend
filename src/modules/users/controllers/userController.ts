import { Hono } from 'hono';
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

export const createUserController = (userService: UserService) => {
  const superAdminMiddleware = createSuperAdminMiddleware(userService);

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
    .get('/:id', auth, validateRequest('param', userIdSchema), async (c) => {
      const params = c.req.valid('param');
      const user = await userService.getUser(params.id);

      if (!user) {
        throw Errors.NotFound('User');
      }

      return sendSuccess(c, user, 'User fetched successfully');
    })
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
      auth,
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
      auth,
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
    .get('/:id/is-following', auth, validateRequest('param', userIdSchema), async (c) => {
      const authUser = c.get('user');
      const { id: following_id } = c.req.valid('param');
      const isFollowing = await userService.isFollowing(authUser.user_id, following_id);
      return sendSuccess(c, { isFollowing }, 'Follow status checked successfully');
    });
};
