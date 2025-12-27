import { Hono } from "hono";
import { auth } from "../middlewares/auth";
import { likeService } from "../pkg/service";
import type { Variables } from "../types/context";

export const likeController = new Hono<{ Variables: Variables }>();

likeController.post("/:post_id", auth, async (c) => {
  const { post_id } = c.req.param();
  const { user_id } = c.get("user");
  return c.json(await likeService.updateLike(post_id, user_id));
});
likeController.get("/:post_id", auth, async (c) => {
  const post_id = c.req.param("post_id");
  return c.json(await likeService.getLikes(post_id));
});
