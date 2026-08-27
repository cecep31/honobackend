import { post_likes } from '../../../database/schemas/postgres/schema';
import { db } from '../../../database/drizzle';
import { and, count, eq } from 'drizzle-orm';
import { Errors } from '../../../utils/error';

export class LikeService {
  async likePost(post_id: string, authId: string) {
    try {
      const [existingLike] = await db
        .select({ id: post_likes.id })
        .from(post_likes)
        .where(and(eq(post_likes.user_id, authId), eq(post_likes.post_id, post_id)));

      if (existingLike) {
        return existingLike;
      }

      const [like] = await db
        .insert(post_likes)
        .values({ post_id, user_id: authId })
        .returning({ id: post_likes.id });
      return like;
    } catch (error) {
      console.error('Like post error:', error);
      throw Errors.InternalServerError();
    }
  }

  async unlikePost(post_id: string, authId: string) {
    try {
      const [deleted] = await db
        .delete(post_likes)
        .where(and(eq(post_likes.user_id, authId), eq(post_likes.post_id, post_id)))
        .returning();
      return deleted || null;
    } catch (error) {
      console.error('Unlike post error:', error);
      throw Errors.InternalServerError();
    }
  }

  async updateLike(post_id: string, authId: string) {
    try {
      return await db.transaction(async (tx) => {
        const [existingLike] = await tx
          .select({ id: post_likes.id })
          .from(post_likes)
          .where(and(eq(post_likes.user_id, authId), eq(post_likes.post_id, post_id)));

        if (existingLike) {
          const [deleted] = await tx
            .delete(post_likes)
            .where(eq(post_likes.id, existingLike.id))
            .returning();
          return deleted;
        }

        const [like] = await tx
          .insert(post_likes)
          .values({ post_id, user_id: authId })
          .returning({ id: post_likes.id });
        return like;
      });
    } catch (error) {
      console.error('Update like error:', error);
      throw Errors.InternalServerError();
    }
  }

  async getLikes(post_id: string) {
    const like = await db
      .select({
        id: post_likes.id,
        created_at: post_likes.created_at,
      })
      .from(post_likes)
      .where(eq(post_likes.post_id, post_id));
    return like;
  }

  /**
   * Aggregated like statistics for a post (mirrors echobackend's
   * `GET /api/posts/:id/like-stats`).
   */
  async getLikeStats(post_id: string) {
    const rows = await db
      .select({ total_likes: count() })
      .from(post_likes)
      .where(eq(post_likes.post_id, post_id));

    return {
      post_id,
      total_likes: rows[0]?.total_likes ?? 0,
    };
  }

  /**
   * Check whether a user has liked a post (mirrors echobackend's
   * `GET /api/posts/:id/liked`).
   */
  async hasUserLiked(post_id: string, user_id: string) {
    const rows = await db
      .select({ id: post_likes.id })
      .from(post_likes)
      .where(and(eq(post_likes.post_id, post_id), eq(post_likes.user_id, user_id)))
      .limit(1);

    return {
      has_liked: rows.length > 0,
      post_id,
      user_id,
    };
  }
}
