import { likes } from "../../database/schemas/postgre/schema";
import { db } from "../../database/drizzel";
import { and, eq } from "drizzle-orm";
import { errorHttp } from "../../utils/error";

export class LikeService {
  static async updateLike(post_id: string, authId: string) {
    try {
      const checkLike = await db
        .select({ id: likes.id })
        .from(likes)
        .where(and(eq(likes.created_by, authId), eq(likes.post_id, post_id)));
      if (checkLike.length > 0) {
        console.log("ada data");
        const deletresult = await db.delete(likes).returning();
        return deletresult[0];
      } else {
        console.log("tidak ada data");
        const like = await db
          .insert(likes)
          .values({ post_id: post_id, created_by: authId })
          .returning({
            id: likes.id,
          });
        return like[0];
      }
    } catch (error) {
      console.log(error);
      throw errorHttp("internal server error", 500);
    }
  }

  static async getLikes(post_id: string) {
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
