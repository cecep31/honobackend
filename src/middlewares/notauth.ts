import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import config from '../config'

export const notAuth = createMiddleware(async (c, next) => {
    const authorization = c.req.header('Authorization')
    const token = authorization?.replace('Bearer ', '')

    try {
        const decodedPayload = await verify(token ?? '', config.jwt.secret)
        c.set('jwtPayload', decodedPayload)
    } catch (error) {
        // console.log("non authenticated");
    }
    await next()
})