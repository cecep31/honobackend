import { Hono } from "hono";
import { writetService, postService } from "../pkg/service";

export const writerController = new Hono()
  .get("/:username", async (c) => {
    const username = c.req.param("username");
    const user = await writetService.getWriterByUsername(username);
    if (!user) {
      return c.json({ message: "user not found" }, 404);
    }

    return c.json({ success: true, data: user, message: "User fetched" });
  })
  .get("/:username/posts", async (c) => {
    const username = c.req.param("username");
    const posts = await postService.getPostsByUsername(username);
    return c.json(posts);
  });
