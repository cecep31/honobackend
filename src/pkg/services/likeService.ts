import postgres from "postgres";
import { likes } from "../../database/schemas/postgres/schema";
import { db } from "../../database/drizzel";
import { and, eq } from "drizzle-orm";
import { errorHttp } from "../../utils/error";

export class LikeService {
  static async updateLike(post_id: string, auth_id: string) {
    try {
      const checkLike = await db
        .select({ id: likes.id })
        .from(likes)
        .where(and(eq(likes.created_by, auth_id), eq(likes.post_id, post_id)));
      if (checkLike.length > 0) {
        console.log("ada data");
        const deletresult = await db.delete(likes).returning();
        return deletresult[0];
      } else {
        console.log("tidak ada data");
        const like = await db
          .insert(likes)
          .values({ post_id: post_id, created_by: auth_id })
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
        created_at: likes.created_at,
      })
      .from(likes)
      .where(eq(likes.post_id, post_id));
    return like;
  }
}
