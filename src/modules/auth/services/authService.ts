import { sign } from "hono/jwt";
import { and, eq, lt, isNull } from "drizzle-orm";
import { users } from "../../../database/schemas/postgre/schema";
import type { UserService } from "../../users/services/userService";
import type { UserSignup } from "../validation";
import type { GithubUser } from "../../../types/auth";
import config from "../../../config";
import { externalApiClient } from "../../../utils/httpClient";
import { randomUUIDv7 } from "bun";
import { ApiError, Errors } from "../../../utils/error";
import { db } from "../../../database/drizzle";
import {
  sessions as sessionModel,
  password_reset_tokens as passwordResetTokensModel,
} from "../../../database/schemas/postgre/schema";
import { AuthActivityService } from "./authActivityService";

export class AuthService {
  private activityService: AuthActivityService;

  constructor(private userService: UserService) {
    this.activityService = new AuthActivityService();
  }

  private isEmail(email: string): boolean {
    if (!email || email.length < 5 || email.length > 254) {
      return false;
    }
    const pattern = /^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
  }

  private createJwtPayload(user: { id: string; email: string; is_super_admin: boolean | null }) {
    return {
      user_id: user.id,
      email: user.email,
      is_super_admin: user.is_super_admin,
      exp: Math.floor(Date.now() / 1000) + 5 * 60 * 60, // 5 hours
    };
  }

  private async updateLastLoggedAt(userId: string) {
    await db
      .update(users)
      .set({ last_logged_at: new Date().toISOString() })
      .where(eq(users.id, userId));
  }

  async signIn(username: string, password: string, user_agent: string, ip_address?: string) {
    let user;

    try {
      if (this.isEmail(username)) {
        user = await this.userService.getUserByEmailRaw(username);
      } else {
        user = await this.userService.getUserByUsernameRaw(username);
      }

      if (!user) {
        await this.activityService.logActivity({
          activityType: "login_failed",
          ipAddress: ip_address,
          userAgent: user_agent,
          status: "failure",
          errorMessage: "Invalid credentials",
          metadata: { username },
        });
        throw Errors.InvalidCredentials();
      }

      const isPasswordValid = await Bun.password.verify(
        password,
        user.password || "",
        "bcrypt"
      );

      if (!isPasswordValid) {
        await this.activityService.logActivity({
          userId: user.id,
          activityType: "login_failed",
          ipAddress: ip_address,
          userAgent: user_agent,
          status: "failure",
          errorMessage: "Invalid password",
        });
        throw Errors.InvalidCredentials();
      }

      const payload = this.createJwtPayload(user);

      const session = await db
        .insert(sessionModel)
        .values({
          user_id: user.id ?? "",
          refresh_token: randomUUIDv7().toString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day
          user_agent: user_agent,
        })
        .returning({ refresh_token: sessionModel.refresh_token });

      const token = await sign(payload, config.jwt.secret);

      await this.activityService.logActivity({
        userId: user.id,
        activityType: "login",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "success",
      });

      await this.updateLastLoggedAt(user.id);

      return { access_token: token, refresh_token: session[0].refresh_token };
    } catch (error) {
      if (!(error instanceof ApiError)) {
        await this.activityService.logActivity({
          userId: user?.id,
          activityType: "login_failed",
          ipAddress: ip_address,
          userAgent: user_agent,
          status: "failure",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      }
      throw error;
    }
  }

  async signInWithGithub(githubUser: GithubUser, ip_address?: string, user_agent?: string) {
    try {
      let user = await this.userService.getUserByGithubId(githubUser.id);

      if (!user) {
        user = await this.userService.createUserFromGithub(githubUser);
      }

      const payload = this.createJwtPayload(user);
      const token = await sign(payload, config.jwt.secret);

      await this.activityService.logActivity({
        userId: user.id,
        activityType: "oauth_login",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "success",
        metadata: { provider: "github" },
      });

      await this.updateLastLoggedAt(user.id);

      return { access_token: token };
    } catch (error) {
      await this.activityService.logActivity({
        activityType: "oauth_login_failed",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "failure",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        metadata: { provider: "github" },
      });
      throw error;
    }
  }

  async signUp(data: UserSignup, ip_address?: string, user_agent?: string) {
    try {
      const hashedPassword = Bun.password.hashSync(data.password, {
        algorithm: "bcrypt",
        cost: 12,
      });
      const user = await this.userService.createUser({ ...data, password: hashedPassword });
      const payload = this.createJwtPayload(user);
      const token = await sign(payload, config.jwt.secret);

      await this.activityService.logActivity({
        userId: user.id,
        activityType: "register",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "success",
      });

      return { access_token: token };
    } catch (error) {
      await this.activityService.logActivity({
        activityType: "register",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "failure",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        metadata: { email: data.email },
      });
      throw error;
    }
  }

  async getGithubToken(code: string) {
    try {
      const tokenResponse = await externalApiClient.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: config.github.CLIENT_ID,
          client_secret: config.github.CLIENT_SECRET,
          code,
          redirect_uri: config.github.REDIRECT_URI,
        },
        {
          headers: { accept: "application/json" },
        }
      );

      return tokenResponse.data.access_token;
    } catch (error) {
      console.error("Failed to get GitHub token");
      throw Errors.ExternalServiceError("GitHub");
    }
  }

  async checkUsername(username: string) {
    const count = await this.userService.getUserCountByUsername(username);
    return count > 0;
  }

  async checkEmail(email: string) {
    const count = await this.userService.getUserCountByEmail(email);
    return count > 0;
  }

  async refreshToken(refreshToken: string, ip_address?: string, user_agent?: string) {
    try {
      const session = await db.query.sessions.findFirst({
        where: eq(sessionModel.refresh_token, refreshToken),
        with: { user: true },
      });

      if (
        !session ||
        !session.user ||
        !session.expires_at ||
        new Date(session.expires_at) < new Date()
      ) {
        await this.activityService.logActivity({
          activityType: "token_refresh",
          ipAddress: ip_address,
          userAgent: user_agent,
          status: "failure",
          errorMessage: "Invalid or expired refresh token",
        });
        throw Errors.Unauthorized();
      }

      const payload = this.createJwtPayload(session.user);
      const token = await sign(payload, config.jwt.secret);

      await this.activityService.logActivity({
        userId: session.user.id,
        activityType: "token_refresh",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "success",
      });

      await this.updateLastLoggedAt(session.user.id);

      return { access_token: token };
    } catch (error) {
      if (!(error instanceof ApiError)) {
        await this.activityService.logActivity({
          activityType: "token_refresh",
          ipAddress: ip_address,
          userAgent: user_agent,
          status: "failure",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      }
      throw error;
    }
  }

  async updatePassword(
    currentPassword: string,
    newPassword: string,
    userId: string,
    ip_address?: string,
    user_agent?: string
  ) {
    try {
      const user = await this.userService.getUserWithPassword(userId);

      if (!(await Bun.password.verify(currentPassword, user?.password ?? "", "bcrypt"))) {
        await this.activityService.logActivity({
          userId,
          activityType: "password_change",
          ipAddress: ip_address,
          userAgent: user_agent,
          status: "failure",
          errorMessage: "Invalid current password",
        });
        throw Errors.InvalidCredentials();
      }

      const hashedPassword = Bun.password.hashSync(newPassword, { algorithm: "bcrypt" });
      const result = await this.userService.updatePassword(userId, hashedPassword);

      await this.activityService.logActivity({
        userId,
        activityType: "password_change",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "success",
      });

      return result;
    } catch (error) {
      if (!(error instanceof ApiError)) {
        await this.activityService.logActivity({
          userId,
          activityType: "password_change",
          ipAddress: ip_address,
          userAgent: user_agent,
          status: "failure",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      }
      throw error;
    }
  }

  async requestPasswordReset(email: string, ip_address?: string, user_agent?: string) {
    const user = await this.userService.getUserByEmailRaw(email);

    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return {
        message: "If the email exists, a password reset link has been sent",
        ...(process.env.NODE_ENV === "development" && { token: null, resetLink: null }),
      };
    }

    try {
      const token = randomUUIDv7().toString();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Delete any existing unused tokens for this user
      await db
        .delete(passwordResetTokensModel)
        .where(
          and(
            eq(passwordResetTokensModel.user_id, user.id),
            isNull(passwordResetTokensModel.used_at)
          )
        );

      await db.insert(passwordResetTokensModel).values({
        id: randomUUIDv7(),
        user_id: user.id,
        token: token,
        expires_at: expiresAt.toISOString(),
      });

      await this.activityService.logActivity({
        userId: user.id,
        activityType: "password_reset_request",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "success",
      });

      const resetLink = `${config.frontend.resetPasswordUrl}?token=${token}`;

      return {
        message: "If the email exists, a password reset link has been sent",
        ...(process.env.NODE_ENV === "development" && { token, resetLink }),
      };
    } catch (error) {
      await this.activityService.logActivity({
        userId: user.id,
        activityType: "password_reset_request",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "failure",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string, ip_address?: string, user_agent?: string) {
    try {
      const resetToken = await db.query.password_reset_tokens.findFirst({
        where: and(
          eq(passwordResetTokensModel.token, token),
          isNull(passwordResetTokensModel.used_at)
        ),
        with: { user: true },
      });

      if (!resetToken) {
        await this.activityService.logActivity({
          activityType: "password_reset",
          ipAddress: ip_address,
          userAgent: user_agent,
          status: "failure",
          errorMessage: "Invalid or expired reset token",
        });
        throw Errors.InvalidInput("token", "Invalid or expired reset token");
      }

      if (new Date(resetToken.expires_at) < new Date()) {
        await this.activityService.logActivity({
          userId: resetToken.user_id,
          activityType: "password_reset",
          ipAddress: ip_address,
          userAgent: user_agent,
          status: "failure",
          errorMessage: "Reset token has expired",
        });
        throw Errors.InvalidInput("token", "Reset token has expired");
      }

      const hashedPassword = Bun.password.hashSync(newPassword, {
        algorithm: "bcrypt",
        cost: 12,
      });

      await this.userService.updatePassword(resetToken.user_id, hashedPassword);

      await db
        .update(passwordResetTokensModel)
        .set({ used_at: new Date().toISOString() })
        .where(eq(passwordResetTokensModel.token, token));

      // Invalidate all existing sessions for security
      await db.delete(sessionModel).where(eq(sessionModel.user_id, resetToken.user_id));

      await this.activityService.logActivity({
        userId: resetToken.user_id,
        activityType: "password_reset",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "success",
      });

      return { message: "Password has been reset successfully" };
    } catch (error) {
      if (!(error instanceof ApiError)) {
        await this.activityService.logActivity({
          activityType: "password_reset",
          ipAddress: ip_address,
          userAgent: user_agent,
          status: "failure",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      }
      throw error;
    }
  }

  async cleanupExpiredTokens() {
    const now = new Date().toISOString();
    await db
      .delete(passwordResetTokensModel)
      .where(lt(passwordResetTokensModel.expires_at, now));
  }
}
