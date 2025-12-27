import { Hono } from "hono";
import { timeout } from "hono/timeout";
import { errorHandler } from "../middlewares/errorHandler";
import { setupMiddlewares } from "../middlewares";
import setupRouter from "../router";

export const app = new Hono();

// Initialize application
app.use(timeout(30000));
app.onError(errorHandler());

// Setup middlewares and routes
setupMiddlewares(app);
setupRouter(app);

app.get("/", async (c) => {
  return c.json({ message: "hello world" });
});
