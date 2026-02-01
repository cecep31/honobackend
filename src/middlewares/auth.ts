import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import config from "../config";
import { Errors } from "../utils/error";
import type { Variables } from "../types/context";
import type { jwtPayload } from "../types/auth";

export const auth = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  try {
    const authorization = c.req.header("Authorization");

    if (!authorization) {
      c.res.headers.set("WWW-Authenticate", "Bearer");
      throw Errors.Unauthorized();
    }

    const parts = authorization.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      c.res.headers.set("WWW-Authenticate", 'Bearer error="invalid_token"');
      throw Errors.Unauthorized();
    }
    const token = parts[1];

    if (!token) {
      c.res.headers.set("WWW-Authenticate", 'Bearer error="invalid_token"');
      throw Errors.Unauthorized();
    }

    const payload = await verify(token, config.jwt.secret, "HS256");
    const userPayload = payload as unknown as jwtPayload;
    c.set("user", userPayload);
  } catch (error) {
    if (error instanceof Error && error.name === "ApiError") {
      throw error;
    }
    c.res.headers.set("WWW-Authenticate", 'Bearer error="invalid_token"');
    throw Errors.Unauthorized();
  }

  await next();
});
