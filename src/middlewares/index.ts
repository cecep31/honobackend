import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { timeout } from 'hono/timeout'

function setupMiddlewares(app: Hono) {
    app.use(logger())
    app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173", "https://pilput.dev", "https://app.pilput.dev", "https://dash.pilput.dev"], }))
    app.use(timeout(10000))
}

export default setupMiddlewares