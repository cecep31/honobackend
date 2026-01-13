import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import config from "../config";

export const optionalAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    try {
      const payload = await verify(token, config.jwt.secret);
      c.set("jwtPayload", payload);
    } catch {
      // Silently fail - this is optional authentication
    }
  }

  await next();
});
