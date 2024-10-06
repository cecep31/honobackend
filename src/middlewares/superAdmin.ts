import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { jwtPayload } from "../types/auth";
import { userrepository } from "../pkg/repository";

export const superAdminMiddleware = createMiddleware(async (c, next) => {
  const auth = c.get("jwtPayload") as jwtPayload;
  const user = await userrepository.getUser(auth.id);

  if (user?.issuperadmin) {
    await next();
  } else {
    throw new HTTPException(403, { message: "Forbidden" });
  }
});
