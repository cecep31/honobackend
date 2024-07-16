import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { pilputLogger } from "../middlewares/logger";
import { requestId } from "hono/request-id";

export const app = new Hono()
  .use(requestId())
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
  .get("/", async (c) => {
    return c.json({ message: "hello world" });
  })
  .onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ message: err.message }, err.status);
    }
    console.log(err);
    return c.json({ message: "internal server error" }, 500);
  });
