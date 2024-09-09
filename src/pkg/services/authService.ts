import { decode, sign, verify } from "hono/jwt";
import { HTTPException } from "hono/http-exception";
import { UserRepository } from "../repository/userRepository";
import { getSecret } from "../../config/secret";
import type { userLogin, UserSignup } from "../../types/user";
import { githubConfig } from "../../config/github";
import axios from "axios";

export class AuthService {
  private userrepository: UserRepository;
  constructor() {
    this.userrepository = new UserRepository();
  }
  private isEmail(email: string): boolean {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
  }
  async signIn(username: string, password: string) {
    let user: userLogin | undefined;

    if (this.isEmail(username)) {
      user = await this.userrepository.getUserByEmailRaw(username);
    } else {
      user = await this.userrepository.getUserByUsernameRaw(username);
    }
    // console.log(user);

    if (!user) {
      throw new HTTPException(401, { message: "Invalid credentials" });
    }

    const isPasswordValid = await Bun.password.verify(
      password,
      user.password || "",
      "bcrypt"
    );

    if (!isPasswordValid) {
      throw new HTTPException(401, { message: "Invalid credentials" });
    }

    const payload = {
      id: user.id,
      email: user.email,
      isSuperAdmin: user.issuperadmin,
      exp: Math.floor(Date.now() / 1000) + 5 * 60 * 60,
    };

    const token = await sign(payload, getSecret.jwt_secret);

    return { access_token: token };
  }

  async signUp(data: UserSignup) {
    const hashedPassword = Bun.password.hashSync(data.password, {
      algorithm: "bcrypt",
      cost: 12,
    });
    data.password = hashedPassword;
    const user = await this.userrepository.createUser(data);
    const payload = {
      id: user.id,
      email: user.email,
      isSuperAdmin: user.issuperadmin,
      exp: Math.floor(Date.now() / 1000) + 5 * 60 * 60,
    };

    const token = await sign(payload, getSecret.jwt_secret);
    return { access_token: token };
  }

  async getGithubToken(code: string) {
    try {
      const tokenResponse = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: githubConfig.CLIENT_ID,
          client_secret: githubConfig.CLIENT_SECRET,
          code,
          redirect_uri: githubConfig.REDIRECT_URI,
        },
        {
          headers: {
            accept: "application/json",
          },
        }
      );
      console.log(tokenResponse.data);
      console.log("wkwkwkwk");
      
      
      return await tokenResponse.data.access_token;
    } catch (error) {
      console.log("failet get token");
    
      return "failed get access token";
    }
  }

  async checkUsername(username: string) {
    const user = await this.userrepository.getUserCountByUsername(username);
    if (user > 0) {
      return true;
    }
    return false;
  }
  async refreshToken(refreshToken: string) {
    try {
      try {
        const payloadverify = await verify(refreshToken, getSecret.jwt_secret);
        console.log(payloadverify);
      } catch (error) {
        throw new HTTPException(401, { message: "" });
      }
      const { payload } = decode(refreshToken);
      console.log(payload);

      // const user = await this.userrepository.getUser(payload.id)
      // if (!user) {
      //     throw new HTTPException(401, { message: "User not found" });
      // }
      // const newPayload = {
      //     id: user.id,
      //     email: user.email,
      //     isSuperAdmin: user.issuperadmin,
      //     exp: Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60
      // }
      // const newToken = await sign(newPayload, process.env.JWT_KEY ?? "");
      // return { access_token: newToken };
    } catch (error) {
      throw new HTTPException(401, { message: "Invalid token" });
    }
  }

  async updatePassword(
    currentPassword: string,
    newPassword: string,
    userId: string
  ) {
    const user = await this.userrepository.getUserWithPassword(userId);

    if (
      !(await Bun.password.verify(
        currentPassword,
        user?.password ?? "",
        "bcrypt"
      ))
    ) {
      throw new HTTPException(401, { message: "Invalid credentials" });
    }

    const hashedPassword = Bun.password.hashSync(newPassword, {
      algorithm: "bcrypt",
    });

    return this.userrepository.updatePassword(userId, hashedPassword);
  }
}
