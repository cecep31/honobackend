import { desc, eq, isNull } from "drizzle-orm";
import { profiles, users } from "../../database/schema/schema";
import { HTTPException } from "hono/http-exception";
import { db } from "../../database/drizzel";

export class UserService {
  static getUsers() {
    return db.query.users.findMany({
      columns: {
        password: false,
      },
      orderBy: [desc(users.created_at)],
      where: isNull(users.deleted_at),
    });
  }
  static gerUser(id: string) {
    return db.query.users.findFirst({
      columns: { password: false },
      where: eq(users.id, id),
    });
  }
  static gerUserMe(id: string, profile=false) {
    if (profile) {
      return db.query.users.findFirst({
        columns: { password: false },
        with: { profile: true },
        where: eq(users.id, id),
      });
    }else{
      return db.query.users.findFirst({
        columns: { password: false },
        where: eq(users.id, id),
      });

    }
  }

  static async deleteUser(user_id: string) {
    const look = await this.gerUser(user_id);
    if (!look) {
      throw new HTTPException(404, { message: "User not found" });
    }
    return await db
      .update(users)
      .set({ deleted_at: new Date().toISOString() })
      .where(eq(users.id, user_id))
      .returning({ id: users.id });
  }
  static async addUser(body: PostUser) {
    const hash_password = Bun.password.hashSync(body.password, {
      algorithm: "bcrypt",
      cost: 12,
    });
    const resultuser = await db
      .insert(users)
      .values({
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        password: hash_password,
        image: body.image,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning({ id: users.id });

    await db.insert(profiles).values({
      user_id: resultuser[0].id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return resultuser;
  }
}
