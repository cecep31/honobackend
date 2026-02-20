import { and, eq, isNull, desc, asc, ilike, or, count, sql } from "drizzle-orm";
import { db } from "../../../database/drizzle";
import {
  posts as postsModel,
} from "../../../database/schemas/postgre/schema";

export class PostQueryHelpers {
  static getBasePostQuery() {
    return {
      where: isNull(postsModel.deleted_at),
      with: {
        user: {
          columns: { password: false, github_id: false, last_logged_at: false },
        },
        posts_to_tags: { columns: {}, with: { tag: true } },
      },
    };
  }

  static getPublishedPostQuery() {
    return {
      where: and(isNull(postsModel.deleted_at), eq(postsModel.published, true)),
      with: {
        user: {
          columns: { password: false, github_id: false, last_logged_at: false },
        },
        posts_to_tags: { columns: {}, with: { tag: true } },
      },
    };
  }

  static getPostWithSnippetQuery() {
    return {
      columns: { body: false },
      extras: {
        body_snippet: sql<string>`substring(${postsModel.body} from 1 for 200)`.as("body_snippet"),
      },
      with: {
        user: {
          columns: { password: false, github_id: false, last_logged_at: false },
        },
        posts_to_tags: { columns: {}, with: { tag: true } },
      },
    };
  }

  static buildSearchClause(search?: string) {
    if (!search) return isNull(postsModel.deleted_at);
    
    return and(
      isNull(postsModel.deleted_at),
      eq(postsModel.published, true),
      or(
        ilike(postsModel.title, `%${search}%`),
        ilike(postsModel.body, `%${search}%`)
      )
    );
  }

  static buildOrderByClause(orderBy?: string, orderDirection?: string) {
    if (!orderBy) return desc(postsModel.created_at);

    const direction = orderDirection === "asc" ? asc : desc;
    
    switch (orderBy) {
      case "title":
        return direction(postsModel.title);
      case "created_at":
        return direction(postsModel.created_at);
      case "updated_at":
        return direction(postsModel.updated_at);
      case "view_count":
        return direction(postsModel.view_count);
      case "like_count":
        return direction(postsModel.like_count);
      default:
        return direction(postsModel.created_at);
    }
  }

  static async getTotalCount(whereClause: any) {
    const result = await db
      .select({ count: count() })
      .from(postsModel)
      .where(whereClause);
    return result[0].count;
  }

  static transformPostWithSnippet(post: any) {
    return {
      ...post,
      body: post.body_snippet ? post.body_snippet + "..." : "",
      user: post.user,
      tags: post.posts_to_tags.map((t: any) => t.tag),
    };
  }

  static transformPostWithRelations(post: any) {
    return {
      ...post,
      user: post.user,
      tags: post.posts_to_tags.map((t: any) => t.tag),
    };
  }
}
