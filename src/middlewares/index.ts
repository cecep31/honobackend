import type { Hono } from "hono";
import { cors } from "hono/cors";
import { rateLimiter } from "hono-rate-limiter";
import { requestId } from "hono/request-id";
import { pilputLogger } from "./logger";
import config, { originList, rateLimitConfig } from "../config";
import type { Variables } from "../types/context";

export function setupMiddlewares(app: Hono<{ Variables: Variables }>) {
  app
    .use(requestId())
    .use(pilputLogger)
    .use(
      cors({
        origin: originList,
      })
    );
  if (config.rateLimiter) {
    app.use(
      rateLimiter({
        windowMs: rateLimitConfig.windowMs, // 1 minute
        limit: rateLimitConfig.limit, // Limit each IP to 300 requests per `window` (here, per 1 minute).
        standardHeaders: "draft-6", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
        keyGenerator: (c) =>
          c.req.header("x-forwarded-for") ||
          c.req.header("x-real-ip") ||
          c.req.header("cf-connecting-ip") ||
          "unknown",
      })
    );
  }
}
