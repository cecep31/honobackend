import { Hono } from "hono";
import { tagService } from "../pkg/service";

export const tagController = new Hono();

tagController.get("/", async (c) => {
  try {
    const tags = await tagService.getTags();
    return c.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    return c.json({ success: false, error: "Failed to fetch tags" }, 500);
  }
});
