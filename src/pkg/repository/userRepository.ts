import { db } from "../../database/drizzel";
import { desc, eq, isNull } from "drizzle-orm";
import { profiles, users as usersModel } from "../../database/schema/schema";
import type { UserCreate } from "../../types/user";

export class UserRepository {
  async addUser(data: UserCreate) {
    const user = await db
      .insert(usersModel)
      .values(data)
      .returning({ id: usersModel.id });
    await db.insert(profiles).values({
      user_id: user[0].id,
    });
    return user;
  }
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
  async getUserByUsernameProfile(username: string) {
    return await db.query.users.findFirst({
      columns: { password: false },
      with: { profile: true },
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

  async deleteUserSoft(user_id: string) {
    return await db
      .update(usersModel)
      .set({ deleted_at: new Date().toISOString() })
      .where(eq(usersModel.id, user_id))
      .returning({ id: usersModel.id });
  }
}
