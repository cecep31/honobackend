import { eq } from "drizzle-orm";
import { Errors } from "../../utils/error";
import { db } from "../../database/drizzle";
import { users as usersModel } from "../../database/schemas/postgre/schema";

export class WriterService {
  async getWriterByUsername(username: string) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/;
    function validateUsername(username: string) {
      return usernameRegex.test(username);
    }
    if (!validateUsername(username)) {
      throw Errors.InvalidInput("username", "Username format is not valid");
    }
    return await db.query.users.findFirst({
      columns: { password: false },
      with: { profiles: true },
      where: eq(usersModel.username, username),
    });
  }
}