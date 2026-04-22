import { randomUUIDv7 } from 'bun';
import { db } from '../../../database/drizzle';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import {
  profiles,
  users as usersModel,
} from '../../../database/schemas/postgres/schema';
import type { NotificationService } from '../../notifications/services/notificationService';
import type { UserCreateBody, UserUpdateBody, UpdateProfileBody } from '../validation';
import type { UserSignup } from '../../auth/validation';
import type { GetPaginationParams } from '../../../types/paginate';
import { getPaginationMetadata } from '../../../utils/paginate';
import { Errors } from '../../../utils/error';
import type { GithubUser } from '../../../types/auth';
import { UserFollowService } from './userFollowService';
import { UserImageService } from './userImageService';

/**
 * Service class for managing user operations
 * Handles CRUD operations, authentication helpers, and user queries
 */
export class UserService {
  private followService: UserFollowService;
  private imageService: UserImageService;

  constructor(private notificationService?: NotificationService) {
    this.followService = new UserFollowService(notificationService);
    this.imageService = new UserImageService();
  }

  // ===== Follow delegation =====
  async followUser(follower_id: string, following_id: string) {
    return this.followService.followUser(follower_id, following_id);
  }

  async unfollowUser(follower_id: string, following_id: string) {
    return this.followService.unfollowUser(follower_id, following_id);
  }

  async getFollowers(userId: string, params?: GetPaginationParams) {
    return this.followService.getFollowers(userId, params);
  }

  async getFollowing(userId: string, params?: GetPaginationParams) {
    return this.followService.getFollowing(userId, params);
  }

  async isFollowing(follower_id: string, following_id: string) {
    return this.followService.isFollowing(follower_id, following_id);
  }

  // ===== Image delegation =====
  async updateUserImage(userId: string, imageFile: File) {
    return this.imageService.updateUserImage(userId, imageFile);
  }

  async mirrorOAuthAvatarToStorage(userId: string, avatarUrl: string) {
    return this.imageService.mirrorOAuthAvatarToStorage(userId, avatarUrl);
  }

  // ===== Core CRUD =====
  /**
   * Get paginated list of users (excluding passwords)
   * @param params Pagination parameters (limit, offset)
   * @returns Paginated user data with metadata
   */
  async getUsers(params: GetPaginationParams = { offset: 0, limit: 10 }) {
    try {
      const { limit, offset } = params;
      const [data, totalRows] = await Promise.all([
        db.query.users.findMany({
          columns: { password: false, github_id: false },
          orderBy: [desc(usersModel.created_at)],
          where: isNull(usersModel.deleted_at),
          limit,
          offset,
        }),
        db.select({ count: count() }).from(usersModel).where(isNull(usersModel.deleted_at)),
      ]);

      const meta = getPaginationMetadata(totalRows[0].count, offset, limit);
      return { data, meta };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw Errors.DatabaseError({ message: 'Failed to fetch users', error });
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
        columns: { password: false, last_logged_at: false, github_id: false },
        where: and(eq(usersModel.id, id), isNull(usersModel.deleted_at)),
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      throw Errors.DatabaseError({ message: 'Failed to fetch user', error });
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
      return await db.query.users.findFirst({
        columns: { password: false, last_logged_at: false, github_id: false },
        where: and(eq(usersModel.id, id), isNull(usersModel.deleted_at)),
        ...(profile && { with: { profiles: true } }),
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw Errors.DatabaseError({
        message: 'Failed to fetch user profile',
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
        throw Errors.NotFound('User');
      }

      const result = await db
        .update(usersModel)
        .set({ deleted_at: new Date().toISOString() })
        .where(eq(usersModel.id, userId))
        .returning({ id: usersModel.id });

      return result[0];
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      console.error('Error deleting user:', error);
      throw Errors.DatabaseError({ message: 'Failed to delete user', error });
    }
  }

  /**
   * Create a new user with hashed password and profile
   * @param body User creation data
   * @returns Created user ID
   */
  async addUser(body: UserCreateBody) {
    try {
      const [existingUsername, existingEmail] = await Promise.all([
        this.getUserCountByUsername(body.username),
        this.getUserCountByEmail(body.email),
      ]);
      if (existingUsername > 0) {
        throw Errors.BusinessRuleViolation('Username already exists');
      }
      if (existingEmail > 0) {
        throw Errors.BusinessRuleViolation('Email already exists');
      }

      const hashedPassword = await Bun.password.hash(body.password, {
        algorithm: 'bcrypt',
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
      if (error instanceof Error && error.message.includes('already exists')) {
        throw error;
      }
      console.error('Error creating user:', error);
      throw Errors.DatabaseError({ message: 'Failed to create user', error });
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
        throw Errors.NotFound('User');
      }

      // Check for username/email conflicts if being updated
      if (body.username && body.username !== existingUser.username) {
        const usernameCount = await this.getUserCountByUsername(body.username);
        if (usernameCount > 0) {
          throw Errors.BusinessRuleViolation('Username already exists');
        }
      }

      if (body.email && body.email !== existingUser.email) {
        const emailCount = await this.getUserCountByEmail(body.email);
        if (emailCount > 0) {
          throw Errors.BusinessRuleViolation('Email already exists');
        }
      }

      const updateData = {
        ...(Object.fromEntries(
          Object.entries(body).filter(([, v]) => v !== undefined)
        ) as Partial<UserUpdateBody>),
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
        (error.message.includes('not found') || error.message.includes('already exists'))
      ) {
        throw error;
      }
      console.error('Error updating user:', error);
      throw Errors.DatabaseError({ message: 'Failed to update user', error });
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
        throw Errors.NotFound('User');
      }

      const [updatedProfile] = await db
        .update(profiles)
        .set({ ...body, updated_at: new Date().toISOString() })
        .where(eq(profiles.user_id, userId))
        .returning();

      return updatedProfile;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      console.error('Error updating profile:', error);
      throw Errors.DatabaseError({
        message: 'Failed to update profile',
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
        where: and(eq(usersModel.github_id, githubId), isNull(usersModel.deleted_at)),
      });
    } catch (error) {
      console.error('Error fetching user by GitHub ID:', error);
      throw Errors.DatabaseError({
        message: 'Failed to fetch user by GitHub ID',
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
        .where(and(eq(usersModel.username, username), isNull(usersModel.deleted_at)));
      return result[0].count;
    } catch (error) {
      console.error('Error counting users by username:', error);
      throw Errors.DatabaseError({
        message: 'Failed to count users by username',
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
      console.error('Error counting users by email:', error);
      throw Errors.DatabaseError({
        message: 'Failed to count users by email',
        error,
      });
    }
  }

  /**
   * Create user from signup data (used by auth service)
   * @param data User signup data
   * @param tx Optional database transaction
   * @returns Created user object
   */
  async createUser(data: UserSignup, tx?: any) {
    try {
      const dbClient = tx || db;
      const [user] = await dbClient
        .insert(usersModel)
        .values({ ...data, id: randomUUIDv7() })
        .returning();

      await dbClient.insert(profiles).values({ user_id: user.id });

      return user;
    } catch (error) {
      console.error('Error creating user from signup:', error);
      throw Errors.DatabaseError({ message: 'Failed to create user', error });
    }
  }

  /**
   * Create user from GitHub OAuth data
   * @param githubUser GitHub user data from API
   * @param tx Optional database transaction
   * @returns Created user object
   */
  async createUserFromGithub(githubUser: GithubUser, tx?: any) {
    try {
      const dbClient = tx || db;
      // Handle email - if null, use fallback format
      let email = githubUser.email;
      if (!email || email.trim() === '') {
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
      username = username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

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
      while ((await this.getUserCountByUsername(finalUsername)) > 0) {
        const suffix = counter.toString();
        const maxLength = 20 - suffix.length;
        finalUsername = `${username.substring(0, maxLength)}${suffix}`;
        counter++;

        // Safety check to prevent infinite loop
        if (counter > 1000) {
          throw Errors.BusinessRuleViolation(
            'Unable to generate unique username. Please contact support.'
          );
        }
      }

      // Handle name - split if available, otherwise fall back to login name
      let firstName = githubUser.login || 'user';
      let lastName = '';
      if (githubUser.name) {
        const nameParts = githubUser.name.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          firstName = nameParts[0].substring(0, 100);
          lastName = nameParts.slice(1).join(' ').substring(0, 100);
        } else if (nameParts.length === 1) {
          firstName = nameParts[0].substring(0, 100);
        }
      }

      // Create user
      const [user] = await dbClient
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
      await dbClient.insert(profiles).values({ user_id: user.id });

      return user;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('already registered') ||
          error.message.includes('Unable to generate'))
      ) {
        throw error;
      }
      console.error('Error creating user from GitHub:', error);
      throw Errors.DatabaseError({
        message: 'Failed to create user from GitHub',
        error,
      });
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
        columns: { password: false, last_logged_at: false, github_id: false },
        with: { profiles: true },
        where: and(eq(usersModel.id, id), isNull(usersModel.deleted_at)),
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw Errors.DatabaseError({
        message: 'Failed to fetch user profile',
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
      console.error('Error fetching user by email:', error);
      throw Errors.DatabaseError({
        message: 'Failed to fetch user by email',
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
        where: and(eq(usersModel.username, username), isNull(usersModel.deleted_at)),
      });
    } catch (error) {
      console.error('Error fetching user by username:', error);
      throw Errors.DatabaseError({
        message: 'Failed to fetch user by username',
        error,
      });
    }
  }

  /**
   * Get user by username (public data, excludes password, includes profile)
   * @param username Username
   * @returns User object with profile or null if not found
   */
  async getUserByUsername(username: string) {
    try {
      return await db.query.users.findFirst({
        columns: { password: false, last_logged_at: false, github_id: false },
        with: { profiles: true },
        where: and(eq(usersModel.username, username), isNull(usersModel.deleted_at)),
      });
    } catch (error) {
      console.error('Error fetching user by username:', error);
      throw Errors.DatabaseError({
        message: 'Failed to fetch user by username',
        error,
      });
    }
  }

  /**
   * Update user password
   * @param id User ID
   * @param password Hashed password
   * @param tx Optional database transaction
   * @returns Updated user ID
   */
  async updatePassword(id: string, password: string, tx?: any) {
    try {
      const dbClient = tx || db;
      const [result] = await dbClient
        .update(usersModel)
        .set({ password, updated_at: new Date().toISOString() })
        .where(eq(usersModel.id, id))
        .returning({ id: usersModel.id });

      return result;
    } catch (error) {
      console.error('Error updating password:', error);
      throw Errors.DatabaseError({
        message: 'Failed to update password',
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
      console.error('Error updating email:', error);
      throw Errors.DatabaseError({ message: 'Failed to update email', error });
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
      console.error('Error fetching user with password:', error);
      throw Errors.DatabaseError({ message: 'Failed to fetch user', error });
    }
  }
}
