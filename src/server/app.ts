import { Hono } from "hono";
import { timeout } from "hono/timeout";
import { errorHandler } from "../middlewares/errorHandler";

export const app = new Hono()
  .use(timeout(30000))
  .get("/", async (c) => {
    return c.json({ message: "hello world" });
  })
  .onError(errorHandler());
