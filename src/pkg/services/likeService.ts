import postgres from 'postgres';
import * as Schema from '../../database/schema/schema';
import { HTTPException } from 'hono/http-exception';
import { db } from '../../database/drizzel';
import { and, eq } from 'drizzle-orm';
export class LikeService {
    static async updateLike(post_id: string, auth_id: string) {
        try {
            const checkLike = await db
                .select({ id: Schema.likes.id })
                .from(Schema.likes)
                .where(and(eq(Schema.likes.created_by, auth_id), eq(Schema.likes.post_id, post_id)));
            if (checkLike.length > 0) {
                console.log("ada data");
                const deletresult = await db.delete(Schema.likes).returning();
                return deletresult[0];
            } else {
                console.log("tidak ada data");
                const like = await db
                    .insert(Schema.likes)
                    .values({ post_id: post_id, created_by: auth_id })
                    .returning({
                        id: Schema.likes.id,
                    });
                return like[0];
            }

        } catch (error) {
            if (error instanceof postgres.PostgresError) {
                if (error.code == "23505") {
                    throw new HTTPException(400, { message: "already liked" });
                }
            } else {
                console.log(error);
                throw new HTTPException(500, { message: "internal server error" });
            }
        }
    }

    static async getLikes(post_id: string) {
        const like = await db
            .select({
                id: Schema.likes.id,
                created_at: Schema.likes.created_at
            })
            .from(Schema.likes)
            .where(eq(Schema.likes.post_id, post_id));
        return like;
    }
}