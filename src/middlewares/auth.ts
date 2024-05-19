import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { verify } from 'hono/jwt'

export const auth = createMiddleware(async (c, next) => {
    const authorization = c.req.header('Authorization')
    const token = authorization?.replace('Bearer ', '')
    const secretKey = process.env.JWT_KEY!
    
    try {
        const decodedPayload = await verify(token ?? '', secretKey)
        c.set('jwtPayload', decodedPayload)
    } catch (error) {
        if (error instanceof Error) {
            throw new HTTPException(401, { message: "Invalid token" });
        }
    }
    await next()
})