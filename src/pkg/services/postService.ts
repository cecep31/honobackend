import { and, count, desc, eq, isNull, sql, asc, ilike, or, inArray } from "drizzle-orm";
import { db } from "../../database/drizzle";
import {
  users as usersModel,
  posts as postsModel,
  posts_to_tags,
  tags as tagsModel,
} from "../../database/schemas/postgre/schema";
import { TagService } from "./tagService";
import type { PostCreateBody } from "../../types/post";
import type { GetPaginationParams } from "../../types/paginate";
import { getPaginationMetadata } from "../../utils/paginate";
import { Errors } from "../../utils/error";

export class PostService {
  constructor(
    private tagService: TagService
  ) {}

  async updatePost(
    post_id: string,
    auth_id: string,
    body: Partial<PostCreateBody>
  ) {
    return await db.transaction(async (tx) => {
      try {
        const existingPost = await tx.query.posts.findFirst({
          where: and(
            eq(postsModel.id, post_id),
            eq(postsModel.created_by, auth_id),
            isNull(postsModel.deleted_at)
          ),
        });

        if (!existingPost) {
          throw Errors.NotFound("Post not found or unauthorized");
        }

        const updateData: any = { ...body };
        delete updateData.tags;
        updateData.updated_at = new Date().toISOString();

        const [updatedPost] = await tx
          .update(postsModel)
          .set(updateData)
          .where(eq(postsModel.id, post_id))
          .returning();

        if (body.tags) {
          await tx
            .delete(posts_to_tags)
            .where(eq(posts_to_tags.post_id, post_id));

          await tx
            .insert(tagsModel)
            .values(body.tags.map((name) => ({ name })))
            .onConflictDoNothing();

          const tags = await tx.query.tags.findMany({
            where: inArray(tagsModel.name, body.tags),
          });

          if (tags.length > 0) {
            await tx
              .insert(posts_to_tags)
              .values(
                tags.map((tag) => ({
                  post_id: post_id,
                  tag_id: tag.id,
                }))
              )
              .onConflictDoNothing();
          }
        }

        return updatedPost;
      } catch (error) {
        if (error instanceof Error && error.message.includes("Post not found")) {
          throw error;
        }
        console.error("Error updating post:", error);
        throw Errors.DatabaseError({ message: "Failed to update post", error });
      }
    });
  }

  async incrementView(post_id: string) {
    return await db
      .update(postsModel)
      .set({ view_count: sql`${postsModel.view_count} + 1` })
      .where(eq(postsModel.id, post_id))
      .returning({ id: postsModel.id, view_count: postsModel.view_count });
  }

  async getTrendingPosts(limit = 5) {
    const posts = await db.query.posts.findMany({
      where: and(isNull(postsModel.deleted_at), eq(postsModel.published, true)),
      orderBy: [desc(postsModel.view_count), desc(postsModel.like_count)],
      with: {
        user: { columns: { password: false } },
        posts_to_tags: { columns: {}, with: { tag: true } },
      },
      limit: limit,
    });

    return posts.map((post) => ({
      ...post,
      tags: post.posts_to_tags.map((t) => t.tag),
    }));
  }

  async getAllPostsByUser(user_id: string, limit = 100, offset = 0) {
    const posts = await db.query.posts.findMany({
      where: and(
        isNull(postsModel.deleted_at),
        eq(postsModel.created_by, user_id)
      ),
      orderBy: desc(postsModel.created_at),
      with: {
        user: { columns: { password: false } },
        posts_to_tags: { columns: {}, with: { tag: true } },
      },
      limit: limit,
      offset: offset,
    });
    const total = await db
      .select({ count: count() })
      .from(postsModel)
      .where(eq(postsModel.created_by, user_id));
    return { data: posts, total: total[0].count };
  }

  async getAllPosts(limit = 100, offset = 0) {
     const posts = await db.query.posts.findMany({
      where: isNull(postsModel.deleted_at),
      orderBy: desc(postsModel.created_at),
      with: {
        user: { columns: { password: false } },
        posts_to_tags: { columns: {}, with: { tag: true } },
      },
      limit: limit,
      offset: offset,
    });
    const total = await db
      .select({ count: count() })
      .from(postsModel)
      .where(isNull(postsModel.deleted_at));
    return { data: posts, total: total[0].count };
  }

  async addPost(auth_id: string, body: PostCreateBody) {
    return await db.transaction(async (tx) => {
      try {
        const [post] = await tx
          .insert(postsModel)
          .values({
            body: body.body,
            title: body.title,
            slug: body.slug,
            photo_url: body.photo_url,
            created_by: auth_id,
            published: body.published,
          })
          .returning({ id: postsModel.id });

        if (body.tags && body.tags.length > 0) {
          // Batch insert tags (ignoring duplicates)
          await tx
            .insert(tagsModel)
            .values(body.tags.map((name) => ({ name })))
            .onConflictDoNothing();

          // Get all tag IDs for these tags
          const tags = await tx.query.tags.findMany({
            where: inArray(tagsModel.name, body.tags),
          });

          // Batch link tags to post
          if (tags.length > 0) {
            await tx
              .insert(posts_to_tags)
              .values(
                tags.map((tag) => ({
                  post_id: post.id,
                  tag_id: tag.id,
                }))
              )
              .onConflictDoNothing();
          }
        }

        return post;
      } catch (error) {
        console.error("Error adding post:", error);
        throw Errors.DatabaseError({ message: "Failed to create post", error });
      }
    });
  }

  async getPostByUsernameSlug(username: string, slug: string) {
    const user = await db.query.users.findFirst({
      where: eq(usersModel.username, username),
      columns: { id: true },
    });

    if (!user) {
      return null;
    }

    const post = await db.query.posts.findFirst({
      where: and(eq(postsModel.slug, slug), eq(postsModel.created_by, user.id)),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            email: true,
            first_name: true,
            last_name: true,
            image: true,
            is_super_admin: true,
          },
        },
        posts_to_tags: {
          columns: {},
          with: {
            tag: true,
          },
        },
      },
    });

    if (!post) {
      return null;
    }

    return {
      ...post,
      creator: post.user,
      tags: post.posts_to_tags.map((t) => t.tag),
    };
  }

  async getPosts(params: GetPaginationParams) {
    const { offset, limit, search, orderBy, orderDirection } = params;

    let whereClause = and(
      isNull(postsModel.deleted_at),
      eq(postsModel.published, true)
    );

    if (search) {
      whereClause = and(
        whereClause,
        or(
          ilike(postsModel.title, `%${search}%`),
          ilike(postsModel.body, `%${search}%`)
        )
      );
    }

    let orderByClause = desc(postsModel.created_at);
    if (orderBy) {
      switch (orderBy) {
        case "title":
          orderByClause =
            orderDirection === "asc"
              ? asc(postsModel.title)
              : desc(postsModel.title);
          break;
        case "created_at":
          orderByClause =
            orderDirection === "asc"
              ? asc(postsModel.created_at)
              : desc(postsModel.created_at);
          break;
        case "updated_at":
          orderByClause =
            orderDirection === "asc"
              ? asc(postsModel.updated_at)
              : desc(postsModel.updated_at);
          break;
        case "view_count":
          orderByClause =
            orderDirection === "asc"
              ? asc(postsModel.view_count)
              : desc(postsModel.view_count);
          break;
        case "like_count":
          orderByClause =
            orderDirection === "asc"
              ? asc(postsModel.like_count)
              : desc(postsModel.like_count);
          break;
        default:
          orderByClause =
            orderDirection === "asc"
              ? asc(postsModel.created_at)
              : desc(postsModel.created_at);
      }
    }

    const posts = await db.query.posts.findMany({
      where: whereClause,
      orderBy: orderByClause,
      columns: {
        body: false,
      },
      extras: {
        body_snippet: sql<string>`substring(${postsModel.body} from 1 for 200)`.as("body_snippet"),
      },
      with: {
        user: { columns: { password: false } },
        posts_to_tags: { columns: {}, with: { tag: true } },
      },
      limit: limit,
      offset: offset,
    });

    const countQuery = await db
      .select({ count: count() })
      .from(postsModel)
      .where(whereClause);

    const total = countQuery[0].count;

    const response = posts.map((post) => ({
      id: post.id,
      title: post.title,
      body: post.body_snippet ? post.body_snippet + "..." : "",
      slug: post.slug,
      photo_url: post.photo_url,
      created_at: post.created_at,
      updated_at: post.updated_at,
      published: post.published,
      view_count: post.view_count ?? 0,
      like_count: post.like_count ?? 0,
      creator: post.user,
      tags: post.posts_to_tags.map((tag) => tag.tag),
    }));

    const meta = getPaginationMetadata(total, params.offset, params.limit);
    return { data: response, meta };
  }

  async getPostsByTag($tag: string) {
    const tag = await this.tagService.getTag($tag);
    if (!tag) {
      throw Errors.NotFound("Tag");
    }
    return await db
      .select({
        id: postsModel.id,
        title: postsModel.title,
        slug: postsModel.slug,
        body: postsModel.body,
        created_at: postsModel.created_at,
        view_count: postsModel.view_count,
        like_count: postsModel.like_count,
      })
      .from(postsModel)
      .rightJoin(posts_to_tags, eq(postsModel.id, posts_to_tags.post_id))
      .where(eq(posts_to_tags.tag_id, tag.id))
      .orderBy(desc(postsModel.created_at));
  }

  async getPostsRandom(limit = 6) {
    const data = await db
      .select({
        id: postsModel.id,
        title: postsModel.title,
        slug: postsModel.slug,
        body: sql<string>`substring(${postsModel.body} from 1 for 200)`.as("body"),
        created_at: postsModel.created_at,
        creator: {
          id: usersModel.id,
          username: usersModel.username,
          email: usersModel.email,
          first_name: usersModel.first_name,
          last_name: usersModel.last_name,
        },
      })
      .from(postsModel)
      .leftJoin(usersModel, eq(postsModel.created_by, usersModel.id))
      .where(and(isNull(postsModel.deleted_at), eq(postsModel.published, true)))
      .orderBy(sql.raw("RANDOM()"))
      .limit(limit);

    return data.map((post) => ({
      ...post,
      body: post.body ? post.body + "..." : "",
    }));
  }

  async getPost(id_post: string) {
    return await db.query.posts.findFirst({
      where: and(isNull(postsModel.deleted_at), eq(postsModel.id, id_post)),
      with: {
        user: { columns: { password: false } },
        posts_to_tags: { columns: {}, with: { tag: true } },
      },
    });
  }

  async getPostBySlug(slug: string) {
     return await db.query.posts.findFirst({
      where: and(
        isNull(postsModel.deleted_at),
        eq(postsModel.slug, slug),
        eq(postsModel.published, true)
      ),
      with: {
        user: { columns: { password: false } },
        posts_to_tags: { columns: {}, with: { tag: true } },
      },
    });
  }

  async deletePost(post_id: string, auth_id: string) {
    const deletedPost = await db
      .update(postsModel)
      .set({ deleted_at: new Date().toISOString() })
      .where(and(eq(postsModel.id, post_id), eq(postsModel.created_by, auth_id)))
      .returning({ id: postsModel.id });
      
    if (!deletedPost[0]) {
      throw Errors.NotFound("Post");
    }
    return deletedPost;
  }

  async getPostsByuser(user_id: string, params: GetPaginationParams) {
     const { offset, limit } = params;
    const posts = await db.query.posts.findMany({
      where: and(
        eq(postsModel.created_by, user_id),
        isNull(postsModel.deleted_at)
      ),
      columns: {
        body: false,
      },
      extras: {
        body_snippet: sql<string>`substring(${postsModel.body} from 1 for 200)`.as("body_snippet"),
      },
      with: {
        user: { columns: { password: false } },
          posts_to_tags: { columns: {}, with: { tag: true } },
      },
      limit: limit,
      offset: offset,
      orderBy: desc(postsModel.created_at),
    });
    const total = await db
      .select({ count: count() })
      .from(postsModel)
      .where(
        and(eq(postsModel.created_by, user_id), isNull(postsModel.deleted_at))
      );
      
    const data = posts.map((post) => ({
      ...post,
      body: post.body_snippet ? post.body_snippet + "..." : "",
    }));

    const meta = getPaginationMetadata(total[0].count, params.offset, params.limit);
    return { data, meta };
  }
  
  async getPostsByUsername(username: string, limit = 10, offset = 0) {
    const posts = await db
      .select({
        id: postsModel.id,
        title: postsModel.title,
        slug: postsModel.slug,
        body: postsModel.body,
        created_at: postsModel.created_at,
        view_count: postsModel.view_count,
        like_count: postsModel.like_count,
        creator: {
          id: usersModel.id,
          username: usersModel.username,
          email: usersModel.email,
          first_name: usersModel.first_name,
          last_name: usersModel.last_name,
        },
      })
      .from(postsModel)
      .leftJoin(usersModel, eq(postsModel.created_by, usersModel.id))
      .where(eq(usersModel.username, username))
      .orderBy(desc(postsModel.created_at))
      .limit(limit)
      .offset(offset);
      
    const total = await db
      .select({ count: count() })
      .from(postsModel)
      .leftJoin(usersModel, eq(postsModel.created_by, usersModel.id))
      .where(eq(usersModel.username, username))
      .limit(limit)
      .offset(offset);
      
    const meta = getPaginationMetadata(total[0].count, offset, limit);
    return { data: posts, meta };
  }
}