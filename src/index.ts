import { Hono } from 'hono'
import setupRouter from './router'
import setupMiddlewares from './middlewares'

const app = new Hono()

app.get('/', async (c) => {
  return c.json({ "message": "hello world" })
})

setupMiddlewares(app)
setupRouter(app)

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch
}

