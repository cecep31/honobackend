import { randomUUIDv7 } from 'bun';
import { db } from '../../../database/drizzle';
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import {
  users as usersModel,
  user_follows,
} from '../../../database/schemas/postgres/schema';
import type { NotificationService } from '../../notifications/services/notificationService';
import type { GetPaginationParams } from '../../../types/paginate';
import { getPaginationMetadata } from '../../../utils/paginate';
import { Errors } from '../../../utils/error';

export class UserFollowService {
  constructor(private notificationService?: NotificationService) {}

  /**
   * Follow a user
   * @param follower_id ID of the user who is following
   * @param following_id ID of the user being followed
   * @returns Created follow relationship
   */
  async followUser(follower_id: string, following_id: string) {
    try {
      const [follower, following] = await Promise.all([
        db.query.users.findFirst({
          columns: { id: true, username: true },
          where: and(eq(usersModel.id, follower_id), isNull(usersModel.deleted_at)),
        }),
        db.query.users.findFirst({
          columns: { id: true },
          where: and(eq(usersModel.id, following_id), isNull(usersModel.deleted_at)),
        }),
      ]);

      if (!follower) throw Errors.NotFound('Follower user');
      if (!following) throw Errors.NotFound('Following user');

      const follow = await db.transaction(async (tx) => {
        const existingFollow = await tx.query.user_follows.findFirst({
          where: and(
            eq(user_follows.follower_id, follower_id),
            eq(user_follows.following_id, following_id),
            isNull(user_follows.deleted_at)
          ),
        });

        if (existingFollow) {
          throw Errors.BusinessRuleViolation('Already following this user');
        }

        const [follow] = await tx
          .insert(user_follows)
          .values({ id: randomUUIDv7(), follower_id, following_id })
          .returning();

        const now = new Date().toISOString();
        await Promise.all([
          tx
            .update(usersModel)
            .set({
              following_count: sql`${usersModel.following_count} + 1`,
              updated_at: now,
            })
            .where(eq(usersModel.id, follower_id)),
          tx
            .update(usersModel)
            .set({
              followers_count: sql`${usersModel.followers_count} + 1`,
              updated_at: now,
            })
            .where(eq(usersModel.id, following_id)),
        ]);

        return follow;
      });

      if (this.notificationService && follower_id !== following_id) {
        await this.notificationService.createNotification({
          user_id: following_id,
          type: 'user_followed',
          title: 'New follower',
          message: `${follower.username} started following you.`,
          data: {
            actor_user_id: follower_id,
            actor_username: follower.username,
            follow_id: follow.id,
          },
        });
      }

      return follow;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Already following'))
      ) {
        throw error;
      }
      console.error('Error following user:', error);
      throw Errors.DatabaseError({ message: 'Failed to follow user', error });
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
      return await db.transaction(async (tx) => {
        const existingFollow = await tx.query.user_follows.findFirst({
          where: and(
            eq(user_follows.follower_id, follower_id),
            eq(user_follows.following_id, following_id),
            isNull(user_follows.deleted_at)
          ),
        });

        if (!existingFollow) {
          throw Errors.NotFound('Follow relationship');
        }

        const now = new Date().toISOString();

        const [[unfollow]] = await Promise.all([
          tx
            .update(user_follows)
            .set({ deleted_at: now })
            .where(eq(user_follows.id, existingFollow.id))
            .returning(),
          tx
            .update(usersModel)
            .set({
              following_count: sql`GREATEST(${usersModel.following_count} - 1, 0)`,
              updated_at: now,
            })
            .where(eq(usersModel.id, follower_id)),
          tx
            .update(usersModel)
            .set({
              followers_count: sql`GREATEST(${usersModel.followers_count} - 1, 0)`,
              updated_at: now,
            })
            .where(eq(usersModel.id, following_id)),
        ]);

        return unfollow;
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      console.error('Error unfollowing user:', error);
      throw Errors.DatabaseError({ message: 'Failed to unfollow user', error });
    }
  }

  /**
   * Get list of followers for a user
   * @param userId User ID
   * @param params Pagination parameters
   * @returns Paginated list of followers
   */
  async getFollowers(userId: string, params: GetPaginationParams = { offset: 0, limit: 10 }) {
    try {
      const { limit, offset } = params;

      const followersWhere = and(
        eq(user_follows.following_id, userId),
        isNull(user_follows.deleted_at),
        isNull(usersModel.deleted_at)
      );

      const [followers, totalResult] = await Promise.all([
        db
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
          .where(followersWhere)
          .orderBy(desc(user_follows.created_at))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: count() })
          .from(user_follows)
          .innerJoin(usersModel, eq(user_follows.follower_id, usersModel.id))
          .where(followersWhere),
      ]);

      const meta = getPaginationMetadata(totalResult[0].count, offset, limit);
      return { data: followers, meta };
    } catch (error) {
      console.error('Error fetching followers:', error);
      throw Errors.DatabaseError({
        message: 'Failed to fetch followers',
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
  async getFollowing(userId: string, params: GetPaginationParams = { offset: 0, limit: 10 }) {
    try {
      const { limit, offset } = params;

      const followingWhere = and(
        eq(user_follows.follower_id, userId),
        isNull(user_follows.deleted_at),
        isNull(usersModel.deleted_at)
      );

      const [following, totalResult] = await Promise.all([
        db
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
          .where(followingWhere)
          .orderBy(desc(user_follows.created_at))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: count() })
          .from(user_follows)
          .innerJoin(usersModel, eq(user_follows.following_id, usersModel.id))
          .where(followingWhere),
      ]);

      const meta = getPaginationMetadata(totalResult[0].count, offset, limit);
      return { data: following, meta };
    } catch (error) {
      console.error('Error fetching following:', error);
      throw Errors.DatabaseError({
        message: 'Failed to fetch following',
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
  async isFollowing(follower_id: string, following_id: string): Promise<boolean> {
    try {
      const follow = await db.query.user_follows.findFirst({
        where: and(
          eq(user_follows.follower_id, follower_id),
          eq(user_follows.following_id, following_id),
          isNull(user_follows.deleted_at)
        ),
      });

      return !!follow;
    } catch (error) {
      console.error('Error checking follow status:', error);
      throw Errors.DatabaseError({
        message: 'Failed to check follow status',
        error,
      });
    }
  }
}
