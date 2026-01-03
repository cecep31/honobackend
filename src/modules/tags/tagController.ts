import { Hono } from "hono";
import { tagService } from "../../pkg/service";
import type { Variables } from "../../types/context";
import { sendSuccess } from "../../utils/response";

export const tagController = new Hono<{ Variables: Variables }>();

tagController.get("/", async (c) => {
  const tags = await tagService.getTags();
  return sendSuccess(c, tags, "Tags fetched successfully");
});
