import postgres from "postgres";
import { likes } from "../../database/schemas/postgre/schema";
import { db } from "../../database/drizzel";
import { and, eq } from "drizzle-orm";
import { errorHttp } from "../../utils/error";

export class LikeService {
  static async updateLike(postId: string, authId: string) {
    try {
      const checkLike = await db
        .select({ id: likes.id })
        .from(likes)
        .where(and(eq(likes.createdBy, authId), eq(likes.postId, postId)));
      if (checkLike.length > 0) {
        console.log("ada data");
        const deletresult = await db.delete(likes).returning();
        return deletresult[0];
      } else {
        console.log("tidak ada data");
        const like = await db
          .insert(likes)
          .values({ postId: postId, createdBy: authId })
          .returning({
            id: likes.id,
          });
        return like[0];
      }
    } catch (error) {
      if (error instanceof postgres.PostgresError) {
        if (error.code == "23505") {
          throw errorHttp("already liked", 400);
        }
      } else {
        console.log(error);
        throw errorHttp("internal server error", 500);
      }
    }
  }

  static async getLikes(post_id: string) {
    const like = await db
      .select({
        id: likes.id,
        created_at: likes.createdAt,
      })
      .from(likes)
      .where(eq(likes.postId, post_id));
    return like;
  }
}
