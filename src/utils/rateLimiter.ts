import { rateLimiter } from 'hono-rate-limiter';
import { Errors } from './error';
import { getClientIp } from './request';

export function createRateLimiter(windowMs: number, limit: number) {
  return rateLimiter({
    windowMs,
    limit,
    standardHeaders: 'draft-6',
    keyGenerator: (c) => getClientIp(c) || 'unknown',
    handler: () => {
      throw Errors.TooManyRequests(Math.ceil(windowMs / 1000));
    },
  });
}
