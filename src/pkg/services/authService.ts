import { decode, sign, verify } from "hono/jwt";
import { HTTPException } from "hono/http-exception";
import { UserRepository } from "../repository/userRepository";

export class AuthService {
  private userrepository: UserRepository;
  constructor() {
    this.userrepository = new UserRepository();
  }
  async signIn(email: string, password: string) {
    const user = await this.userrepository.getUserByEmail(email);

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

    const token = await sign(payload, process.env.JWT_KEY!);

    return { access_token: token };
  }

  async refreshToken(refreshToken: string) {
    try {
      try {
        const payloadverify = await verify(
          refreshToken,
          process.env.JWT_KEY ?? ""
        );
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
