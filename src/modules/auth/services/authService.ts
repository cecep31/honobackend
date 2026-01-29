import { sign } from "hono/jwt";
import { and, eq, lt, isNull } from "drizzle-orm";
import { users } from "../../../database/schemas/postgre/schema";
import type { UserService } from "../../users/services/userService";
import type { UserSignup } from "../validation/auth";
import type { GithubUser } from "../../../types/auth";
import config from "../../../config";
import axios from "axios";
import { randomUUIDv7 } from "bun";
import { Errors } from "../../../utils/error";
import { db } from "../../../database/drizzle";
import {
  sessions as sessionModel,
  password_reset_tokens as passwordResetTokensModel,
} from "../../../database/schemas/postgre/schema";
import { AuthActivityService } from "./authActivityService";

export class AuthService {
  private activityService: AuthActivityService;

  constructor(
    private userService: UserService
  ) {
    this.activityService = new AuthActivityService();
  }

  private isEmail(email: string): boolean {
    if (!email || email.length < 5 || email.length > 254) {
      return false;
    }
    const pattern = /^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
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
        // Log failed login attempt
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
        // Log failed login attempt
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

      // Log successful login
      await this.activityService.logActivity({
        userId: user.id,
        activityType: "login",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "success",
      });

      // Update last logged at timestamp
      await db
        .update(users)
        .set({ last_logged_at: new Date().toISOString() })
        .where(eq(users.id, user.id));

      return { access_token: token, refresh_token: session[0].refresh_token };
    } catch (error) {
      // If error is not already logged, log it
      if (error instanceof Error && !error.message.includes("Invalid credentials")) {
        await this.activityService.logActivity({
          userId: user?.id,
          activityType: "login_failed",
          ipAddress: ip_address,
          userAgent: user_agent,
          status: "failure",
          errorMessage: error.message,
        });
      }
      throw error;
    }
  }

  async signInWithGithub(githubUser: GithubUser, ip_address?: string, user_agent?: string) {
    try {
      // Check if user with this GitHub ID already exists
      let user = await this.userService.getUserByGithubId(githubUser.id);
      
      // If user doesn't exist, create new user from GitHub data
      if (!user) {
        try {
          user = await this.userService.createUserFromGithub(githubUser);
        } catch (error) {
          // Log failed OAuth login
          await this.activityService.logActivity({
            activityType: "oauth_login_failed",
            ipAddress: ip_address,
            userAgent: user_agent,
            status: "failure",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            metadata: { provider: "github", github_id: githubUser.id },
          });
          
          // If email is already used by another account, throw clear error
          if (
            error instanceof Error &&
            error.message.includes("already registered")
          ) {
            throw error;
          }
          // Re-throw other errors
          throw error;
        }
      }

      const payload = {
        user_id: user.id,
        email: user.email,
        is_super_admin: user.is_super_admin,
        exp: Math.floor(Date.now() / 1000) + 5 * 60 * 60, // 5 hours
      };

      const token = await sign(payload, config.jwt.secret);

      // Log successful OAuth login
      await this.activityService.logActivity({
        userId: user.id,
        activityType: "oauth_login",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "success",
        metadata: { provider: "github" },
      });

      // Update last logged at timestamp
      await db
        .update(users)
        .set({ last_logged_at: new Date().toISOString() })
        .where(eq(users.id, user.id));

      return { access_token: token };
    } catch (error) {
      // Log error if not already logged
      if (error instanceof Error && !error.message.includes("already registered")) {
        await this.activityService.logActivity({
          activityType: "oauth_login_failed",
          ipAddress: ip_address,
          userAgent: user_agent,
          status: "failure",
          errorMessage: error.message,
          metadata: { provider: "github" },
        });
      }
      throw error;
    }
  }

  async signUp(data: UserSignup, ip_address?: string, user_agent?: string) {
    try {
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

      // Log successful registration
      await this.activityService.logActivity({
        userId: user.id,
        activityType: "register",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "success",
      });

      return { access_token: token };
    } catch (error) {
      // Log failed registration
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
  async refreshToken(refreshToken: string, ip_address?: string, user_agent?: string) {
    try {
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
        // Log failed token refresh
        await this.activityService.logActivity({
          activityType: "token_refresh",
          ipAddress: ip_address,
          userAgent: user_agent,
          status: "failure",
          errorMessage: "Invalid or expired refresh token",
        });
        throw Errors.Unauthorized();
      }

      const payload = {
        user_id: session.user.id,
        email: session.user.email,
        is_super_admin: session.user.is_super_admin,
        exp: Math.floor(Date.now() / 1000) + 5 * 60 * 60,
      };

      const token = await sign(payload, config.jwt.secret);

      // Log successful token refresh
      await this.activityService.logActivity({
        userId: session.user.id,
        activityType: "token_refresh",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "success",
      });

      // Update last logged at timestamp on token refresh
      await db
        .update(users)
        .set({ last_logged_at: new Date().toISOString() })
        .where(eq(users.id, session.user.id));

      return { access_token: token };
    } catch (error) {
      if (!(error instanceof Error && error.message.includes("Unauthorized"))) {
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

      if (
        !(await Bun.password.verify(
          currentPassword,
          user?.password ?? "",
          "bcrypt"
        ))
      ) {
        // Log failed password change
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

      const hashedPassword = Bun.password.hashSync(newPassword, {
        algorithm: "bcrypt",
      });

      const result = await this.userService.updatePassword(userId, hashedPassword);

      // Log successful password change
      await this.activityService.logActivity({
        userId,
        activityType: "password_change",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "success",
      });

      return result;
    } catch (error) {
      if (!(error instanceof Error && error.message.includes("Invalid credentials"))) {
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
        ...(process.env.NODE_ENV === "development" && { token: null, resetLink: null })
      };
    }

    try {
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

      // Log password reset request
      await this.activityService.logActivity({
        userId: user.id,
        activityType: "password_reset_request",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "success",
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
        // Log failed password reset
        await this.activityService.logActivity({
          activityType: "password_reset",
          ipAddress: ip_address,
          userAgent: user_agent,
          status: "failure",
          errorMessage: "Invalid or expired reset token",
        });
        throw Errors.InvalidInput("token", "Invalid or expired reset token");
      }

      // Check if token is expired
      if (new Date(resetToken.expires_at) < new Date()) {
        // Log failed password reset
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

      // Log successful password reset
      await this.activityService.logActivity({
        userId: resetToken.user_id,
        activityType: "password_reset",
        ipAddress: ip_address,
        userAgent: user_agent,
        status: "success",
      });

      return { message: "Password has been reset successfully" };
    } catch (error) {
      if (!(error instanceof Error && error.message.includes("Invalid"))) {
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
    // Clean up expired tokens (can be run as a cron job)
    const now = new Date().toISOString();
    await db
      .delete(passwordResetTokensModel)
      .where(lt(passwordResetTokensModel.expires_at, now));
  }
}