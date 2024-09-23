import { Hono } from "hono";
import { tagservice } from "../pkg/service";

export const tagController = new Hono();

tagController.get("/", async (c) => {
  try {
    const tags = await tagservice.getTags();
    return c.json(tags);
  } catch (error) {
    return c.json({ error: "Failed to fetch tags" }, 500);
  }
});
