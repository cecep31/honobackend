import { HTTPException } from "hono/http-exception";
import { UserRepository } from "../repository/userRepository";
import type {UserCreateBody } from "../../types/user";

export class UserService {
  userrepository: UserRepository;
  constructor() {
    this.userrepository = new UserRepository();
  }
  getUsers() {
    return this.userrepository.getUsers();
  }
  gerUser(id: string) {
    return this.userrepository.getUser(id);
  }
  async gerUserMe(id: string, profile = false) {
    if (profile) {
      return await this.userrepository.getUserProfile(id);
    } else {
      return await this.userrepository.getUser(id);
    }
  }

  async deleteUser(user_id: string) {
    const look = await this.userrepository.getUser(user_id);
    if (!look) {
      throw new HTTPException(404, { message: "User not found" });
    }
    return await this.userrepository.deleteUserSoft(user_id);
  }
  async addUser(body: UserCreateBody) {
    const hash_password = Bun.password.hashSync(body.password, {
      algorithm: "bcrypt",
      cost: 12,
    });
    const resultuser = await this.userrepository.addUser({
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      password: hash_password,
      image: body.image,
      isSuperAdmin: false,
    });

    return resultuser[0];
  }
}
