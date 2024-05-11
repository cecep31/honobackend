import { Hono } from 'hono'
import { logger } from "hono/logger"
import { compress } from 'hono/compress'
import UserController from './controllers/userController'
import AuthController from './controllers/authController'
import PostController from './controllers/postController'

const app = new Hono()

app.use(logger())
// app.use(compress())
app.get('/', async (c) => {
  return c.json({"message": "hello world"})
})
// app.route('/users', UserController)
app.route('/auth', AuthController)
app.route('/posts', PostController)

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch
}

