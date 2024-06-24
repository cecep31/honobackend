import { Hono } from 'hono'
import { userController } from '../controllers/userController'
import { authController } from '../controllers/authController'
import { postController } from '../controllers/postController'
import { tagController } from '../controllers/tagController'
import { likeController } from '../controllers/likeCotroller'

const setupRouter = (app: Hono) => {
    app.route("/tags", tagController)
    app.route('/users', userController)
    app.route('/auth', authController)
    app.route('/posts', postController)
    app.route('/likes', likeController)
}

export default setupRouter