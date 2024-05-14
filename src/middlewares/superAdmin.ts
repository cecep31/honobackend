import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

export const superAdmin = createMiddleware(async (c, next) => {
    const authorization = c.get("jwtPayload") as jwtPayload
    if (authorization.isSuperAdmin) {
        await next()
    } else {
        throw new HTTPException(401, { message: "forbidden" })
    }
})