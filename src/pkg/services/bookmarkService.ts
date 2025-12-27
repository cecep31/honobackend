import { postBookmarks } from "../../database/schemas/postgre/schema";
import { db } from "../../database/drizzle";
import { and, eq } from "drizzle-orm";
import { errorHttp } from "../../utils/error";
import { randomUUIDv7 } from "bun";

export class BookmarkService {
  async toggleBookmark(post_id: string, user_id: string) {
    try {
      const checkBookmark = await db
        .select({ id: postBookmarks.id })
        .from(postBookmarks)
        .where(and(eq(postBookmarks.user_id, user_id), eq(postBookmarks.post_id, post_id)));
      
      if (checkBookmark.length > 0) {
        // Remove bookmark
        const deleted = await db.delete(postBookmarks)
          .where(and(eq(postBookmarks.user_id, user_id), eq(postBookmarks.post_id, post_id)))
          .returning();
        return { action: 'removed', ...deleted[0] };
      } else {
        // Add bookmark
        const bookmark = await db
          .insert(postBookmarks)
          .values({ 
            id: randomUUIDv7(),
            post_id, 
            user_id 
          })
          .returning();
        return { action: 'added', ...bookmark[0] };
      }
    } catch (error) {
      console.log(error);
      throw errorHttp("internal server error", 500);
    }
  }

  async getBookmarksByUser(user_id: string) {
    try {
      const bookmarks = await db.query.postBookmarks.findMany({
         where: eq(postBookmarks.user_id, user_id),
         with: {
             post: {
                with: {
                    user: {
                        columns: { password: false }
                    }
                }
             }
         }
      });
      return bookmarks;
    } catch (error) {
      console.log(error);
      throw errorHttp("internal server error", 500);
    }
  }
}
