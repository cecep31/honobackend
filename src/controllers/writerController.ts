import { Hono } from "hono";
import { WritetService } from "../pkg/services/writerService";

const writetservice = new WritetService();

export const writerController = new Hono().get("/:username", async (c) => {
  const username = c.req.param("username");
  const user = await writetservice.getWriterByUsername(username);
  if (!user) {
    return c.json({ message: "user not found" }, 404);
  }
  return c.json(user);
});
