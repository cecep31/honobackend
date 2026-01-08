import { post_comments, posts } from "../../database/schemas/postgre/schema";
import { db } from "../../database/drizzle";
import { and, eq, isNull, desc, sql } from "drizzle-orm";
import { Errors } from "../../utils/error";
import { randomUUIDv7 } from "bun";
import type { CreateCommentInput, UpdateCommentInput } from "./validation/comment";

export class CommentService {
  async createComment(data: CreateCommentInput, user_id: string) {
    try {
      // Verify post exists
      const postExists = await db
        .select({ id: posts.id })
        .from(posts)
        .where(and(eq(posts.id, data.post_id), isNull(posts.deleted_at)));
      
      if (postExists.length === 0) {
        throw Errors.NotFound("Post not found");
      }

      // If parent_comment_id is provided, verify it exists
      if (data.parent_comment_id) {
        const parentExists = await db
          .select({ id: post_comments.id })
          .from(post_comments)
          .where(
            and(
              eq(post_comments.id, data.parent_comment_id.toString()),
              isNull(post_comments.deleted_at)
            )
          );
        
        if (parentExists.length === 0) {
          throw Errors.NotFound("Parent comment not found");
        }
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

      // Fetch comment with user details
      const commentWithUser = await db.query.post_comments.findFirst({
        where: eq(post_comments.id, comment[0].id),
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              first_name: true,
              last_name: true,
              image: true,
            },
          },
        },
      });

      return commentWithUser;
    } catch (error) {
      console.error("Create comment error:", error);
      if (error instanceof Error && error.message.includes("not found")) {
        throw error;
      }
      throw Errors.InternalServerError();
    }
  }

  async getCommentsByPost(post_id: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      // Get top-level comments (no parent)
      const comments = await db.query.post_comments.findMany({
        where: and(
          eq(post_comments.post_id, post_id),
          isNull(post_comments.parent_comment_id),
          isNull(post_comments.deleted_at)
        ),
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              first_name: true,
              last_name: true,
              image: true,
            },
          },
        },
        orderBy: [desc(post_comments.created_at)],
        limit,
        offset,
      });

      // Get total count for pagination
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(post_comments)
        .where(
          and(
            eq(post_comments.post_id, post_id),
            isNull(post_comments.parent_comment_id),
            isNull(post_comments.deleted_at)
          )
        );

      const total = Number(totalResult[0]?.count || 0);

      return {
        data: comments,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Get comments error:", error);
      throw Errors.InternalServerError();
    }
  }

  async getCommentReplies(parent_comment_id: string) {
    try {
      const replies = await db.query.post_comments.findMany({
        where: and(
          eq(post_comments.parent_comment_id, Number(parent_comment_id)),
          isNull(post_comments.deleted_at)
        ),
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              first_name: true,
              last_name: true,
              image: true,
            },
          },
        },
        orderBy: [desc(post_comments.created_at)],
      });

      return replies;
    } catch (error) {
      console.error("Get comment replies error:", error);
      throw Errors.InternalServerError();
    }
  }

  async getCommentById(comment_id: string) {
    try {
      const comment = await db.query.post_comments.findFirst({
        where: and(
          eq(post_comments.id, comment_id),
          isNull(post_comments.deleted_at)
        ),
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              first_name: true,
              last_name: true,
              image: true,
            },
          },
        },
      });

      if (!comment) {
        throw Errors.NotFound("Comment not found");
      }

      return comment;
    } catch (error) {
      console.error("Get comment error:", error);
      if (error instanceof Error && error.message.includes("not found")) {
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
        throw Errors.NotFound("Comment not found");
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
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              first_name: true,
              last_name: true,
              image: true,
            },
          },
        },
      });

      return commentWithUser;
    } catch (error) {
      console.error("Update comment error:", error);
      if (error instanceof Error && (error.message.includes("not found") || error.message.includes("Forbidden"))) {
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
        throw Errors.NotFound("Comment not found");
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
      console.error("Delete comment error:", error);
      if (error instanceof Error && (error.message.includes("not found") || error.message.includes("Forbidden"))) {
        throw error;
      }
      throw Errors.InternalServerError();
    }
  }

  async getCommentsByUser(user_id: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      const comments = await db.query.post_comments.findMany({
        where: and(
          eq(post_comments.created_by, user_id),
          isNull(post_comments.deleted_at)
        ),
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              first_name: true,
              last_name: true,
              image: true,
            },
          },
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
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(post_comments)
        .where(
          and(
            eq(post_comments.created_by, user_id),
            isNull(post_comments.deleted_at)
          )
        );

      const total = Number(totalResult[0]?.count || 0);

      return {
        data: comments,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Get user comments error:", error);
      throw Errors.InternalServerError();
    }
  }
}
