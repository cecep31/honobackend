import { app } from './src/server/app'
import setupRouter from './src/router'
import { setupMiddlewares } from './src/middlewares'

setupMiddlewares(app)
setupRouter(app)

export default {
  port: process.env['PORT'] || 3001,
  fetch: app.fetch
}

