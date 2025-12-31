import type { Hono } from "hono";
import { cors } from "hono/cors";
import { rateLimiter, type Store, type ClientRateLimitInfo } from "hono-rate-limiter";
import { requestId } from "hono/request-id";
import { pilputLogger } from "./logger";
import config, { originList, rateLimitConfig } from "../config";
import type { Variables } from "../types/context";

// Memory-safe rate limit store with automatic cleanup
class CleanupStore implements Store {
  private clients = new Map<string, { totalHits: number; resetTime: Date }>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
    // Run cleanup every window period to prevent memory growth
    this.cleanupInterval = setInterval(() => this.cleanup(), windowMs);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.clients) {
      if (value.resetTime.getTime() <= now) {
        this.clients.delete(key);
      }
    }
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const client = this.clients.get(key);
    if (!client) return undefined;
    
    // Check if expired
    if (client.resetTime.getTime() <= Date.now()) {
      this.clients.delete(key);
      return undefined;
    }
    
    return { totalHits: client.totalHits, resetTime: client.resetTime };
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = Date.now();
    const client = this.clients.get(key);
    
    if (client && client.resetTime.getTime() > now) {
      client.totalHits++;
      return { totalHits: client.totalHits, resetTime: client.resetTime };
    }
    
    const resetTime = new Date(now + this.windowMs);
    this.clients.set(key, { totalHits: 1, resetTime });
    return { totalHits: 1, resetTime };
  }

  async decrement(key: string): Promise<void> {
    const client = this.clients.get(key);
    if (client && client.totalHits > 0) {
      client.totalHits--;
    }
  }

  async resetKey(key: string): Promise<void> {
    this.clients.delete(key);
  }

  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clients.clear();
  }
}

// Store instance for rate limiter
let rateLimitStore: CleanupStore | null = null;

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
    // Create store with automatic cleanup
    rateLimitStore = new CleanupStore(rateLimitConfig.windowMs);
    
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
        store: rateLimitStore,
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
