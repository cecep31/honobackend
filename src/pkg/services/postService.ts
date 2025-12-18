import { and, count, desc, eq, isNull, sql, asc, like, or } from "drizzle-orm";
import { db } from "../../database/drizzel";
import {
  users as usersModel,
  posts as postsModel,
  postsToTags,
  tags as tagsModel,
} from "../../database/schemas/postgre/schema";
import { TagService } from "./tagService";
import type { PostCreateBody } from "../../types/post";
import type { GetPaginationParams } from "../../types/paginate";
import { getPaginationMetadata } from "../../utils/paginate";
import { HTTPException } from "hono/http-exception";
import { errorHttp } from "../../utils/error";

export class PostService {
  constructor(
    private tagService: TagService
  ) {}

  async UpdatePublishedByadmin(id: string, published: boolean) {
    return await db
      .update(postsModel)
      .set({ published: published })
      .where(eq(postsModel.id, id))
      .returning();
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

  async addPost(auth_id: string, body: PostCreateBody) {
    try {
      const post = await db
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

      if (body.tags.length > 0) {
        for (const tag of body.tags) {
          await this.tagService.addTag(tag);
        }
      }

      const getTags = await this.tagService.getTagsByNameArray(body.tags);

      for (const tag of getTags) {
        await this.tagService.addTagToPost(post[0].id, tag.id);
      }

      return post[0];
    } catch (error) {
      console.log(error);
      throw errorHttp("internal server error", 500);
    }
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

    const mappedTags = posts.filter((p) => p.tags !== null).map(p => p.tags!);

    return {
        ...posts[0].posts,
        creator: posts[0].users,
        tags: mappedTags 
    };
  }

  async getPosts(params: GetPaginationParams) {
    const { offset, limit, search, orderBy, orderDirection } = params;
    
    let whereClause = and(isNull(postsModel.deleted_at), eq(postsModel.published, true));
    
    if (search) {
      whereClause = and(
        whereClause,
        or(
          like(postsModel.title, `%${search}%`),
          like(postsModel.body, `%${search}%`)
        )
      );
    }
    
    let orderByClause = desc(postsModel.created_at);
    if (orderBy) {
      switch (orderBy) {
        case 'title':
          orderByClause = orderDirection === 'asc' ? asc(postsModel.title) : desc(postsModel.title);
          break;
        case 'created_at':
          orderByClause = orderDirection === 'asc' ? asc(postsModel.created_at) : desc(postsModel.created_at);
          break;
        case 'updated_at':
          orderByClause = orderDirection === 'asc' ? asc(postsModel.updated_at) : desc(postsModel.updated_at);
          break;
        case 'view_count':
          orderByClause = orderDirection === 'asc' ? asc(postsModel.view_count) : desc(postsModel.view_count);
          break;
        case 'like_count':
          orderByClause = orderDirection === 'asc' ? asc(postsModel.like_count) : desc(postsModel.like_count);
          break;
        default:
          orderByClause = orderDirection === 'asc' ? asc(postsModel.created_at) : desc(postsModel.created_at);
      }
    }
    
    const posts = await db.query.posts.findMany({
      where: whereClause,
      orderBy: orderByClause,
      with: {
        user: { columns: { password: false } },
        postsToTags: { columns: {}, with: { tag: true } },
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
      body:
        post.body?.slice(0, 200) + (post.body?.length ?? 0 > 200 ? "..." : ""),
      slug: post.slug,
      photo_url: post.photo_url,
      created_at: post.created_at,
      updated_at: post.updated_at,
      published: post.published,
      viewCount: post.view_count ?? 0,
      likeCount: post.like_count ?? 0,
      creator: post.user,
      tags: post.postsToTags.map((tag) => tag.tag),
    }));

    const meta = getPaginationMetadata(total, params.offset, params.limit);
    return { data: response, meta };
  }

  async getPostsByTag($tag: string) {
    const tag = await this.tagService.getTag($tag);
    if (!tag) {
      throw new HTTPException(404, { message: "Tag not Found" });
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
      .rightJoin(postsToTags, eq(postsModel.id, postsToTags.post_id))
      .where(eq(postsToTags.tag_id, tag.id))
      .orderBy(desc(postsModel.created_at));
  }

  async getPostsRandom(limit = 6) {
    const data = await db
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

    data.forEach((post) => {
      post.body = post.body?.substring(0, 200) || "" + "...";
    });
    return data;
  }

  async getPost(id_post: string) {
    return await db.query.posts.findFirst({
      where: and(isNull(postsModel.deleted_at), eq(postsModel.id, id_post)),
      with: {
        user: { columns: { password: false } },
        postsToTags: { columns: {}, with: { tag: true } },
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
        postsToTags: { columns: {}, with: { tag: true } },
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
      throw new HTTPException(404, { message: "Post not found" });
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
      
    const data = posts;
    data.forEach((post) => {
      post.body = post.body?.substring(0, 200) || "" + "...";
    });
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