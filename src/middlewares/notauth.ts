import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'

export const notAuth = createMiddleware(async (c, next) => {
    const authorization = c.req.header('Authorization')
    const token = authorization?.replace('Bearer ', '')
    const secretKey = process.env.JWT_KEY!

    try {
        const decodedPayload = await verify(token ?? '', secretKey)
        c.set('jwtPayload', decodedPayload)
    } catch (error) {
        console.log(error);
        
        console.log("not auth");
        
    }
    await next()
})