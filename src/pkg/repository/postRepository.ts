import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../database/drizzel";
import type { PostCreate } from "../../types/post";
import type { GetPaginationParams } from "../../types/paginate";
import {
  users as usersModel,
  posts as postsModel,
  postsToTags,
  tags as tagsModel,
} from "../../database/schemas/postgre/schema";

export class PostRepository {
  async getPostsPaginate(params: GetPaginationParams) {
    const { offset, limit } = params;
    const posts = await db.query.posts.findMany({
      where: and(isNull(postsModel.deleted_at), eq(postsModel.published, true)),
      orderBy: desc(postsModel.created_at),
      with: {
        user: { columns: { password: false } },
        postsToTags: { columns: {}, with: { tag: true } },
      },
      limit: limit,
      offset: offset,
    });
    const total = await db
      .select({ count: count() })
      .from(postsModel)
      .where(eq(postsModel.published, true));
    return { data: posts, total: total[0].count };
  }

  async getAllPosts(limit = 100, offset = 0) {
    const posts = await db.query.posts.findMany({
      where: isNull(postsModel.deleted_at),
      orderBy: desc(postsModel.created_at),
      with: {
        user: { columns: { password: false } },
        postsToTags: { columns: {}, with: { tag: true } },
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

  async getAllPostsByUser(user_id: string, limit = 100, offset = 0) {
    const posts = await db.query.posts.findMany({
      where: and(
        isNull(postsModel.deleted_at),
        eq(postsModel.created_by, user_id)
      ),
      orderBy: desc(postsModel.created_at),
      with: {
        user: { columns: { password: false } },
        postsToTags: { columns: {}, with: { tag: true } },
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

  async updatePostPublished(id: string, published: boolean) {
    return await db
      .update(postsModel)
      .set({ published: published })
      .where(eq(postsModel.id, id))
      .returning();
  }

  async getPostByCreatorSlug(user_id: string, slug: string) {
    return await db.query.posts.findFirst({
      where: and(
        isNull(postsModel.deleted_at),
        eq(postsModel.created_by, user_id),
        eq(postsModel.slug, slug)
      ),
      with: {
        user: { columns: { password: false } },
        postsToTags: { columns: {}, with: { tag: true } },
      },
    });
  }

  async getPostByUsernameSlug(username: string, slug: string) {
    const posts = await db
      .select({
        posts: postsModel,
        users: {
          id: usersModel.id,
          username: usersModel.username,
          email: usersModel.email,
          first_name: usersModel.first_name,
          last_name: usersModel.last_name,
          image: usersModel.image,
          issuperadmin: usersModel.is_super_admin,
        },
        tags: {
          id: tagsModel.id,
          name: tagsModel.name,
        },
      })
      .from(postsModel)
      .leftJoin(usersModel, eq(postsModel.created_by, usersModel.id))
      .leftJoin(postsToTags, eq(postsModel.id, postsToTags.post_id))
      .leftJoin(tagsModel, eq(postsToTags.tag_id, tagsModel.id))
      .where(and(eq(usersModel.username, username), eq(postsModel.slug, slug)));
    if (posts.length === 0) {
      return null;
    }
    const post = {
      ...posts[0].posts,
      creator: posts[0].users,
      tags: posts.filter((p) => p.tags !== null).map((p) => ({ tag: p.tags })),
    };
    return post;
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
        postsToTags: { columns: {}, with: { tag: true } },
      },
    });
  }

  async getPostById(id: string) {
    return await db.query.posts.findFirst({
      where: and(isNull(postsModel.deleted_at), eq(postsModel.id, id)),
      with: {
        user: { columns: { password: false } },
        postsToTags: { columns: {}, with: { tag: true } },
      },
    });
  }
  async getPostByIdRaw(id: string) {
    return await db.query.posts.findFirst({
      where: eq(postsModel.id, id),
    });
  }

  async addPost(data: PostCreate) {
    return await db
      .insert(postsModel)
      .values({
        body: data.body,
        title: data.title,
        slug: data.slug,
        photo_url: data.photo_url,
        created_by: data.created_by,
        published: data.published,
      })
      .returning({ id: postsModel.id });
  }
  // inclune published false
  async getPostsByUser(user_id: string, params: GetPaginationParams) {
    const { offset, limit } = params;
    const posts = await db.query.posts.findMany({
      where: and(
        eq(postsModel.created_by, user_id),
        isNull(postsModel.deleted_at)
      ),
      with: {
        user: { columns: { password: false } },
          postsToTags: { columns: {}, with: { tag: true } },
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
    return { data: posts, total: total[0].count };
  }

  async getPostsByTag(tag_id: number) {
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
      .rightJoin(postsToTags, eq(postsModel.id, postsToTags.post_id))
      .where(eq(postsToTags.tag_id, tag_id))
      .orderBy(desc(postsModel.created_at));
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
    return { data: posts, total: total[0].count };
  }

  async getPostsRandom(limit = 6) {
    return await db
      .select({
        id: postsModel.id,
        title: postsModel.title,
        slug: postsModel.slug,
        body: postsModel.body,
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
  }

  async deletePost(id: string, user_id: string) {
    return await db
      .update(postsModel)
      .set({ deleted_at: new Date().toISOString() })
      .where(and(eq(postsModel.id, id), eq(postsModel.created_by, user_id)))
      .returning({ id: postsModel.id });
  }
  async deletePostPermanent(id: string) {
    return await db.delete(postsModel).where(eq(postsModel.id, id));
  }
}
