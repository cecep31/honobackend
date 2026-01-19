import { sign } from "hono/jwt";
import { and, eq, lt, isNull } from "drizzle-orm";
import type { UserService } from "../../modules/users/userService";
import type { UserSignup } from "./validation/auth";
import config from "../../config";
import axios from "axios";
import { randomUUIDv7 } from "bun";
import { Errors } from "../../utils/error";
import { db } from "../../database/drizzle";
import {
  sessions as sessionModel,
  password_reset_tokens as passwordResetTokensModel
} from "../../database/schemas/postgre/schema";

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
    let user;

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
      console.error("Failed to get GitHub token");
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

  async requestPasswordReset(email: string) {
    const user = await this.userService.getUserByEmailRaw(email);
    
    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return {
        message: "If the email exists, a password reset link has been sent",
        ...(process.env.NODE_ENV === "development" && { token: null, resetLink: null })
      };
    }

    // Generate a secure random token
    const token = randomUUIDv7().toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Delete any existing unused tokens for this user
    await db
      .delete(passwordResetTokensModel)
      .where(
        and(
          eq(passwordResetTokensModel.user_id, user.id),
          isNull(passwordResetTokensModel.used_at)
        )
      );

    // Create new reset token
    await db.insert(passwordResetTokensModel).values({
      id: randomUUIDv7(),
      user_id: user.id,
      token: token,
      expires_at: expiresAt.toISOString(),
    });

    // TODO: Send email with reset link
    // For now, we'll return the token (in production, this should be sent via email)
    // Example reset link: https://yourapp.com/reset-password?token=${token}
    const resetLink = `${config.frontend.resetPasswordUrl}?token=${token}`;

    return {
      message: "If the email exists, a password reset link has been sent",
      // Remove this in production - only for development
      ...(process.env.NODE_ENV === "development" && { token, resetLink })
    };
  }

  async resetPassword(token: string, newPassword: string) {
    // Find the token
    const resetToken = await db.query.password_reset_tokens.findFirst({
      where: and(
        eq(passwordResetTokensModel.token, token),
        isNull(passwordResetTokensModel.used_at)
      ),
      with: {
        user: true,
      },
    });

    if (!resetToken) {
      throw Errors.InvalidInput("token", "Invalid or expired reset token");
    }

    // Check if token is expired
    if (new Date(resetToken.expires_at) < new Date()) {
      throw Errors.InvalidInput("token", "Reset token has expired");
    }

    // Hash the new password
    const hashedPassword = Bun.password.hashSync(newPassword, {
      algorithm: "bcrypt",
      cost: 12,
    });

    // Update user password
    await this.userService.updatePassword(resetToken.user_id, hashedPassword);

    // Mark token as used
    await db
      .update(passwordResetTokensModel)
      .set({ used_at: new Date().toISOString() })
      .where(eq(passwordResetTokensModel.token, token));

    // Optionally: Invalidate all existing sessions for this user
    await db
      .delete(sessionModel)
      .where(eq(sessionModel.user_id, resetToken.user_id));

    return { message: "Password has been reset successfully" };
  }

  async cleanupExpiredTokens() {
    // Clean up expired tokens (can be run as a cron job)
    const now = new Date().toISOString();
    await db
      .delete(passwordResetTokensModel)
      .where(lt(passwordResetTokensModel.expires_at, now));
  }

  async updateUser(
    userId: string,
    data: { username?: string; email?: string; password?: string }
  ) {
    // Check for username/email conflicts if being updated
    if (data.username) {
      const usernameCount = await this.userService.getUserCountByUsername(data.username);
      if (usernameCount > 0) {
        throw Errors.BusinessRuleViolation("Username already exists");
      }
    }

    if (data.email) {
      const emailCount = await this.userService.getUserCountByEmail(data.email);
      if (emailCount > 0) {
        throw Errors.BusinessRuleViolation("Email already exists");
      }
    }

    // Update user data
    return this.userService.updateUser(userId, data);
  }
}