import { Hono } from 'hono'
import { logger } from "hono/logger"
import setupRouter from './router'

const app = new Hono()

app.use(logger())
app.get('/', async (c) => {
  return c.json({"message": "hello world"})
})

setupRouter(app)

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch
}

