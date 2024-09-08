import { Hono } from "hono";
import { writetservice, postservice } from "../pkg/service";

export const writerController = new Hono()
  .get("/:username", async (c) => {
    const username = c.req.param("username");
    const user = await writetservice.getWriterByUsername(username);
    if (!user) {
      return c.json({ message: "user not found" }, 404);
    }
    return c.json(user);
  })
  .get("/:username/posts", async (c) => {
    const username = c.req.param("username");
    const posts = await postservice.getPostsByUsername(username);
    return c.json(posts);
  });
