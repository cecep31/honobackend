import { HTTPException } from "hono/http-exception";
import { UserRepository } from "../repository/userRepository";

export class WritetService {
  constructor(private userrepository: UserRepository) {}
  async getWriterByUsername(username: string) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/;
    function validateUsername(username: string) {
      return usernameRegex.test(username);
    }
    if (!validateUsername(username)) {
      throw new HTTPException(404, { message: "Username not valid" });
    }
    return await this.userrepository.getUserByUsernameProfile(username);
  }
}
