import { Hono } from "hono";
import { writerService, postService } from "../pkg/service";
import type { Variables } from "../types/context";
import { sendSuccess } from "../utils/response";
import { Errors } from "../utils/error";

export const writerController = new Hono<{ Variables: Variables }>()
  .get("/:username", async (c) => {
    const username = c.req.param("username");
    const user = await writerService.getWriterByUsername(username);
    if (!user) {
      throw Errors.NotFound("Writer");
    }
    return sendSuccess(c, user, "Writer profile fetched successfully");
  })
  .get("/:username/posts", async (c) => {
    const username = c.req.param("username");
    const { data, meta } = await postService.getPostsByUsername(username);
    return sendSuccess(c, data, "Writer posts fetched successfully", 200, meta);
  });
