import { randomUUIDv7 } from "bun";
import { db } from "../../database/drizzle";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import {
  profiles,
  users as usersModel,
} from "../../database/schemas/postgre/schema";
import type { UserCreateBody, UserSignup } from "../../types/user";
import type { GetPaginationParams } from "../../types/paginate";
import { getPaginationMetadata } from "../../utils/paginate";
import { Errors } from "../../utils/error";

export class UserService {
  async getUsers(params: GetPaginationParams = { offset: 0, limit: 10 }) {
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

    const meta = getPaginationMetadata(total[0].count, offset, limit);
    return { data, meta };
  }
  
  async getUser(id: string) {
    return db.query.users.findFirst({
      columns: { password: false },
      where: eq(usersModel.id, id),
    });
  }
  
  async getUserMe(id: string, profile = false) {
    if (profile) {
      return await db.query.users.findFirst({
        columns: { password: false },
        with: { profiles: true },
        where: eq(usersModel.id, id),
      });
    } else {
      return await db.query.users.findFirst({
        columns: { password: false },
        where: eq(usersModel.id, id),
      });
    }
  }

  async deleteUser(user_id: string) {
    const look = await this.getUser(user_id);
    if (!look) {
      throw Errors.NotFound("User");
    }
    return await db
      .update(usersModel)
      .set({ deleted_at: new Date().toISOString() })
      .where(eq(usersModel.id, user_id))
      .returning({ id: usersModel.id });
  }
  
  async addUser(body: UserCreateBody) {
    const hash_password = await Bun.password.hash(body.password, {
      algorithm: "bcrypt",
      cost: 12,
    });
    const resultuser = await db
      .insert(usersModel)
      .values({
        first_name: body.first_name,
        last_name: body.last_name,
        username: body.username,
        email: body.email,
        password: hash_password,
        image: body.image,
        is_super_admin: body.is_super_admin ?? false,
        id: randomUUIDv7(),
      })
      .returning({ id: usersModel.id });

    await db.insert(profiles).values({
      user_id: resultuser[0].id,
    });

    return resultuser[0];
  }

  // Methods moved from UserRepository for AuthService/WriterService usage

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

  async getUserByUsernameRaw(username: string) {
    return await db.query.users.findFirst({
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
}