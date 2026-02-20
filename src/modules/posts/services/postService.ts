import { and, count, desc, eq, isNull, sql, gte } from "drizzle-orm";
import { db } from "../../../database/drizzle";
import {
  users as usersModel,
  posts as postsModel,
  posts_to_tags,
  tags as tagsModel,
} from "../../../database/schemas/postgre/schema";
import { PostQueryHelpers } from "./postQueryHelpers";
import { PostTagManager } from "./postTagManager";
import type { PostCreateBody } from "../validation";
import type { GetPaginationParams } from "../../../types/paginate";
import { getPaginationMetadata } from "../../../utils/paginate";
import { Errors } from "../../../utils/error";

export class PostService {
  constructor() {}

  async updatePost(
    post_id: string,
    auth_id: string,
    body: Partial<PostCreateBody>
  ) {
    return await db.transaction(async (tx) => {
      const existingPost = await tx.query.posts.findFirst({
        where: and(
          eq(postsModel.id, post_id),
          eq(postsModel.created_by, auth_id),
          isNull(postsModel.deleted_at)
        ),
        columns: { id: true },
      });

      if (!existingPost) {
        throw Errors.NotFound("Post not found or unauthorized");
      }

      const { tags, ...updateFields } = body;
      const updateData = { ...updateFields, updated_at: new Date().toISOString() };

      const [updatedPost] = await tx
        .update(postsModel)
        .set(updateData)
        .where(eq(postsModel.id, post_id))
        .returning();

      if (tags) {
        await PostTagManager.updatePostTags(post_id, tags, tx);
      }

      return updatedPost;
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
    const queryConfig = PostQueryHelpers.getPublishedPostQuery();
    
    const posts = await db.query.posts.findMany({
      ...queryConfig,
      orderBy: [desc(postsModel.view_count), desc(postsModel.like_count)],
      columns: {
        body: false,
      },
      extras: {
        body: sql<string>`substring(${postsModel.body} from 1 for 200)`.as("body"),
      },
      with: {
        user: { columns: { username: true } },
        posts_to_tags: { columns: {}, with: { tag: true } },
      },
      limit: limit,
    });

    return posts.map((post) => ({
      ...post,
      body: post.body ? post.body + "..." : "",
      user: post.user,
      tags: post.posts_to_tags.map((t: any) => t.tag),
    }));
  }

  async getAllPosts(limit = 100, offset = 0) {
     const posts = await db.query.posts.findMany({
      where: isNull(postsModel.deleted_at),
      orderBy: desc(postsModel.created_at),
      with: {
        user: {
          columns: { password: false, github_id: false, last_logged_at: false },
        },
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
          await PostTagManager.linkTagsToPost(post.id, body.tags, tx);
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
      where: and(
        eq(postsModel.slug, slug),
        eq(postsModel.created_by, user.id),
        eq(postsModel.published, true),
        isNull(postsModel.deleted_at)
      ),
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
      user: post.user,
      tags: post.posts_to_tags.map((t) => t.tag),
    };
  }

  async getPosts(params: GetPaginationParams) {
    const { offset, limit, search, orderBy, orderDirection } = params;

    const whereClause = PostQueryHelpers.buildSearchClause(search);
    const orderByClause = PostQueryHelpers.buildOrderByClause(orderBy, orderDirection);

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
        user: {
          columns: { password: false, github_id: false, last_logged_at: false },
        },
        posts_to_tags: { columns: {}, with: { tag: true } },
      },
      limit: limit,
      offset: offset,
    });

    const total = await PostQueryHelpers.getTotalCount(whereClause);
    const response = posts.map((post: any) => ({
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
      user: post.user,
      tags: post.posts_to_tags.map((tag: any) => tag.tag),
    }));

    const meta = getPaginationMetadata(total, params.offset, params.limit);
    return { data: response, meta };
  }

  async getPostsByTag(tag: string) {
    return await db
      .select({
        id: postsModel.id,
        title: postsModel.title,
        slug: postsModel.slug,
        body: sql<string>`substring(${postsModel.body} from 1 for 200)`,
        created_at: postsModel.created_at,
        view_count: postsModel.view_count,
        like_count: postsModel.like_count,
      })
      .from(postsModel)
      .innerJoin(posts_to_tags, eq(postsModel.id, posts_to_tags.post_id))
      .innerJoin(tagsModel, eq(posts_to_tags.tag_id, tagsModel.id))
      .where(and(
        eq(tagsModel.name, tag),
        eq(postsModel.published, true),
        isNull(postsModel.deleted_at)
      ))
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
        user: {
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
      where: and(
        isNull(postsModel.deleted_at),
        eq(postsModel.id, id_post),
        eq(postsModel.published, true)
      ),
      with: {
        user: {
          columns: { password: false, github_id: false, last_logged_at: false },
        },
        posts_to_tags: { columns: {}, with: { tag: true } },
      },
    });
  }

  /**
   * Get post by ID only for the owner (auth required). Returns draft and published.
   */
  async getPostByIdForOwner(post_id: string, user_id: string) {
    return await db.query.posts.findFirst({
      where: and(
        isNull(postsModel.deleted_at),
        eq(postsModel.id, post_id),
        eq(postsModel.created_by, user_id)
      ),
      with: {
        user: {
          columns: { password: false, github_id: false, last_logged_at: false },
        },
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
        user: {
          columns: { password: false, github_id: false, last_logged_at: false },
        },
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

  async getPostsByUser(user_id: string, params: GetPaginationParams) {
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
        user: {
          columns: { password: false, github_id: false, last_logged_at: false },
        },
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
        body: sql<string>`substring(${postsModel.body} from 1 for 200)`.as("body"),
        created_at: postsModel.created_at,
        view_count: postsModel.view_count,
        like_count: postsModel.like_count,
        user: {
          id: usersModel.id,
          username: usersModel.username,
          email: usersModel.email,
          first_name: usersModel.first_name,
          last_name: usersModel.last_name,
        },
      })
      .from(postsModel)
      .innerJoin(usersModel, eq(postsModel.created_by, usersModel.id))
      .where(and(
        eq(usersModel.username, username),
        eq(postsModel.published, true),
        isNull(postsModel.deleted_at)
      ))
      .orderBy(desc(postsModel.created_at))
      .limit(limit)
      .offset(offset);
      
    const total = await db
      .select({ count: count() })
      .from(postsModel)
      .innerJoin(usersModel, eq(postsModel.created_by, usersModel.id))
      .where(and(
        eq(usersModel.username, username),
        eq(postsModel.published, true),
        isNull(postsModel.deleted_at)
      ));
      
    const meta = getPaginationMetadata(total[0].count, offset, limit);
    return { data: posts, meta };
  }

  /**
   * Get posts created over time (grouped by date)
   * @param days Number of days to look back (default: 30)
   * @param groupBy Group by 'day', 'week', or 'month' (default: 'day')
   */
  async getPostsOverTime(days = 30, groupBy: 'day' | 'week' | 'month' = 'day') {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let dateFormat: string;
    switch (groupBy) {
      case 'week':
        dateFormat = 'YYYY-IW'; // ISO week
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }

    const result = await db
      .select({
        date: sql<string>`TO_CHAR(${postsModel.created_at}, ${dateFormat})`,
        count: count(),
      })
      .from(postsModel)
      .where(
        and(
          gte(postsModel.created_at, startDate.toISOString()),
          isNull(postsModel.deleted_at)
        )
      )
      .groupBy(sql`TO_CHAR(${postsModel.created_at}, ${dateFormat})`)
      .orderBy(sql`TO_CHAR(${postsModel.created_at}, ${dateFormat})`);

    return result;
  }

  /**
   * Get distribution of posts by tags
   * @param limit Number of top tags to return (default: 10)
   */
  async getPostsByTagDistribution(limit = 10) {
    const result = await db
      .select({
        tag_name: tagsModel.name,
        tag_id: tagsModel.id,
        post_count: count(posts_to_tags.post_id),
      })
      .from(tagsModel)
      .leftJoin(posts_to_tags, eq(tagsModel.id, posts_to_tags.tag_id))
      .leftJoin(
        postsModel,
        and(
          eq(posts_to_tags.post_id, postsModel.id),
          isNull(postsModel.deleted_at)
        )
      )
      .groupBy(tagsModel.id, tagsModel.name)
      .orderBy(desc(count(posts_to_tags.post_id)))
      .limit(limit);

    return result;
  }

  private async getTopPostsBy(
    orderByField: 'view_count' | 'like_count',
    limit = 10
  ) {
    const column = orderByField === 'view_count' ? postsModel.view_count : postsModel.like_count;
    const posts = await db.query.posts.findMany({
      where: and(isNull(postsModel.deleted_at), eq(postsModel.published, true)),
      columns: {
        id: true,
        title: true,
        slug: true,
        view_count: true,
        like_count: true,
        created_at: true,
      },
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: desc(column),
      limit,
    });

    return posts.map((post) => ({ ...post, user: post.user }));
  }

  /**
   * Get top posts by views
   * @param limit Number of posts to return (default: 10)
   */
  async getTopPostsByViews(limit = 10) {
    return this.getTopPostsBy('view_count', limit);
  }

  /**
   * Get top posts by likes
   * @param limit Number of posts to return (default: 10)
   */
  async getTopPostsByLikes(limit = 10) {
    return this.getTopPostsBy('like_count', limit);
  }

  /**
   * Get user activity (posts per user)
   * @param limit Number of users to return (default: 10)
   */
  async getUserActivity(limit = 10) {
    const result = await db
      .select({
        user_id: usersModel.id,
        username: usersModel.username,
        first_name: usersModel.first_name,
        last_name: usersModel.last_name,
        post_count: count(postsModel.id),
        total_views: sql<number>`COALESCE(SUM(${postsModel.view_count}), 0)`,
        total_likes: sql<number>`COALESCE(SUM(${postsModel.like_count}), 0)`,
      })
      .from(usersModel)
      .leftJoin(
        postsModel,
        and(
          eq(usersModel.id, postsModel.created_by),
          isNull(postsModel.deleted_at)
        )
      )
      .groupBy(
        usersModel.id,
        usersModel.username,
        usersModel.first_name,
        usersModel.last_name
      )
      .orderBy(desc(count(postsModel.id)))
      .limit(limit);

    return result;
  }

  /**
   * Get engagement metrics overview
   */
  async getEngagementMetrics() {
    const result = await db
      .select({
        total_posts: count(postsModel.id),
        total_views: sql<number>`COALESCE(SUM(${postsModel.view_count}), 0)`,
        total_likes: sql<number>`COALESCE(SUM(${postsModel.like_count}), 0)`,
        avg_views_per_post: sql<number>`COALESCE(AVG(${postsModel.view_count}), 0)`,
        avg_likes_per_post: sql<number>`COALESCE(AVG(${postsModel.like_count}), 0)`,
        published_posts: sql<number>`COUNT(CASE WHEN ${postsModel.published} = true THEN 1 END)`,
        draft_posts: sql<number>`COUNT(CASE WHEN ${postsModel.published} = false THEN 1 END)`,
      })
      .from(postsModel)
      .where(isNull(postsModel.deleted_at));

    return result[0];
  }

  /**
   * Get posts engagement comparison (views vs likes)
   * @param limit Number of posts to return (default: 20)
   */
  async getEngagementComparison(limit = 20) {
    const posts = await db
      .select({
        id: postsModel.id,
        title: postsModel.title,
        slug: postsModel.slug,
        view_count: postsModel.view_count,
        like_count: postsModel.like_count,
        engagement_rate: sql<number>`CASE
          WHEN ${postsModel.view_count} > 0
          THEN (${postsModel.like_count}::float / ${postsModel.view_count}::float * 100)
          ELSE 0
        END`,
        created_at: postsModel.created_at,
      })
      .from(postsModel)
      .where(
        and(
          isNull(postsModel.deleted_at),
          eq(postsModel.published, true)
        )
      )
      .orderBy(desc(postsModel.view_count))
      .limit(limit);

    return posts;
  }
}
