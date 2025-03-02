import { app } from "../server/app";
import { cors } from "hono/cors";
import { rateLimiter } from "hono-rate-limiter";
import { requestId } from "hono/request-id";
import { pilputLogger } from "./logger";
import { originList, rateLimitConfig } from "../config";

export function setupMiddlewares() {
  app
    .use(requestId())
    .use(pilputLogger)
    .use(
      cors({
        origin: originList,
      })
    );
  if (process.env["RATE_LIMITER"] === "true") {
    app.use(
      rateLimiter({
        windowMs: rateLimitConfig.windowMs, // 1 minute
        limit: rateLimitConfig.limit, // Limit each IP to 300 requests per `window` (here, per 1 minute).
        standardHeaders: "draft-6", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
        keyGenerator: (_c) => "<unique_key>", // Method to generate custom identifiers for clients.
      })
    );
  }
}
