import { randomUUIDv7 } from "bun";
import { db } from "../../database/drizzel";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import {
  profiles,
  users as usersModel,
} from "../../database/schemas/postgre/schema";
import type { UserCreate, UserSignup } from "../../types/user";
import type { GetPaginationParams } from "../../types/paginate";

export class UserRepository {
  async getUserByGithubId(github_id: number) {
    return db.query.users.findFirst({
      where: and(
        eq(usersModel.github_id, github_id),
        isNull(usersModel.deleted_at)
      ),
    });
  }

  async getUserCountByUsername(username: string) {
    const users = await db
      .select({ count: count() })
      .from(usersModel)
      .where(
        and(eq(usersModel.username, username), isNull(usersModel.deleted_at))
      );
    return users[0].count;
  }

  async addUser(data: UserCreate) {
    const user = await db
      .insert(usersModel)
      .values({ ...data, id: randomUUIDv7() })
      .returning({ id: usersModel.id });
    await db.insert(profiles).values({
      user_id: user[0].id,
    });
    return user;
  }
  async createUser(data: UserSignup) {
    const user = await db.insert(usersModel).values({ ...data, id: randomUUIDv7() }).returning();
    await db.insert(profiles).values({ user_id: user[0].id });
    return user[0];
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
      with: { profiles: true },
      where: eq(usersModel.id, id),
    });
  }

  async getUserByEmailRaw(email: string) {
    return await db.query.users.findFirst({
      where: eq(usersModel.email, email),
    });
  }

  async getUserByEmail(email: string) {
    return await db.query.users.findFirst({
      columns: { password: false },
      where: eq(usersModel.email, email),
    });
  }
  async getUserByUsername(username: string) {
    return await db.query.users.findFirst({
      columns: { password: false },
      where: eq(usersModel.username, username),
    });
  }
  async getUserByUsernameRaw(username: string) {
    return await db.query.users.findFirst({
      where: eq(usersModel.username, username),
    });
  }
  async getUserByUsernameProfile(username: string) {
    return await db.query.users.findFirst({
      columns: { password: false },
      with: { profiles: true },
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

  async getUsersPaginate(params: GetPaginationParams) {
    const { limit, offset } = params;
    const data = await db.query.users.findMany({
      columns: { password: false },
      orderBy: [desc(usersModel.created_at)],
      where: isNull(usersModel.deleted_at),
      limit,
      offset,
    });

    const total = await db
      .select({ count: count() })
      .from(usersModel)
      .where(isNull(usersModel.deleted_at));

    return { data, total: total[0].count };
  }

  async deleteUserSoft(user_id: string) {
    return await db
      .update(usersModel)
      .set({ deleted_at: new Date().toISOString() })
      .where(eq(usersModel.id, user_id))
      .returning({ id: usersModel.id });
  }

  async deleteUserPermanent(user_id: string) {
    // First, delete the user's profile
    await db.delete(profiles).where(eq(profiles.user_id, user_id));

    // Then, delete the user
    return await db
      .delete(usersModel)
      .where(eq(usersModel.id, user_id))
      .returning({ id: usersModel.id });
  }
}
