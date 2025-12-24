import { Hono } from "hono";
import { auth } from "../middlewares/auth";
import { BookmarkService } from "../pkg/services/bookmarkService";
import type { Variables } from "../types/context";

export const bookmarkController = new Hono<{ Variables: Variables }>();

bookmarkController.post("/:post_id", auth, async (c) => {
  const { post_id } = c.req.param();
  const { user_id } = c.get("user");
  return c.json(await BookmarkService.toggleBookmark(post_id, user_id));
});

bookmarkController.get("/", auth, async (c) => {
  const { user_id } = c.get("user");
  return c.json(await BookmarkService.getBookmarksByUser(user_id));
});
