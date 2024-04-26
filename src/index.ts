import { Hono } from 'hono'
import { UserController } from './controllers/userController'
import { Database } from './config/database'
import UserService from './pkg/services/userServices'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})
const database = new Database();

const userService = new UserService(database)
const usercontroller = new UserController(userService)
app.route('/user', usercontroller.newRouter())

export default app
