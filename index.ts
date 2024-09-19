import { app } from './src/server/app'
import setupRouter from './src/router'

setupRouter(app)

export default {
  port: process.env['PORT'] || 3001,
  fetch: app.fetch
}

