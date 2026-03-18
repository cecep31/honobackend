import { createMiddleware } from 'hono/factory';
import type { Variables } from '../types/context';
import { ApiError, Errors } from '../utils/error';
import { getBearerToken, verifyJwtToken } from './authToken';

export const auth = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  try {
    const parsedToken = getBearerToken(c.req.header('Authorization'));

    if (!parsedToken.hasAuthorizationHeader) {
      c.res.headers.set('WWW-Authenticate', 'Bearer');
      throw Errors.Unauthorized();
    }

    if (!parsedToken.isBearerFormatValid || !parsedToken.token) {
      c.res.headers.set('WWW-Authenticate', 'Bearer error="invalid_token"');
      throw Errors.Unauthorized();
    }

    const userPayload = await verifyJwtToken(parsedToken.token);
    c.set('user', userPayload);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    c.res.headers.set('WWW-Authenticate', 'Bearer error="invalid_token"');
    throw Errors.Unauthorized();
  }

  await next();
});
