import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import config from "../config";
import type { jwtPayload } from "../types/auth";
import type { Variables } from "../types/context";

/**
 * Optional authentication middleware.
 * Attempts to verify JWT token if present, but does not require it.
 * Sets `user` context variable if token is valid.
 */
export const optionalAuth = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const authorization = c.req.header("Authorization");

  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7);

    if (token) {
      try {
        const payload = await verify(token, config.jwt.secret);
        const userPayload = payload as unknown as jwtPayload;
        c.set("user", userPayload);
      } catch {
        // Silently fail - token verification is optional
      }
    }
  }

  await next();
});
