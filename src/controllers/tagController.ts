import { Hono } from "hono";
import { tagservice } from "../pkg/service";

export const tagController = new Hono().get("/", async (c) => {
  return c.json(await tagservice.getTags());
});
