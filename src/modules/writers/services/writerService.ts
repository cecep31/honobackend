import { and, eq, isNull } from "drizzle-orm";
import { Errors } from "../../../utils/error";
import { db } from "../../../database/drizzle";
import { users as usersModel } from "../../../database/schemas/postgre/schema";

const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/;

export class WriterService {
  async getWriterByUsername(username: string) {
    if (!usernameRegex.test(username)) {
      throw Errors.InvalidInput("username", "Username format is not valid");
    }
    return await db.query.users.findFirst({
      columns: { password: false },
      with: { profiles: true },
      where: and(eq(usersModel.username, username), isNull(usersModel.deleted_at)),
    });
  }
}
