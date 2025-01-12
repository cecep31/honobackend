import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { userrepository } from "../pkg/repository";

export const superAdminMiddleware = createMiddleware(async (c, next) => {
  const auth = c.get("user");
  if (!auth) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  const user = await userrepository.getUser(auth.user_id);

  if (user?.issuperadmin) {
    await next();
  } else {
    throw new HTTPException(403, { message: "Forbidden" });
  }
});
