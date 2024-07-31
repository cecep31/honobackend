import { desc, eq, isNull } from "drizzle-orm";
import { profiles, users } from "../../database/schema/schema";
import { HTTPException } from "hono/http-exception";
import { db } from "../../database/drizzel";
import { UserRepository } from "../repository/userRepository";

export class UserService {
  userrepository: UserRepository;
  constructor() {
    this.userrepository = new UserRepository()
  }
  getUsers() {
    return this.userrepository.getUsers();
  }
  gerUser(id: string) {
    return this.userrepository.getUser(id);
  }
  async gerUserMe(id: string, profile=false) {
    if (profile) {
      return await this.userrepository.getUserProfile(id);
    }else{
      return await this.userrepository.getUser(id);
    }
  }

  async deleteUser(user_id: string) {
    const look = await this.userrepository.getUser(user_id);
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
