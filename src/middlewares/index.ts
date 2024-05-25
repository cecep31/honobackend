import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'

function setupMiddlewares(app: Hono) {
    app.use(logger())
    app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173", "https://pilput.dev", "https://app.pilput.dev", "https://dash.pilput.dev"], }))
}

export default setupMiddlewares