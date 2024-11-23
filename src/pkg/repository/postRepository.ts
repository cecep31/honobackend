import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../database/drizzel";
import {
  users as usersModel,
  posts as postsModel,
  postsToTags,
  tags,
} from "../../database/schemas/postgre/schema";
import type { PostCreate } from "../../types/post";
import type { GetPaginationParams } from "../../types/paginate";

export class PostRepository {
  async getPostsPaginate(params: GetPaginationParams) {
    const { offset, limit } = params;
    const posts = await db.query.posts.findMany({
      where: and(isNull(postsModel.deletedAt), eq(postsModel.published, true)),
      orderBy: desc(postsModel.createdAt),
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
      where: isNull(postsModel.deletedAt),
      orderBy: desc(postsModel.createdAt),
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
      .where(isNull(postsModel.deletedAt));
    return { data: posts, total: total[0].count };
  }

  async getAllPostsByUser(user_id: string, limit = 100, offset = 0) {
    const posts = await db.query.posts.findMany({
      where: and(
        isNull(postsModel.deletedAt),
        eq(postsModel.createdBy, user_id)
      ),
      orderBy: desc(postsModel.createdAt),
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
      .where(eq(postsModel.createdBy, user_id));
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
        isNull(postsModel.deletedAt),
        eq(postsModel.createdBy, user_id),
        eq(postsModel.slug, slug)
      ),
      with: {
        creator: { columns: { password: false } },
        tags: { columns: {}, with: { tag: true } },
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
          firstname: usersModel.firstName,
          lastname: usersModel.lastName,
          image: usersModel.image,
          issuperadmin: usersModel.issuperadmin,
        },
        tags: {
          id: tags.id,
          name: tags.name,
        },
      })
      .from(postsModel)
      .leftJoin(usersModel, eq(postsModel.createdBy, usersModel.id))
      .leftJoin(postsToTags, eq(postsModel.id, postsToTags.postId))
      .leftJoin(tags, eq(postsToTags.tagId, tags.id))
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
        isNull(postsModel.deletedAt),
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
      where: and(isNull(postsModel.deletedAt), eq(postsModel.id, id)),
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
        photoUrl: data.photo_url,
        createdBy: data.created_by,
        published: data.published,
      })
      .returning({ id: postsModel.id });
  }
  // inclune published false
  async getPostsByUser(user_id: string, params: GetPaginationParams) {
    const { offset, limit } = params;
    const posts = await db.query.posts.findMany({
      where: and(
        eq(postsModel.createdBy, user_id),
        isNull(postsModel.deletedAt)
      ),
      with: {
        creator: { columns: { password: false } },
        tags: { columns: {}, with: { tag: true } },
      },
      limit: limit,
      offset: offset,
      orderBy: desc(postsModel.createdAt),
    });
    const total = await db
      .select({ count: count() })
      .from(postsModel)
      .where(
        and(eq(postsModel.createdBy, user_id), isNull(postsModel.deletedAt))
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
        createdAt: postsModel.createdAt,
      })
      .from(postsModel)
      .rightJoin(postsToTags, eq(postsModel.id, postsToTags.postId))
      .where(eq(postsToTags.tagId, tag_id))
      .orderBy(desc(postsModel.createdAt));
  }
  async getPostsByUsername(username: string, limit = 10, offset = 0) {
    const posts = await db
      .select({
        id: postsModel.id,
        title: postsModel.title,
        slug: postsModel.slug,
        body: postsModel.body,
        createdAt: postsModel.createdAt,
        creator: {
          id: usersModel.id,
          username: usersModel.username,
          email: usersModel.email,
          firstname: usersModel.firstName,
          lastname: usersModel.lastName,
        },
      })
      .from(postsModel)
      .leftJoin(usersModel, eq(postsModel.createdBy, usersModel.id))
      .where(eq(usersModel.username, username))
      .orderBy(desc(postsModel.createdAt))
      .limit(limit)
      .offset(offset);
    const total = await db
      .select({ count: count() })
      .from(postsModel)
      .leftJoin(usersModel, eq(postsModel.createdBy, usersModel.id))
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
        createdAt: postsModel.createdAt,
        creator: {
          id: usersModel.id,
          username: usersModel.username,
          email: usersModel.email,
          firstname: usersModel.firstName,
          lastname: usersModel.lastName,
        },
      })
      .from(postsModel)
      .leftJoin(usersModel, eq(postsModel.createdBy, usersModel.id))
      .where(and(isNull(postsModel.deletedAt), eq(postsModel.published, true)))
      .orderBy(sql.raw("RANDOM()"))
      .limit(limit);
  }

  async deletePost(id: string, user_id: string) {
    return await db
      .update(postsModel)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(postsModel.id, id), eq(postsModel.createdBy, user_id)))
      .returning({ id: postsModel.id });
  }
  async deletePostPermanent(id: string) {
    return await db.delete(postsModel).where(eq(postsModel.id, id));
  }
}
