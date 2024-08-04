import { Hono } from "hono";
import { TagService } from "../pkg/services/tagService";

const tagservice = new TagService();

export const tagController = new Hono().get("/", async (c) => {
  return c.json(await tagservice.getTags());
});
