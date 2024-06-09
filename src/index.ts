import { app } from './server/app'
import setupRouter from './router'


setupRouter(app)

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch
}

