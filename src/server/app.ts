import { Hono } from "hono";
import { timeout } from "hono/timeout";
import { compress } from "hono/compress";
import { errorHandler } from "../middlewares/errorHandler";
import { setupMiddlewares } from "../middlewares";
import setupRouter from "../router";
import type { Variables } from "../types/context";
import { db } from "../database/drizzle";
import { sql } from "drizzle-orm";

// BigInt serialization fix for JSON.stringify
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export const app = new Hono<{ Variables: Variables }>();

// Initialize application
app.use(timeout(30000));
app.use(compress());
app.onError(errorHandler());

// Setup middlewares and routes
setupMiddlewares(app);
setupRouter(app);

app.get("/", async (c) => {
  return c.json({ message: "hello world" });
});

/**
 * Health check endpoint for monitoring and load balancing
 * Returns database connection status
 */
app.get("/health", async (c) => {
  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);
    
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return c.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "disconnected",
      },
      error: errorMessage,
    }, 503);
  }
});

/**
 * Readiness probe endpoint
 * Checks if the application is ready to accept traffic
 */
app.get("/ready", async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    }, 503);
  }
});
