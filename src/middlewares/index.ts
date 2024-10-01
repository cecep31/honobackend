import type { Hono } from "hono";
import { cors } from "hono/cors";
import { rateLimiter } from "hono-rate-limiter";
import { requestId } from "hono/request-id";
import { pilputLogger } from "./logger";

export function setupMiddlewares(app: Hono) {
  app.use(requestId())
    .use(pilputLogger)
    .use(
      cors({
        origin: [
          "http://localhost:3000",
          "http://localhost:5173",
          "https://pilput.dev",
          "https://www.pilput.dev",
          "https://app.pilput.dev",
          "https://dash.pilput.dev",
        ],
      })
    )
  if (process.env["RATE_LIMITER"] === "true") {
    app.use(
      rateLimiter({
        windowMs: 1 * 60 * 1000, // 1 minute
        limit: 150, // Limit each IP to 300 requests per `window` (here, per 1 minute).
        standardHeaders: "draft-6", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
        keyGenerator: (_c) => "<unique_key>", // Method to generate custom identifiers for clients.
      }));
  }
}
