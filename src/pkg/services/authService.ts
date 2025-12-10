import { decode, sign, verify } from "hono/jwt";
import type { UserRepository } from "../repository/userRepository";
import type { SessionRepository } from "../repository/sessionRepository";
import type { userLogin, UserSignup } from "../../types/user";
import config from "../../config";
import axios from "axios";
import { randomUUIDv7 } from "bun";
import { errorHttp } from "../../utils/error";

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository
  ) {}

  private isEmail(email: string): boolean {
    if (!email || email.length < 5 || email.length > 254) {
      return false;
    }
    const pattern = /^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
  }

  async signIn(username: string, password: string, user_agent: string) {
    let user: userLogin | undefined;

    if (this.isEmail(username)) {
      user = await this.userRepository.getUserByEmailRaw(username);
    } else {
      user = await this.userRepository.getUserByUsernameRaw(username);
    }

    if (!user) {
      throw errorHttp("Invalid credentials", 401);
    }

    const isPasswordValid = await Bun.password.verify(
      password,
      user.password || "",
      "bcrypt"
    );

    if (!isPasswordValid) {
      throw errorHttp("Invalid credentials", 401);
    }

    const payload = {
      user_id: user.id,
      email: user.email,
      isSuperAdmin: user.is_super_admin,
      exp: Math.floor(Date.now() / 1000) + 5 * 60 * 60,
    };

    const session = await this.sessionRepository.insertSession({
      user_id: user.id ?? "",
      refresh_token: randomUUIDv7().toString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day
      user_agent: user_agent,
    });

    const token = await sign(payload, config.jwt.secret);

    return { access_token: token, refresh_token: session.refresh_token };
  }

  async signInWithGithub(github_id: number) {
    const user = await this.userRepository.getUserByGithubId(github_id);
    if (!user) {
      throw errorHttp("User not found", 401);
    }

    const payload = {
      user_id: user.id,
      email: user.email,
      isSuperAdmin: user.is_super_admin,
      exp: Math.floor(Date.now() / 1000) + 5 * 60 * 60, // 5 hours
    };

    const token = await sign(payload, config.jwt.secret);
    return { access_token: token };
  }

  async signUp(data: UserSignup) {
    const hashedPassword = Bun.password.hashSync(data.password, {
      algorithm: "bcrypt",
      cost: 12,
    });
    data.password = hashedPassword;
    const user = await this.userRepository.createUser(data);
    const payload = {
      id: user.id,
      email: user.email,
      isSuperAdmin: user.is_super_admin,
      exp: Math.floor(Date.now() / 1000) + 5 * 60 * 60, // 5 hours
    };

    const token = await sign(payload, config.jwt.secret);
    return { access_token: token };
  }

  async getGithubToken(code: string) {
    try {
      const tokenResponse = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: config.github.CLIENT_ID,
          client_secret: config.github.CLIENT_SECRET,
          code,
          redirect_uri: config.github.REDIRECT_URI,
        },
        {
          headers: {
            accept: "application/json",
          },
        }
      );

      return await tokenResponse.data.access_token;
    } catch (error) {
      console.log("failet get token");
      throw errorHttp("failed get token", 401);
    }
  }

  async checkUsername(username: string) {
    const user = await this.userRepository.getUserCountByUsername(username);
    if (user > 0) {
      return true;
    }
    return false;
  }
  async refreshToken(refreshToken: string) {
    try {
      try {
        const payloadverify = await verify(refreshToken, config.jwt.secret);
        console.log(payloadverify);
      } catch (error) {
        throw errorHttp("Invalid token", 401);
      }
      const { payload } = decode(refreshToken);
      console.log(payload);
    } catch (error) {
      throw errorHttp("Invalid token", 401);
    }
  }

  async updatePassword(
    currentPassword: string,
    newPassword: string,
    userId: string
  ) {
    const user = await this.userRepository.getUserWithPassword(userId);

    if (
      !(await Bun.password.verify(
        currentPassword,
        user?.password ?? "",
        "bcrypt"
      ))
    ) {
      throw errorHttp("Invalid credentials", 401);
    }

    const hashedPassword = Bun.password.hashSync(newPassword, {
      algorithm: "bcrypt",
    });

    return this.userRepository.updatePassword(userId, hashedPassword);
  }
}
