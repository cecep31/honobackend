import { Hono } from 'hono'
import UserController from '../controllers/userController'
import AuthController from '../controllers/authController'
import PostController from '../controllers/postController'

const setupRouter = (app: Hono) => {
    app.route('/users', UserController)
    app.route('/auth', AuthController)
    app.route('/posts', PostController)
}

export default setupRouter