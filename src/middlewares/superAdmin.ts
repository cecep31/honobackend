import { createMiddleware } from 'hono/factory';
import type { AppServices } from '../services';
import { Errors } from '../utils/error';

type UserService = AppServices['userService'];

export const createSuperAdminMiddleware = (userService: UserService) =>
  createMiddleware(async (c, next) => {
    const auth = c.get('user');
    if (!auth) {
      throw Errors.Unauthorized();
    }
    const user = await userService.getUser(auth.user_id);

    if (user?.is_super_admin) {
      await next();
    } else {
      throw Errors.Forbidden();
    }
  });
