import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { jwtPayload } from "../types/auth";
import { UserRepository } from "../pkg/repository/userRepository";

export const superAdmin = createMiddleware(async (c, next) => {
  const authorization = c.get("jwtPayload") as jwtPayload;
  const userRepo = new UserRepository();
  const user = await userRepo.getUser(authorization.id);
  if (user?.issuperadmin) {
    await next();
  } else {
    throw new HTTPException(403, { message: "forbidden" });
  }
});
