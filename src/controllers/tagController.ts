import { Hono } from "hono";
import { tagService } from "../pkg/service";

export const tagController = new Hono();

tagController.get("/", async (c) => {
  try {
    const tags = await tagService.getTags();
    return c.json(tags);
  } catch (error) {
    return c.json({ error: "Failed to fetch tags" }, 500);
  }
});
