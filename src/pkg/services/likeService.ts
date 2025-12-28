import { likes } from "../../database/schemas/postgre/schema";
import { db } from "../../database/drizzle";
import { and, eq } from "drizzle-orm";
import { Errors } from "../../utils/error";

export class LikeService {
  async updateLike(post_id: string, authId: string) {
    try {
      const checkLike = await db
        .select({ id: likes.id })
        .from(likes)
        .where(and(eq(likes.user_id, authId), eq(likes.post_id, post_id)));
      if (checkLike.length > 0) {
        const deletresult = await db
          .delete(likes)
          .where(and(eq(likes.user_id, authId), eq(likes.post_id, post_id)))
          .returning();
        return deletresult[0];
      } else {
        const like = await db
          .insert(likes)
          .values({ post_id: post_id, user_id: authId })
          .returning({
            id: likes.id,
          });
        return like[0];
      }
    } catch (error) {
      console.error("Update like error:", error);
      throw Errors.InternalServerError();
    }
  }

  async getLikes(post_id: string) {
    const like = await db
      .select({
        id: likes.id,
        created_at: likes.created_at,
      })
      .from(likes)
      .where(eq(likes.post_id, post_id));
    return like;
  }
}
