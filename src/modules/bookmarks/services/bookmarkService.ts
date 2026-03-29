import { post_bookmarks, bookmark_folders } from '../../../database/schemas/postgres/schema';
import { db } from '../../../database/drizzle';
import { and, eq, isNull } from 'drizzle-orm';
import { Errors } from '../../../utils/error';

export class BookmarkService {
  async toggleBookmark(
    post_id: string,
    user_id: string,
    folder_id?: string,
    name?: string,
    notes?: string
  ) {
    try {
      const checkBookmark = await db
        .select({ id: post_bookmarks.id })
        .from(post_bookmarks)
        .where(and(eq(post_bookmarks.user_id, user_id), eq(post_bookmarks.post_id, post_id)));

      if (checkBookmark.length > 0) {
        const deleted = await db
          .delete(post_bookmarks)
          .where(and(eq(post_bookmarks.user_id, user_id), eq(post_bookmarks.post_id, post_id)))
          .returning();
        return { action: 'removed', ...deleted[0] };
      } else {
        const bookmark = await db
          .insert(post_bookmarks)
          .values({ post_id, user_id, folder_id, name, notes })
          .returning();
        return { action: 'added', ...bookmark[0] };
      }
    } catch (error) {
      console.error('Toggle bookmark error:', error);
      throw Errors.InternalServerError();
    }
  }

  async moveToFolder(bookmark_id: string, user_id: string, folder_id: string | null) {
    try {
      if (folder_id) {
        const folder = await db.query.bookmark_folders.findFirst({
          where: and(eq(bookmark_folders.id, folder_id), eq(bookmark_folders.user_id, user_id)),
        });
        if (!folder) {
          throw Errors.NotFound('Folder');
        }
      }

      const updated = await db
        .update(post_bookmarks)
        .set({ folder_id })
        .where(and(eq(post_bookmarks.id, bookmark_id), eq(post_bookmarks.user_id, user_id)))
        .returning();

      if (updated.length === 0) {
        throw Errors.NotFound('Bookmark');
      }

      return updated[0];
    } catch (error) {
      console.error('Move bookmark error:', error);
      throw error;
    }
  }

  async updateBookmark(
    bookmark_id: string,
    user_id: string,
    data: { name?: string; notes?: string }
  ) {
    try {
      const updated = await db
        .update(post_bookmarks)
        .set({ ...data, updated_at: new Date().toISOString() })
        .where(and(eq(post_bookmarks.id, bookmark_id), eq(post_bookmarks.user_id, user_id)))
        .returning();

      if (updated.length === 0) {
        throw Errors.NotFound('Bookmark');
      }

      return updated[0];
    } catch (error) {
      console.error('Update bookmark error:', error);
      throw Errors.InternalServerError();
    }
  }

  async getBookmarksByUser(user_id: string, folder_id?: string) {
    try {
      let whereClause = eq(post_bookmarks.user_id, user_id);

      if (folder_id === 'null' || folder_id === null) {
        whereClause = and(whereClause, isNull(post_bookmarks.folder_id)) as typeof whereClause;
      } else if (folder_id) {
        whereClause = and(
          whereClause,
          eq(post_bookmarks.folder_id, folder_id)
        ) as typeof whereClause;
      }

      const bookmarks = await db.query.post_bookmarks.findMany({
        where: whereClause,
        with: {
          post: {
            with: {
              user: {
                columns: { password: false },
              },
            },
          },
          folder: true,
        },
      });
      return bookmarks;
    } catch (error) {
      console.error('Get bookmarks error:', error);
      throw Errors.InternalServerError();
    }
  }

  async createFolder(user_id: string, name: string, description?: string) {
    try {
      const folder = await db
        .insert(bookmark_folders)
        .values({ user_id, name, description })
        .returning();
      return folder[0];
    } catch (error) {
      console.error('Create folder error:', error);
      throw Errors.InternalServerError();
    }
  }

  async updateFolder(
    folder_id: string,
    user_id: string,
    data: { name?: string; description?: string }
  ) {
    try {
      const updated = await db
        .update(bookmark_folders)
        .set({ ...data, updated_at: new Date().toISOString() })
        .where(and(eq(bookmark_folders.id, folder_id), eq(bookmark_folders.user_id, user_id)))
        .returning();

      if (updated.length === 0) {
        throw Errors.NotFound('Folder');
      }

      return updated[0];
    } catch (error) {
      console.error('Update folder error:', error);
      throw Errors.InternalServerError();
    }
  }

  async deleteFolder(folder_id: string, user_id: string) {
    try {
      const deleted = await db
        .delete(bookmark_folders)
        .where(and(eq(bookmark_folders.id, folder_id), eq(bookmark_folders.user_id, user_id)))
        .returning();

      if (deleted.length === 0) {
        throw Errors.NotFound('Folder');
      }

      return deleted[0];
    } catch (error) {
      console.error('Delete folder error:', error);
      throw Errors.InternalServerError();
    }
  }

  async getFoldersByUser(user_id: string) {
    try {
      const folders = await db.query.bookmark_folders.findMany({
        where: eq(bookmark_folders.user_id, user_id),
        with: {
          post_bookmarks: {
            columns: { id: true },
          },
        },
        orderBy: (folders, { desc }) => [desc(folders.created_at)],
      });

      return folders.map((folder) => ({
        ...folder,
        bookmark_count: folder.post_bookmarks?.length || 0,
        post_bookmarks: undefined,
      }));
    } catch (error) {
      console.error('Get folders error:', error);
      throw Errors.InternalServerError();
    }
  }
}
