import { post_comments, posts, users } from '../../../database/schemas/postgres/schema';
import { db } from '../../../database/drizzle';
import { and, eq, isNull, desc, count } from 'drizzle-orm';
import { Errors } from '../../../utils/error';
import { randomUUIDv7 } from 'bun';
import { getPaginationMetadata } from '../../../utils/paginate';
import type { CreateCommentInput, UpdateCommentInput } from '../validation';
import type { NotificationService } from '../../notifications/services/notificationService';

/** Reusable column selection for public user info on comments */
const COMMENT_USER_COLUMNS = {
  id: true,
  username: true,
  first_name: true,
  last_name: true,
  image: true,
} as const;

export class CommentService {
  constructor(private notificationService?: NotificationService) {}

  async createComment(data: CreateCommentInput, user_id: string) {
    try {
      // Verify post exists
      const postExists = await db
        .select({ id: posts.id })
        .from(posts)
        .where(and(eq(posts.id, data.post_id), isNull(posts.deleted_at)));

      if (postExists.length === 0) {
        throw Errors.NotFound('Post not found');
      }

      const [postMeta] = await db
        .select({
          id: posts.id,
          title: posts.title,
          created_by: posts.created_by,
        })
        .from(posts)
        .where(and(eq(posts.id, data.post_id), isNull(posts.deleted_at)));

      // If parent_comment_id is provided, verify it exists
      let parentComment:
        | {
            id: string;
            created_by: string;
            text: string;
          }
        | undefined;
      if (data.parent_comment_id) {
        const parentExists = await db
          .select({ id: post_comments.id })
          .from(post_comments)
          .where(
            and(eq(post_comments.id, data.parent_comment_id), isNull(post_comments.deleted_at))
          );

        if (parentExists.length === 0) {
          throw Errors.NotFound('Parent comment not found');
        }

        [parentComment] = await db
          .select({
            id: post_comments.id,
            created_by: post_comments.created_by,
            text: post_comments.text,
          })
          .from(post_comments)
          .where(
            and(eq(post_comments.id, data.parent_comment_id), isNull(post_comments.deleted_at))
          );
      }

      const comment = await db
        .insert(post_comments)
        .values({
          id: randomUUIDv7(),
          text: data.text,
          post_id: data.post_id,
          parent_comment_id: data.parent_comment_id || null,
          created_by: user_id,
        })
        .returning();

      if (this.notificationService && postMeta) {
        const [actor] = await db
          .select({
            id: users.id,
            username: users.username,
          })
          .from(users)
          .where(and(eq(users.id, user_id), isNull(users.deleted_at)));

        if (!actor) {
          throw Errors.NotFound('User');
        }

        const recipients = new Set<string>();

        if (postMeta.created_by !== user_id) {
          recipients.add(postMeta.created_by);
        }

        if (parentComment && parentComment.created_by !== user_id) {
          recipients.add(parentComment.created_by);
        }

        for (const recipientId of recipients) {
          const isReplyTarget = parentComment?.created_by === recipientId;
          await this.notificationService.createNotification({
            user_id: recipientId,
            type: isReplyTarget ? 'comment_reply' : 'post_comment',
            title: isReplyTarget ? 'New reply on your comment' : 'New comment on your post',
            message: isReplyTarget
              ? `${actor.username} replied to your comment on "${postMeta.title}".`
              : `${actor.username} commented on your post "${postMeta.title}".`,
            data: {
              actor_user_id: actor.id,
              actor_username: actor.username,
              post_id: data.post_id,
              comment_id: comment[0].id,
              parent_comment_id: data.parent_comment_id ?? null,
            },
          });
        }
      }

      // Fetch comment with user details
      const commentWithUser = await db.query.post_comments.findFirst({
        where: eq(post_comments.id, comment[0].id),
        with: { user: { columns: COMMENT_USER_COLUMNS } },
      });

      return commentWithUser;
    } catch (error) {
      console.error('Create comment error:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw Errors.InternalServerError();
    }
  }

  async getCommentsByPost(post_id: string, offset: number = 0, limit: number = 20) {
    try {
      // Get top-level comments (no parent)
      const comments = await db.query.post_comments.findMany({
        where: and(
          eq(post_comments.post_id, post_id),
          isNull(post_comments.parent_comment_id),
          isNull(post_comments.deleted_at)
        ),
        with: { user: { columns: COMMENT_USER_COLUMNS } },
        orderBy: [desc(post_comments.created_at)],
        limit,
        offset,
      });

      // Get total count for pagination
      const [totalResult] = await db
        .select({ count: count() })
        .from(post_comments)
        .where(
          and(
            eq(post_comments.post_id, post_id),
            isNull(post_comments.parent_comment_id),
            isNull(post_comments.deleted_at)
          )
        );

      const total = totalResult?.count ?? 0;

      return {
        data: comments,
        meta: getPaginationMetadata(total, offset, limit),
      };
    } catch (error) {
      console.error('Get comments error:', error);
      throw Errors.InternalServerError();
    }
  }

  async getCommentReplies(parent_comment_id: string) {
    try {
      const replies = await db.query.post_comments.findMany({
        where: and(
          eq(post_comments.parent_comment_id, parent_comment_id),
          isNull(post_comments.deleted_at)
        ),
        with: { user: { columns: COMMENT_USER_COLUMNS } },
        orderBy: [desc(post_comments.created_at)],
      });

      return replies;
    } catch (error) {
      console.error('Get comment replies error:', error);
      throw Errors.InternalServerError();
    }
  }

  async getCommentById(comment_id: string) {
    try {
      const comment = await db.query.post_comments.findFirst({
        where: and(eq(post_comments.id, comment_id), isNull(post_comments.deleted_at)),
        with: { user: { columns: COMMENT_USER_COLUMNS } },
      });

      if (!comment) {
        throw Errors.NotFound('Comment not found');
      }

      return comment;
    } catch (error) {
      console.error('Get comment error:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw Errors.InternalServerError();
    }
  }

  async updateComment(comment_id: string, data: UpdateCommentInput, user_id: string) {
    try {
      // Check if comment exists and belongs to user
      const existingComment = await db
        .select({
          id: post_comments.id,
          created_by: post_comments.created_by,
        })
        .from(post_comments)
        .where(and(eq(post_comments.id, comment_id), isNull(post_comments.deleted_at)));

      if (existingComment.length === 0) {
        throw Errors.NotFound('Comment not found');
      }

      if (existingComment[0].created_by !== user_id) {
        throw Errors.Forbidden();
      }

      const updated = await db
        .update(post_comments)
        .set({
          text: data.text,
          updated_at: new Date().toISOString(),
        })
        .where(eq(post_comments.id, comment_id))
        .returning();

      // Fetch updated comment with user details
      const commentWithUser = await db.query.post_comments.findFirst({
        where: eq(post_comments.id, updated[0].id),
        with: { user: { columns: COMMENT_USER_COLUMNS } },
      });

      return commentWithUser;
    } catch (error) {
      console.error('Update comment error:', error);
      if (
        error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Forbidden'))
      ) {
        throw error;
      }
      throw Errors.InternalServerError();
    }
  }

  async deleteComment(comment_id: string, user_id: string) {
    try {
      // Check if comment exists and belongs to user
      const existingComment = await db
        .select({
          id: post_comments.id,
          created_by: post_comments.created_by,
        })
        .from(post_comments)
        .where(and(eq(post_comments.id, comment_id), isNull(post_comments.deleted_at)));

      if (existingComment.length === 0) {
        throw Errors.NotFound('Comment not found');
      }

      if (existingComment[0].created_by !== user_id) {
        throw Errors.Forbidden();
      }

      // Soft delete
      const deleted = await db
        .update(post_comments)
        .set({
          deleted_at: new Date().toISOString(),
        })
        .where(eq(post_comments.id, comment_id))
        .returning();

      return deleted[0];
    } catch (error) {
      console.error('Delete comment error:', error);
      if (
        error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Forbidden'))
      ) {
        throw error;
      }
      throw Errors.InternalServerError();
    }
  }

  async getCommentsByUser(user_id: string, offset: number = 0, limit: number = 20) {
    try {
      const comments = await db.query.post_comments.findMany({
        where: and(eq(post_comments.created_by, user_id), isNull(post_comments.deleted_at)),
        with: {
          user: { columns: COMMENT_USER_COLUMNS },
          post: {
            columns: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
        orderBy: [desc(post_comments.created_at)],
        limit,
        offset,
      });

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(post_comments)
        .where(and(eq(post_comments.created_by, user_id), isNull(post_comments.deleted_at)));

      const total = totalResult?.count ?? 0;

      return {
        data: comments,
        meta: getPaginationMetadata(total, offset, limit),
      };
    } catch (error) {
      console.error('Get user comments error:', error);
      throw Errors.InternalServerError();
    }
  }
}
