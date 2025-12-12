import { UserRepository } from "../repository/userRepository";
import type { UserCreateBody } from "../../types/user";
import { errorHttp } from "../../utils/error";
import type { GetPaginationParams } from "../../types/paginate";
import { getPaginationMetadata } from "../../utils/paginate";

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getUsers(params: GetPaginationParams = { offset: 0, limit: 10 }) {
    const { data, total } = await this.userRepository.getUsersPaginate(params);
    const meta = getPaginationMetadata(total, params.offset, params.limit);
    return { data, meta };
  }
  gerUser(id: string) {
    return this.userRepository.getUser(id);
  }
  async gerUserMe(id: string, profile = false) {
    if (profile) {
      return await this.userRepository.getUserProfile(id);
    } else {
      return await this.userRepository.getUser(id);
    }
  }

  async deleteUser(user_id: string) {
    const look = await this.userRepository.getUser(user_id);
    if (!look) {
      throw errorHttp("User not found", 404);
    }
    return await this.userRepository.deleteUserSoft(user_id);
  }
  async addUser(body: UserCreateBody) {
    const hash_password = await Bun.password.hash(body.password, {
      algorithm: "bcrypt",
      cost: 12,
    });
    const resultuser = await this.userRepository.addUser({
      first_name: body.first_name,
      last_name: body.last_name,
      username: body.username,
      email: body.email,
      password: hash_password,
      image: body.image,
      is_super_admin: false,
    });

    return resultuser[0];
  }
}
