import { sign } from "hono/jwt";
import { and, eq } from "drizzle-orm";
import type { UserService } from "./userService";
import type { userLogin, UserSignup } from "../../types/user";
import config from "../../config";
import axios from "axios";
import { randomUUIDv7 } from "bun";
import { Errors } from "../../utils/error";
import { db } from "../../database/drizzle";
import { sessions as sessionModel } from "../../database/schemas/postgre/schema";

export class AuthService {
  constructor(
    private userService: UserService
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
      user = await this.userService.getUserByEmailRaw(username);
    } else {
      user = await this.userService.getUserByUsernameRaw(username);
    }

    if (!user) {
      throw Errors.InvalidCredentials();
    }

    const isPasswordValid = await Bun.password.verify(
      password,
      user.password || "",
      "bcrypt"
    );

    if (!isPasswordValid) {
      throw Errors.InvalidCredentials();
    }

    const payload = {
      user_id: user.id,
      email: user.email,
      is_super_admin: user.is_super_admin,
      exp: Math.floor(Date.now() / 1000) + 5 * 60 * 60,
    };

    const session = await db.insert(sessionModel).values({
      user_id: user.id ?? "",
      refresh_token: randomUUIDv7().toString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day
      user_agent: user_agent,
    }).returning({
      refresh_token: sessionModel.refresh_token,
    });

    const token = await sign(payload, config.jwt.secret);

    return { access_token: token, refresh_token: session[0].refresh_token };
  }

  async signInWithGithub(github_id: number) {
    const user = await this.userService.getUserByGithubId(github_id);
    if (!user) {
      throw Errors.NotFound("User");
    }

    const payload = {
      user_id: user.id,
      email: user.email,
      is_super_admin: user.is_super_admin,
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
    const user = await this.userService.createUser(data);
    const payload = {
      user_id: user.id,
      email: user.email,
      is_super_admin: user.is_super_admin,
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
      throw Errors.ExternalServiceError("GitHub");
    }
  }

  async checkUsername(username: string) {
    const user = await this.userService.getUserCountByUsername(username);
    if (user > 0) {
      return true;
    }
    return false;
  }

  async checkEmail(email: string) {
    const user = await this.userService.getUserCountByEmail(email);
    if (user > 0) {
      return true;
    }
    return false;
  }
  async refreshToken(refreshToken: string) {
    const session = await db.query.sessions.findFirst({
      where: and(
        eq(sessionModel.refresh_token, refreshToken),
        // Add expiration check if you have a way to compare ISO strings or use native DB date comparison
      ),
      with: {
        user: true,
      },
    });

    if (
      !session ||
      !session.user ||
      !session.expires_at ||
      new Date(session.expires_at) < new Date()
    ) {
      throw Errors.Unauthorized();
    }

    const payload = {
      user_id: session.user.id,
      email: session.user.email,
      is_super_admin: session.user.is_super_admin,
      exp: Math.floor(Date.now() / 1000) + 5 * 60 * 60,
    };

    const token = await sign(payload, config.jwt.secret);

    return { access_token: token };
  }

  async updatePassword(
    currentPassword: string,
    newPassword: string,
    userId: string
  ) {
    const user = await this.userService.getUserWithPassword(userId);

    if (
      !(await Bun.password.verify(
        currentPassword,
        user?.password ?? "",
        "bcrypt"
      ))
    ) {
      throw Errors.InvalidCredentials();
    }

    const hashedPassword = Bun.password.hashSync(newPassword, {
      algorithm: "bcrypt",
    });

    return this.userService.updatePassword(userId, hashedPassword);
  }
}