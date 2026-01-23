import { getS3Helper } from "../../../utils/s3";
import { randomUUIDv7 } from "bun";
import { db } from "../../../database/drizzle";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import {
  profiles,
  users as usersModel,
  user_follows,
} from "../../../database/schemas/postgre/schema";
import type {
  UserCreateBody,
  UserUpdateBody,
  UpdateProfileBody,
} from "../validation/user";
import type { UserSignup } from "../../auth/validation/auth";
import type { GetPaginationParams } from "../../../types/paginate";
import { getPaginationMetadata } from "../../../utils/paginate";
import { Errors } from "../../../utils/error";
import type { GithubUser } from "../../../types/auth";

/**
 * Service class for managing user operations
 * Handles CRUD operations, authentication helpers, and user queries
 */
export class UserService {
  /**
   * Get paginated list of users (excluding passwords)
   * @param params Pagination parameters (limit, offset)
   * @returns Paginated user data with metadata
   */
  async getUsers(params: GetPaginationParams = { offset: 0, limit: 10 }) {
    try {
      const { limit, offset } = params;
      const data = await db.query.users.findMany({
        columns: { password: false },
        orderBy: [desc(usersModel.created_at)],
        where: isNull(usersModel.deleted_at),
        limit,
        offset,
      });

      const total = await db
        .select({ count: count() })
        .from(usersModel)
        .where(isNull(usersModel.deleted_at));

      const meta = getPaginationMetadata(total[0].count, offset, limit);
      return { data, meta };
    } catch (error) {
      console.error("Error fetching users:", error);
      throw Errors.DatabaseError({ message: "Failed to fetch users", error });
    }
  }

  /**
   * Get a single user by ID (excluding password)
   * @param id User ID
   * @returns User object or null if not found
   */
  async getUser(id: string) {
    try {
      return await db.query.users.findFirst({
        columns: { password: false },
        where: and(eq(usersModel.id, id), isNull(usersModel.deleted_at)),
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      throw Errors.DatabaseError({ message: "Failed to fetch user", error });
    }
  }

  /**
   * Get authenticated user's own profile
   * @param id User ID
   * @param profile Whether to include profile data
   * @returns User object with optional profile data
   */
  async getUserMe(id: string, profile = false) {
    try {
      if (profile) {
        return await db.query.users.findFirst({
          columns: { password: false },
          where: and(eq(usersModel.id, id), isNull(usersModel.deleted_at)),
          with: { profiles: true },
        });
      }

      return await db.query.users.findFirst({
        columns: { password: false },
        where: and(eq(usersModel.id, id), isNull(usersModel.deleted_at)),
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw Errors.DatabaseError({
        message: "Failed to fetch user profile",
        error,
      });
    }
  }

  /**
   * Soft delete a user by ID
   * @param userId User ID to delete
   * @returns Deleted user ID
   */
  async deleteUser(userId: string) {
    try {
      const existingUser = await this.getUser(userId);
      if (!existingUser) {
        throw Errors.NotFound("User");
      }

      const result = await db
        .update(usersModel)
        .set({ deleted_at: new Date().toISOString() })
        .where(eq(usersModel.id, userId))
        .returning({ id: usersModel.id });

      return result[0];
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error;
      }
      console.error("Error deleting user:", error);
      throw Errors.DatabaseError({ message: "Failed to delete user", error });
    }
  }

  /**
   * Create a new user with hashed password and profile
   * @param body User creation data
   * @returns Created user ID
   */
  async addUser(body: UserCreateBody) {
    try {
      // Check for existing username or email
      const existingUsername = await this.getUserCountByUsername(body.username);
      if (existingUsername > 0) {
        throw Errors.BusinessRuleViolation("Username already exists");
      }

      const existingEmail = await this.getUserCountByEmail(body.email);
      if (existingEmail > 0) {
        throw Errors.BusinessRuleViolation("Email already exists");
      }

      const hashedPassword = await Bun.password.hash(body.password, {
        algorithm: "bcrypt",
        cost: 12,
      });

      const [user] = await db
        .insert(usersModel)
        .values({
          id: randomUUIDv7(),
          first_name: body.first_name,
          last_name: body.last_name,
          username: body.username,
          email: body.email,
          password: hashedPassword,
          image: body.image,
          is_super_admin: body.is_super_admin ?? false,
        })
        .returning({ id: usersModel.id });

      await db.insert(profiles).values({
        user_id: user.id,
      });

      return user;
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        throw error;
      }
      console.error("Error creating user:", error);
      throw Errors.DatabaseError({ message: "Failed to create user", error });
    }
  }

  /**
   * Update user information
   * @param userId User ID to update
   * @param body Update data
   * @returns Updated user ID
   */
  async updateUser(userId: string, body: UserUpdateBody) {
    try {
      const existingUser = await this.getUser(userId);
      if (!existingUser) {
        throw Errors.NotFound("User");
      }

      // Check for username/email conflicts if being updated
      if (body.username && body.username !== existingUser.username) {
        const usernameCount = await this.getUserCountByUsername(body.username);
        if (usernameCount > 0) {
          throw Errors.BusinessRuleViolation("Username already exists");
        }
      }

      if (body.email && body.email !== existingUser.email) {
        const emailCount = await this.getUserCountByEmail(body.email);
        if (emailCount > 0) {
          throw Errors.BusinessRuleViolation("Email already exists");
        }
      }

      const updateData: any = {
        ...body,
        updated_at: new Date().toISOString(),
      };

      const [updatedUser] = await db
        .update(usersModel)
        .set(updateData)
        .where(eq(usersModel.id, userId))
        .returning({ id: usersModel.id });

      return updatedUser;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("not found") ||
          error.message.includes("already exists"))
      ) {
        throw error;
      }
      console.error("Error updating user:", error);
      throw Errors.DatabaseError({ message: "Failed to update user", error });
    }
  }

  /**
   * Update user profile information
   * @param userId User ID to update
   * @param body Profile update data
   * @returns Updated profile
   */
  async updateProfile(userId: string, body: UpdateProfileBody) {
    try {
      // Check if user exists
      const existingUser = await this.getUser(userId);
      if (!existingUser) {
        throw Errors.NotFound("User");
      }

      const [updatedProfile] = await db
        .update(profiles)
        .set({ ...body, updated_at: new Date().toISOString() })
        .where(eq(profiles.user_id, userId))
        .returning();

      return updatedProfile;
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error;
      }
      console.error("Error updating profile:", error);
      throw Errors.DatabaseError({
        message: "Failed to update profile",
        error,
      });
    }
  }

  // ============================================
  // Authentication & Authorization Helper Methods
  // ============================================

  /**
   * Get user by GitHub ID (for OAuth)
   * @param githubId GitHub user ID
   * @returns User object or null
   */
  async getUserByGithubId(githubId: number) {
    try {
      return await db.query.users.findFirst({
        where: and(
          eq(usersModel.github_id, githubId),
          isNull(usersModel.deleted_at),
        ),
      });
    } catch (error) {
      console.error("Error fetching user by GitHub ID:", error);
      throw Errors.DatabaseError({
        message: "Failed to fetch user by GitHub ID",
        error,
      });
    }
  }

  /**
   * Count users with specific username
   * @param username Username to check
   * @returns Count of users with username
   */
  async getUserCountByUsername(username: string) {
    try {
      const result = await db
        .select({ count: count() })
        .from(usersModel)
        .where(
          and(eq(usersModel.username, username), isNull(usersModel.deleted_at)),
        );
      return result[0].count;
    } catch (error) {
      console.error("Error counting users by username:", error);
      throw Errors.DatabaseError({
        message: "Failed to count users by username",
        error,
      });
    }
  }

  /**
   * Count users with specific email
   * @param email Email to check
   * @returns Count of users with email
   */
  async getUserCountByEmail(email: string) {
    try {
      const result = await db
        .select({ count: count() })
        .from(usersModel)
        .where(and(eq(usersModel.email, email), isNull(usersModel.deleted_at)));
      return result[0].count;
    } catch (error) {
      console.error("Error counting users by email:", error);
      throw Errors.DatabaseError({
        message: "Failed to count users by email",
        error,
      });
    }
  }

  /**
   * Create user from signup data (used by auth service)
   * @param data User signup data
   * @returns Created user object
   */
  async createUser(data: UserSignup) {
    try {
      const [user] = await db
        .insert(usersModel)
        .values({ ...data, id: randomUUIDv7() })
        .returning();

      await db.insert(profiles).values({ user_id: user.id });

      return user;
    } catch (error) {
      console.error("Error creating user from signup:", error);
      throw Errors.DatabaseError({ message: "Failed to create user", error });
    }
  }

  /**
   * Create user from GitHub OAuth data
   * @param githubUser GitHub user data from API
   * @returns Created user object
   */
  async createUserFromGithub(githubUser: GithubUser) {
    try {
      // Handle email - if null, use fallback format
      let email = githubUser.email;
      if (!email || email.trim() === "") {
        email = `github-${githubUser.id}@github.oauth`;
      }

      // Check if email is already used by another user (non-GitHub)
      const existingEmailUser = await this.getUserByEmailRaw(email);
      if (existingEmailUser && existingEmailUser.github_id === null) {
        throw Errors.BusinessRuleViolation(
          `Email ${email} is already registered with a different account. Please use a different email or link your GitHub account.`
        );
      }

      // Handle username - sanitize and check for conflicts
      let username = githubUser.login;
      // Sanitize username to match validation rules (letters, numbers, underscores, hyphens)
      username = username.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
      
      // Ensure username meets minimum length
      if (username.length < 3) {
        username = `user${githubUser.id}`.substring(0, 20);
      }
      
      // Ensure username doesn't exceed max length
      if (username.length > 20) {
        username = username.substring(0, 20);
      }

      // Check for username conflicts and append number if needed
      let finalUsername = username;
      let counter = 1;
      while (await this.getUserCountByUsername(finalUsername) > 0) {
        const suffix = counter.toString();
        const maxLength = 20 - suffix.length;
        finalUsername = `${username.substring(0, maxLength)}${suffix}`;
        counter++;
        
        // Safety check to prevent infinite loop
        if (counter > 1000) {
          throw Errors.BusinessRuleViolation(
            "Unable to generate unique username. Please contact support."
          );
        }
      }

      // Handle name - split if available, otherwise use defaults
      let firstName = "pilput";
      let lastName = "admin";
      if (githubUser.name) {
        const nameParts = githubUser.name.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          firstName = nameParts[0].substring(0, 100);
          lastName = nameParts.slice(1).join(" ").substring(0, 100);
        } else if (nameParts.length === 1) {
          firstName = nameParts[0].substring(0, 100);
        }
      }

      // Create user
      const [user] = await db
        .insert(usersModel)
        .values({
          id: randomUUIDv7(),
          github_id: githubUser.id,
          email: email,
          username: finalUsername,
          first_name: firstName,
          last_name: lastName,
          image: githubUser.avatar_url || null,
          password: null, // OAuth users don't have passwords
          is_super_admin: false,
        })
        .returning();

      // Create profile
      await db.insert(profiles).values({ user_id: user.id });

      return user;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("already registered") ||
          error.message.includes("Unable to generate"))
      ) {
        throw error;
      }
      console.error("Error creating user from GitHub:", error);
      throw Errors.DatabaseError({
        message: "Failed to create user from GitHub",
        error,
      });
    }
  }

  /**
   * Get user with password field (for authentication)
   * @param id User ID
   * @returns User object with password or null
   */
  async getUserWithPassword(id: string) {
    try {
      return await db.query.users.findFirst({
        where: and(eq(usersModel.id, id), isNull(usersModel.deleted_at)),
      });
    } catch (error) {
      console.error("Error fetching user with password:", error);
      throw Errors.DatabaseError({ message: "Failed to fetch user", error });
    }
  }

  /**
   * Get user profile with profile data
   * @param id User ID
   * @returns User with profile or null
   */
  async getUserProfile(id: string) {
    try {
      return await db.query.users.findFirst({
        columns: { password: false },
        with: { profiles: true },
        where: and(eq(usersModel.id, id), isNull(usersModel.deleted_at)),
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw Errors.DatabaseError({
        message: "Failed to fetch user profile",
        error,
      });
    }
  }

  /**
   * Get user by email (includes password, for authentication)
   * @param email User email
   * @returns User object with password or null
   */
  async getUserByEmailRaw(email: string) {
    try {
      return await db.query.users.findFirst({
        where: and(eq(usersModel.email, email), isNull(usersModel.deleted_at)),
      });
    } catch (error) {
      console.error("Error fetching user by email:", error);
      throw Errors.DatabaseError({
        message: "Failed to fetch user by email",
        error,
      });
    }
  }

  /**
   * Get user by username (includes password, for authentication)
   * @param username Username
   * @returns User object with password or null
   */
  async getUserByUsernameRaw(username: string) {
    try {
      return await db.query.users.findFirst({
        where: and(
          eq(usersModel.username, username),
          isNull(usersModel.deleted_at),
        ),
      });
    } catch (error) {
      console.error("Error fetching user by username:", error);
      throw Errors.DatabaseError({
        message: "Failed to fetch user by username",
        error,
      });
    }
  }

  /**
   * Update user password
   * @param id User ID
   * @param password Hashed password
   * @returns Updated user ID
   */
  async updatePassword(id: string, password: string) {
    try {
      const [result] = await db
        .update(usersModel)
        .set({ password, updated_at: new Date().toISOString() })
        .where(eq(usersModel.id, id))
        .returning({ id: usersModel.id });

      return result;
    } catch (error) {
      console.error("Error updating password:", error);
      throw Errors.DatabaseError({
        message: "Failed to update password",
        error,
      });
    }
  }

  /**
   * Update user email
   * @param id User ID
   * @param email New email
   * @returns Updated user ID
   */
  async updateEmail(id: string, email: string) {
    try {
      const [result] = await db
        .update(usersModel)
        .set({ email, updated_at: new Date().toISOString() })
        .where(eq(usersModel.id, id))
        .returning({ id: usersModel.id });

      return result;
    } catch (error) {
      console.error("Error updating email:", error);
      throw Errors.DatabaseError({ message: "Failed to update email", error });
    }
  }

  async updateUserImage(userId: string, imageFile: File) {
    try {
      const s3 = getS3Helper();
      const user = await this.getUser(userId);

      if (!user) {
        throw Errors.NotFound("User not found");
      }

      // If user has an old image, delete it from S3
      if (user.image) {
        try {
          const oldKey = user.image.substring(user.image.lastIndexOf("/") + 1);
          await s3.deleteFile(`avatars/${oldKey}`);
        } catch (error) {
          console.warn(
            "Old image deletion failed, continuing with upload:",
            error,
          );
        }
      }

      const imageId = randomUUIDv7();
      const imageKey = `avatars/${userId}/${imageId}.${imageFile.type.split("/")[1]}`;
      
      await s3.uploadFile(imageKey, imageFile);

      const [updatedUser] = await db
        .update(usersModel)
        .set({ image: imageKey, updated_at: new Date().toISOString() })
        .where(eq(usersModel.id, userId))
        .returning({
          id: usersModel.id,
          image: usersModel.image,
        });

      return updatedUser;
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error;
      }
      console.error("Error updating user image:", error);
      throw Errors.DatabaseError({
        message: "Failed to update user image",
        error,
      });
    }
  }

  // ============================================
  // User Follow Methods
  // ============================================

  /**
   * Follow a user
   * @param follower_id ID of the user who is following
   * @param following_id ID of the user being followed
   * @returns Created follow relationship
   */
  async followUser(follower_id: string, following_id: string) {
    try {
      // Check if users exist
      const follower = await this.getUser(follower_id);
      if (!follower) {
        throw Errors.NotFound("Follower user");
      }

      const following = await this.getUser(following_id);
      if (!following) {
        throw Errors.NotFound("Following user");
      }

      // Check if already following
      const existingFollow = await db.query.user_follows.findFirst({
        where: and(
          eq(user_follows.follower_id, follower_id),
          eq(user_follows.following_id, following_id),
          isNull(user_follows.deleted_at),
        ),
      });

      if (existingFollow) {
        throw Errors.BusinessRuleViolation("Already following this user");
      }

      // Create follow relationship
      const [follow] = await db
        .insert(user_follows)
        .values({
          id: randomUUIDv7(),
          follower_id,
          following_id,
        })
        .returning();

      // Update follower and following counts
      await db
        .update(usersModel)
        .set({
          following_count: sql`${usersModel.following_count} + 1`,
          updated_at: new Date().toISOString(),
        })
        .where(eq(usersModel.id, follower_id));

      await db
        .update(usersModel)
        .set({
          followers_count: sql`${usersModel.followers_count} + 1`,
          updated_at: new Date().toISOString(),
        })
        .where(eq(usersModel.id, following_id));

      return follow;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("not found") ||
          error.message.includes("Already following"))
      ) {
        throw error;
      }
      console.error("Error following user:", error);
      throw Errors.DatabaseError({ message: "Failed to follow user", error });
    }
  }

  /**
   * Unfollow a user
   * @param follower_id ID of the user who is unfollowing
   * @param following_id ID of the user being unfollowed
   * @returns Soft deleted follow relationship
   */
  async unfollowUser(follower_id: string, following_id: string) {
    try {
      // Find existing follow relationship
      const existingFollow = await db.query.user_follows.findFirst({
        where: and(
          eq(user_follows.follower_id, follower_id),
          eq(user_follows.following_id, following_id),
          isNull(user_follows.deleted_at),
        ),
      });

      if (!existingFollow) {
        throw Errors.NotFound("Follow relationship");
      }

      // Soft delete the follow relationship
      const [unfollow] = await db
        .update(user_follows)
        .set({ deleted_at: new Date().toISOString() })
        .where(eq(user_follows.id, existingFollow.id))
        .returning();

      // Update follower and following counts
      await db
        .update(usersModel)
        .set({
          following_count: sql`GREATEST(${usersModel.following_count} - 1, 0)`,
          updated_at: new Date().toISOString(),
        })
        .where(eq(usersModel.id, follower_id));

      await db
        .update(usersModel)
        .set({
          followers_count: sql`GREATEST(${usersModel.followers_count} - 1, 0)`,
          updated_at: new Date().toISOString(),
        })
        .where(eq(usersModel.id, following_id));

      return unfollow;
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error;
      }
      console.error("Error unfollowing user:", error);
      throw Errors.DatabaseError({ message: "Failed to unfollow user", error });
    }
  }

  /**
   * Get list of followers for a user
   * @param userId User ID
   * @param params Pagination parameters
   * @returns Paginated list of followers
   */
  async getFollowers(
    userId: string,
    params: GetPaginationParams = { offset: 0, limit: 10 },
  ) {
    try {
      const { limit, offset } = params;

      // Get followers
      const followers = await db
        .select({
          id: usersModel.id,
          first_name: usersModel.first_name,
          last_name: usersModel.last_name,
          username: usersModel.username,
          email: usersModel.email,
          image: usersModel.image,
          followers_count: usersModel.followers_count,
          following_count: usersModel.following_count,
          created_at: user_follows.created_at,
        })
        .from(user_follows)
        .innerJoin(usersModel, eq(user_follows.follower_id, usersModel.id))
        .where(
          and(
            eq(user_follows.following_id, userId),
            isNull(user_follows.deleted_at),
            isNull(usersModel.deleted_at),
          ),
        )
        .orderBy(desc(user_follows.created_at))
        .limit(limit)
        .offset(offset);

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(user_follows)
        .innerJoin(usersModel, eq(user_follows.follower_id, usersModel.id))
        .where(
          and(
            eq(user_follows.following_id, userId),
            isNull(user_follows.deleted_at),
            isNull(usersModel.deleted_at),
          ),
        );

      const meta = getPaginationMetadata(totalResult[0].count, offset, limit);
      return { data: followers, meta };
    } catch (error) {
      console.error("Error fetching followers:", error);
      throw Errors.DatabaseError({
        message: "Failed to fetch followers",
        error,
      });
    }
  }

  /**
   * Get list of users that a user is following
   * @param userId User ID
   * @param params Pagination parameters
   * @returns Paginated list of following users
   */
  async getFollowing(
    userId: string,
    params: GetPaginationParams = { offset: 0, limit: 10 },
  ) {
    try {
      const { limit, offset } = params;

      // Get following
      const following = await db
        .select({
          id: usersModel.id,
          first_name: usersModel.first_name,
          last_name: usersModel.last_name,
          username: usersModel.username,
          email: usersModel.email,
          image: usersModel.image,
          followers_count: usersModel.followers_count,
          following_count: usersModel.following_count,
          created_at: user_follows.created_at,
        })
        .from(user_follows)
        .innerJoin(usersModel, eq(user_follows.following_id, usersModel.id))
        .where(
          and(
            eq(user_follows.follower_id, userId),
            isNull(user_follows.deleted_at),
            isNull(usersModel.deleted_at),
          ),
        )
        .orderBy(desc(user_follows.created_at))
        .limit(limit)
        .offset(offset);

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(user_follows)
        .innerJoin(usersModel, eq(user_follows.following_id, usersModel.id))
        .where(
          and(
            eq(user_follows.follower_id, userId),
            isNull(user_follows.deleted_at),
            isNull(usersModel.deleted_at),
          ),
        );

      const meta = getPaginationMetadata(totalResult[0].count, offset, limit);
      return { data: following, meta };
    } catch (error) {
      console.error("Error fetching following:", error);
      throw Errors.DatabaseError({
        message: "Failed to fetch following",
        error,
      });
    }
  }

  /**
   * Check if a user is following another user
   * @param follower_id ID of the potential follower
   * @param following_id ID of the potential following
   * @returns Boolean indicating if following
   */
  async isFollowing(
    follower_id: string,
    following_id: string,
  ): Promise<boolean> {
    try {
      const follow = await db.query.user_follows.findFirst({
        where: and(
          eq(user_follows.follower_id, follower_id),
          eq(user_follows.following_id, following_id),
          isNull(user_follows.deleted_at),
        ),
      });

      return !!follow;
    } catch (error) {
      console.error("Error checking follow status:", error);
      throw Errors.DatabaseError({
        message: "Failed to check follow status",
        error,
      });
    }
  }
}
