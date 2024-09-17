import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../database/drizzel";
import {
  users as usersModel,
  posts as postsModel,
  postsToTags,
} from "../../database/schema/schema";
import type { PostCreate } from "../../types/post";

export class PostRepository {
  async getPostsPaginate(limit = 10, offset = 0) {
    const posts = await db.query.posts.findMany({
      where: and(isNull(postsModel.deleted_at), eq(postsModel.published, true)),
      orderBy: desc(postsModel.created_at),
      with: {
        creator: { columns: { password: false } },
        tags: { columns: {}, with: { tag: true } },
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
        creator: { columns: { password: false } },
        tags: { columns: {}, with: { tag: true } },
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
        creator: { columns: { password: false } },
        tags: { columns: {}, with: { tag: true } },
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
        creator: { columns: { password: false } },
        tags: { columns: {}, with: { tag: true } },
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
        creator: { columns: { password: false } },
        tags: { columns: {}, with: { tag: true } },
      },
    });
  }

  async getPostById(id: string) {
    return await db.query.posts.findFirst({
      where: and(isNull(postsModel.deleted_at), eq(postsModel.id, id)),
      with: {
        creator: { columns: { password: false } },
        tags: { columns: {}, with: { tag: true } },
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

  async getPostsByUser(user_id: string, limit = 10, offset = 0) {
    const posts = await db.query.posts.findMany({
      where: eq(postsModel.created_by, user_id),
      with: {
        creator: { columns: { password: false } },
        tags: { columns: {}, with: { tag: true } },
      },
      limit: limit,
      offset: offset,
      orderBy: desc(postsModel.created_at),
    });
    const total = await db
      .select({ count: count() })
      .from(postsModel)
      .where(eq(postsModel.created_by, user_id));
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
      })
      .from(postsModel)
      .rightJoin(postsToTags, eq(postsModel.id, postsToTags.posts_id))
      .where(eq(postsToTags.tags_id, tag_id))
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
        creator: {
          id: usersModel.id,
          username: usersModel.username,
          email: usersModel.email,
          firstname: usersModel.first_name,
          lastname: usersModel.last_name,
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
      .select()
      .from(postsModel)
      .where(and(isNull(postsModel.deleted_at), eq(postsModel.published, true)))
      .orderBy(sql.raw("RANDOM()"))
      .limit(limit);
  }

  async deletePost(id: string) {
    return await db
      .update(postsModel)
      .set({ deleted_at: new Date().toISOString() })
      .where(eq(postsModel.id, id))
      .returning();
  }
  async deletePostPermanent(id: string) {
    return await db.delete(postsModel).where(eq(postsModel.id, id));
  }
}
