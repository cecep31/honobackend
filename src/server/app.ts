import { Hono } from "hono"

export const app = new Hono()
    .get('/', async (c) => {
        return c.json({ "message": "hello world" })
    })