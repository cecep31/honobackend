import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import config from "../config";

export const auth = createMiddleware(async (c, next) => {
  try {
    const authorization = c.req.header("Authorization");

    if (!authorization) {
      c.res.headers.set("WWW-Authenticate", "Bearer");
      return c.json(
        {
          success: false,
          message: "Authorization header missing",
          requestId: c.get("requestId") || "N/A",
        },
        401
      );
    }

    const token = authorization.replace("Bearer ", "");

    if (!token) {
      c.res.headers.set("WWW-Authenticate", 'Bearer error="invalid_token"');
      return c.json(
        {
          success: false,
          message: "Token not provided",
          requestId: c.get("requestId") || "N/A",
        },
        401
      );
    }

    const decodedPayload = await verify(token, config.jwt.secret);
    c.set("user", decodedPayload);

    await next();
  } catch (error) {
    c.res.headers.set("WWW-Authenticate", 'Bearer error="invalid_token"');
    return c.json(
      {
        success: false,
        message: "Unauthorized",
        requestId: c.get("requestId") || "N/A",
      },
      401
    );
  }
});
