import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import { getSecret } from "../config/secret";

export const auth = createMiddleware(async (c, next) => {

  try {
    const authorization = c.req.header("Authorization");

    if (!authorization) {
      return c.json(
        {
          message: "No authorization header found",
          success: false,
          requestId: c.get("requestId") || "N/A",
        },
        401
      );
    }

    const token = authorization.replace("Bearer ", "");

    if (!token) {
      return c.json(
        {
          message: "No token provided",
          success: false,
          requestId: c.get("requestId") || "N/A",
        },
        401
      );
    }

    const decodedPayload = await verify(token, getSecret.jwt_secret);
    c.set("user", decodedPayload);

    await next();
  } catch (error) {
    return c.json(
      {
        message: "Unauthorized",
        success: false,
        requestId: c.get("requestId") || "N/A",
      },
      401
    );


  }
});
