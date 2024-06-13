import { Hono } from "hono"
import { TagService } from "../pkg/services/tagService"

export const tagController = new Hono()
    .get("/", async (c) => {
        return c.json(await TagService.getTags())
    })
