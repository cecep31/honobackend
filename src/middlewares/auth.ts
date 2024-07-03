import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { verify } from 'hono/jwt'
import { getSecret } from '../config/secret'

export const auth = createMiddleware(async (c, next) => {
    const authorization = c.req.header('Authorization')
    const token = authorization?.replace('Bearer ', '')
    console.log(getSecret.jwtsecret);
    
    
    try {
        const decodedPayload = await verify(token ?? '', getSecret.jwtsecret)
        c.set('jwtPayload', decodedPayload)
    } catch (error) {
        if (error instanceof Error) {
            throw new HTTPException(401, { message: "Invalid token" });
        }
    }
    await next()
})