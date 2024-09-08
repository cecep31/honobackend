import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { jwtPayload } from "../types/auth";

export const superAdmin = createMiddleware(async (c, next) => {
  const authorization = c.get("jwtPayload") as jwtPayload;
  if (authorization.issuperadmin) {
    await next();
  } else {
    throw new HTTPException(403, { message: "forbidden" });
  }
});
