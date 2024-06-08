import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

export const app = new Hono()
    .use(logger())
    .use(cors({ origin: ["http://localhost:3000", "http://localhost:5173", "https://pilput.dev", "https://app.pilput.dev", "https://dash.pilput.dev"], }))
    .get('/', async (c) => {
        return c.json({ "message": "hello world" })
    })