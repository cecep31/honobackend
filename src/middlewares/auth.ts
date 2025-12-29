import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import config from "../config";
import { Errors } from "../utils/error";

export const auth = createMiddleware(async (c, next) => {
  try {
    const authorization = c.req.header("Authorization");

    if (!authorization) {
      c.res.headers.set("WWW-Authenticate", "Bearer");
      throw Errors.Unauthorized();
    }

    const token = authorization.replace("Bearer ", "");

    if (!token) {
      c.res.headers.set("WWW-Authenticate", 'Bearer error="invalid_token"');
      throw Errors.Unauthorized();
    }

    const decodedPayload = await verify(token, config.jwt.secret);
    c.set("user", decodedPayload);

    await next();
  } catch (error) {
    if (error instanceof Error && error.name === "ApiError") {
      throw error;
    }
    c.res.headers.set("WWW-Authenticate", 'Bearer error="invalid_token"');
    throw Errors.Unauthorized();
  }
});
