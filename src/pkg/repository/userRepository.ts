import { db } from "../../database/drizzel";
import { desc, eq, isNull } from "drizzle-orm";
import { users as usersModel } from "../../database/schema/schema";

export class UserRepository {
  async getUserWithPassword(id: string) {
    return db.query.users.findFirst({
      where: eq(usersModel.id, id),
    });
  }
  async getUser(id: string) {
    return db.query.users.findFirst({
      columns: { password: false },
      where: eq(usersModel.id, id),
    });
  }
  async getUserProfile(id: string) {
    return await db.query.users.findFirst({
      columns: { password: false },
      with: { profile: true },
      where: eq(usersModel.id, id),
    });
  }

  async getUserByEmail(email: string) {
    return await db.query.users.findFirst({
      where: eq(usersModel.email, email),
    });
  }
  async getUserByUsername(username: string) {
    return await db.query.users.findFirst({
      columns: { password: false },
      where: eq(usersModel.username, username),
    });
  }
  async updatePassword(id: string, password: string) {
    return db
      .update(usersModel)
      .set({ password: password })
      .where(eq(usersModel.id, id))
      .returning({ id: usersModel.id });
  }
  async getUsers() {
    return await db.query.users.findMany({
      columns: {
        password: false,
      },
      orderBy: [desc(usersModel.created_at)],
      where: isNull(usersModel.deleted_at),
    });
  }
}
