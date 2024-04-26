import { Hono } from 'hono'
import { UserController } from './controllers/userController'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})
const usercontroller = new UserController()
app.route('/user', usercontroller.newRouter())

export default app
