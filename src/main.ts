import { Hono } from 'hono'
import { logger } from "hono/logger"
import { compress } from 'hono/compress'
import UserController from './controllers/userController'
import { PrismaClient } from '@prisma/client'
import { Database } from './config/database'
import auth from './controllers/authController'

const app = new Hono()
const prisma = new PrismaClient()

const prismac = new Database()

app.use(logger())
// app.use(compress())
app.get('/', async (c) => {
  const posts = await prismac.client.posts.findMany()
  return c.json(posts)
})
app.route('/users', UserController)
app.route('/auth', auth)

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch
}

