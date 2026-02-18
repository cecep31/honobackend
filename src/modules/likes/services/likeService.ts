import { post_likes } from "../../../database/schemas/postgre/schema";
import { db } from "../../../database/drizzle";
import { and, eq } from "drizzle-orm";
import { Errors } from "../../../utils/error";

export class LikeService {
  async updateLike(post_id: string, authId: string) {
    try {
      const checkLike = await db
        .select({ id: post_likes.id })
        .from(post_likes)
        .where(
          and(
            eq(post_likes.user_id, authId),
            eq(post_likes.post_id, post_id)
          )
        );
      if (checkLike.length > 0) {
        // Hard delete
        const deleteResult = await db
          .delete(post_likes)
          .where(
            and(
              eq(post_likes.user_id, authId),
              eq(post_likes.post_id, post_id)
            )
          )
          .returning();
        return deleteResult[0];
      } else {
        // Create new like
        const like = await db
          .insert(post_likes)
          .values({ post_id: post_id, user_id: authId })
          .returning({
            id: post_likes.id,
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
        id: post_likes.id,
        created_at: post_likes.created_at,
      })
      .from(post_likes)
      .where(eq(post_likes.post_id, post_id));
    return like;
  }
}
