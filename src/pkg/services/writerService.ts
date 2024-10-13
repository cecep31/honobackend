import { errorHttp } from "../../utils/error";
import { UserRepository } from "../repository/userRepository";
export class WritetService {
  constructor(private userrepository: UserRepository) {}
  async getWriterByUsername(username: string) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/;
    function validateUsername(username: string) {
      return usernameRegex.test(username);
    }
    if (!validateUsername(username)) {
      throw errorHttp("Username not valid", 404);
    }
    return await this.userrepository.getUserByUsernameProfile(username);
  }
}
