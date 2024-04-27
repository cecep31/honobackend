import { Hono } from 'hono'
import { Database } from './config/database'
import UserController from './controllers/userController'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})
const database = new Database();


app.route('/users', UserController)

export default app
