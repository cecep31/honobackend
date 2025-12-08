import { Hono } from "hono";
import { writerService, postService } from "../pkg/service";

export const writerController = new Hono()
  .get("/:username", async (c) => {
    const username = c.req.param("username");
    const user = await writerService.getWriterByUsername(username);
    if (!user) {
      return c.json({ success: false, message: "user not found", requestId: c.get("requestId") || "N/A" }, 404);
    }

    return c.json({ success: true, data: user, message: "User fetched", requestId: c.get("requestId") || "N/A" });
  })
  .get("/:username/posts", async (c) => {
    const username = c.req.param("username");
    const posts = await postService.getPostsByUsername(username);
    return c.json({
      success: true,
      data: posts.data,
      meta: posts.meta,
      message: "Posts fetched",
      requestId: c.get("requestId") || "N/A",
    });
  });
