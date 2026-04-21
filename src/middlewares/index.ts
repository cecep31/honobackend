import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import type { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import { rateLimiter } from 'hono-rate-limiter';
import config, { bodyLimitConfig, originList, rateLimitConfig } from '../config';
import type { Variables } from '../types/context';
import { Errors } from '../utils/error';
import { getClientIp } from '../utils/request';
import { loggingMiddleware } from './logger';
import { CleanupStore } from '../utils/rateLimitStore';

// Store instance for rate limiter
let rateLimitStore: CleanupStore | null = null;

export function setupMiddlewares(app: Hono<{ Variables: Variables }>) {
  // Convert MB to bytes for bodyLimit
  const maxBodySizeBytes = bodyLimitConfig.maxSizeMB * 1024 * 1024;

  app
    .use(requestId())
    .use(loggingMiddleware)
    .use(
      bodyLimit({
        maxSize: maxBodySizeBytes,
        onError: (c) => {
          return c.json(
            {
              success: false,
              message: `Request body is too large. Maximum size is ${bodyLimitConfig.maxSizeMB}MB`,
            },
            413
          );
        },
      })
    )
    .use(
      cors({
        origin: originList,
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
        exposeHeaders: [
          'X-Request-ID',
          'RateLimit-Limit',
          'RateLimit-Remaining',
          'RateLimit-Reset',
        ],
        credentials: true,
        maxAge: 86400, // 24 hours preflight cache
      })
    );
  if (config.rateLimiterEnabled) {
    // Create store with automatic cleanup
    rateLimitStore = new CleanupStore(rateLimitConfig.windowMs);

    app.use(
      rateLimiter({
        windowMs: rateLimitConfig.windowMs, // 1 minute
        limit: rateLimitConfig.limit, // Limit each IP to 150 requests per `window` (here, per 1 minute) by default.
        standardHeaders: 'draft-6', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
        keyGenerator: (c) => getClientIp(c) || 'unknown',
        store: rateLimitStore,
        handler: () => {
          throw Errors.TooManyRequests(Math.ceil(rateLimitConfig.windowMs / 1000));
        },
      })
    );
  }
}

// Cleanup function for graceful shutdown
export function shutdownMiddlewares() {
  if (rateLimitStore) {
    rateLimitStore.shutdown();
    rateLimitStore = null;
  }
}
