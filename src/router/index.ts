import { Hono } from 'hono'
import { userController } from '../controllers/userController'
import { authController } from '../controllers/authController'
import { postController } from '../controllers/postController'

const setupRouter = (app: Hono) => {
    app.route('/users', userController)
    app.route('/auth', authController)
    app.route('/posts', postController)
}

export default setupRouter