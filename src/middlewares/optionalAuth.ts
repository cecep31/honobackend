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

  if (!authorization) {
    await next();
    return;
  }

  const parts = authorization.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    await next();
    return;
  }

  const token = parts[1];
  if (!token) {
    await next();
    return;
  }

  try {
    const payload = await verify(token, config.jwt.secret, "HS256");
    const userPayload = payload as unknown as jwtPayload;
    c.set("user", userPayload);
  } catch {
    // Silently fail - token verification is optional
  }

  await next();
});
