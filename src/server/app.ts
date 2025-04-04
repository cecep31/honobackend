import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { timeout } from "hono/timeout";

export const app = new Hono()
  .use(timeout(30000))
  .get("/", async (c) => {
    return c.json({ message: "hello world" });
  })
  .onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json(
        {
          message: err.message,
          success: false,
          requestId: c.get("requestId") || "N/A",
        },
        err.status
      );
    }
    console.log(err);
    return c.json(
      {
        success: false,
        message: "internal server error",
      },
      500
    );
  });
