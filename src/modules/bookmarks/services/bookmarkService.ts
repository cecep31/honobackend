import { post_bookmarks } from "../../../database/schemas/postgre/schema";
import { db } from "../../../database/drizzle";
import { and, eq } from "drizzle-orm";
import { Errors } from "../../../utils/error";

export class BookmarkService {
  async toggleBookmark(post_id: string, user_id: string) {
    try {
      const checkBookmark = await db
        .select({ id: post_bookmarks.id })
        .from(post_bookmarks)
        .where(and(eq(post_bookmarks.user_id, user_id), eq(post_bookmarks.post_id, post_id)));

      if (checkBookmark.length > 0) {
        // Hard delete - remove bookmark
        const deleted = await db
          .delete(post_bookmarks)
          .where(and(eq(post_bookmarks.user_id, user_id), eq(post_bookmarks.post_id, post_id)))
          .returning();
        return { action: 'removed', ...deleted[0] };
      } else {
        // Create new bookmark
        const bookmark = await db
          .insert(post_bookmarks)
          .values({ post_id, user_id })
          .returning();
        return { action: 'added', ...bookmark[0] };
      }
    } catch (error) {
      console.error("Toggle bookmark error:", error);
      throw Errors.InternalServerError();
    }
  }

  async getBookmarksByUser(user_id: string) {
    try {
      const bookmarks = await db.query.post_bookmarks.findMany({
        where: eq(post_bookmarks.user_id, user_id),
        with: {
          post: {
            with: {
              user: {
                columns: { password: false },
              },
            },
          },
        },
      });
      return bookmarks;
    } catch (error) {
      console.error("Get bookmarks error:", error);
      throw Errors.InternalServerError();
    }
  }
}
