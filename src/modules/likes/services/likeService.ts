import { post_likes } from '../../../database/schemas/postgres/schema';
import { db } from '../../../database/drizzle';
import { and, eq } from 'drizzle-orm';
import { Errors } from '../../../utils/error';

export class LikeService {
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
}
