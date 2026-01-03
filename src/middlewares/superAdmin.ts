import { createMiddleware } from "hono/factory";
import { userService } from "../services/index";
import { Errors } from "../utils/error";

export const superAdminMiddleware = createMiddleware(async (c, next) => {
  const auth = c.get("user");
  if (!auth) {
    throw Errors.Unauthorized();
  }
  const user = await userService.getUser(auth.user_id);

  if (user?.is_super_admin) {
    await next();
  } else {
    throw Errors.Forbidden();
  }
});
