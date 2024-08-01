import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../database/drizzel";
import {
  users as usersModel,
  posts as postsModel,
} from "../../database/schema/schema";

export class PostRepository {
  async getPostsPaginate(limit = 10, offset = 0) {
    return await db.query.posts.findMany({
      where: and(isNull(postsModel.deleted_at), eq(postsModel.published, true)),
      orderBy: desc(postsModel.created_at),
      limit: limit,
      offset: offset,
    });
  }

  async getPostBySlug(slug: string) {
    return await db.query.posts.findFirst({
      where: and(isNull(postsModel.deleted_at), eq(postsModel.slug, slug)),
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
    return await db.query.posts.findMany({
      where: eq(postsModel.created_by, user_id),
      with: {
        creator: { columns: { password: false } },
        tags: { columns: {}, with: { tag: true } },
      },
      limit: limit,
      offset: offset,
      orderBy: desc(postsModel.created_at),
    });
  }
  async getPostsByUsername(username: string, limit = 10, offset = 0) {
    return await db
      .select({
        id: postsModel.id,
        title: postsModel.title,
        slug: postsModel.slug,
        body: postsModel.body,
        created_at: postsModel.created_at,
        creator: { id: usersModel.id, username: usersModel.username },
      })
      .from(postsModel)
      .leftJoin(usersModel, eq(postsModel.created_by, usersModel.id))
      .where(eq(usersModel.username, username))
      .orderBy(desc(postsModel.created_at))
      .limit(limit)
      .offset(offset);
  }

  async getPostsRandom(limit = 6) {
    return await db
      .select()
      .from(postsModel)
      .orderBy(sql.raw("RANDOM()"))
      .limit(limit);
  }
}
