import { Hono } from 'hono'
import { logger } from "hono/logger"
import { compress } from 'hono/compress'
import UserController from './controllers/userController'

const app = new Hono()

app.use(logger())
app.use(compress())
app.get('/', (c) => {
  return c.text('Hello Hono!')
})
app.route('/users', UserController)

export default {
  port: 3001,
  fetch: app.fetch
}

