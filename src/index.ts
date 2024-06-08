import { app } from './server/app'
import setupRouter from './router'
import setupMiddlewares from './middlewares'

setupMiddlewares(app)
setupRouter(app)

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch
}

