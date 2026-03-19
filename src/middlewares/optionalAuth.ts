import { createMiddleware } from 'hono/factory';
import type { Variables } from '../types/context';
import { getBearerToken, verifyJwtToken } from '../utils/auth';

/**
 * Optional authentication middleware.
 * Attempts to verify JWT token if present, but does not require it.
 * Sets `user` context variable if token is valid.
 */
export const optionalAuth = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const parsedToken = getBearerToken(c.req.header('Authorization'));

  if (!parsedToken.token) {
    await next();
    return;
  }

  try {
    const userPayload = await verifyJwtToken(parsedToken.token);
    c.set('user', userPayload);
  } catch {
    // Silently fail - token verification is optional
  }

  await next();
});
