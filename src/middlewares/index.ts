import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { timeout } from "hono/timeout";
import { rateLimiter } from "hono-rate-limiter";

export function setupMiddlewares(app: Hono) {
  app.use(logger());
  app.use(
    cors({
      origin: [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://pilput.dev",
        "https://app.pilput.dev",
        "https://dash.pilput.dev",
      ],
    })
  );
  if (process.env["rate_limiter"] === "true") {
    app.use(
      rateLimiter({
        windowMs: 1 * 60 * 1000, // 1 minute
        limit: 300, // Limit each IP to 300 requests per `window` (here, per 1 minute).
        standardHeaders: "draft-6", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
        keyGenerator: (_c) => "<unique_key>", // Method to generate custom identifiers for clients.
      }));
  }
  app.use(timeout(30000));
}
