import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import { getSecret } from "../config/secret";

export const auth = createMiddleware(async (c, next) => {
  const authorization = c.req.header("Authorization");
  const token = authorization?.replace("Bearer ", "");

  try {
    const decodedPayload = await verify(token ?? "", getSecret.jwt_secret);
    c.set("jwtPayload", decodedPayload);
  } catch (error) {
    if (error instanceof Error) {
      return c.json(
        {
          message: "Unauthorized",
          success: false,
          requestId: c.get("requestId") || "N/A",
        },
        401
      );
    }
  }
  await next();
});
