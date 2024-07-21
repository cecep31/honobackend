import { HTTPException } from "hono/http-exception";
import {
  posts as postsModel,
  postsToTags,
  tags as tagsModel,
  users as usersModel,
} from "../../database/schema/schema";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../database/drizzel";
import Postgres from "postgres";

export class PostService {
  static async addPost(
    auth_id: string,
    title: string,
    body: string,
    slug: string,
    tags: string[] = [],
    photo_url: string | null = null,
    published: boolean = true
  ) {
    try {
      const post = await db
        .insert(postsModel)
        .values({
          title: title,
          body: body,
          slug: slug,
          photo_url: photo_url,
          published: published,
          created_by: auth_id,
          created_at: new Date().toISOString(),
        })
        .returning({
          id: postsModel.id,
        });

      if (tags.length > 0) {
        for (const tag of tags) {
          await db
            .insert(tagsModel)
            .values({ name: tag })
            .onConflictDoNothing();
        }
      }

      const getTags = await db.query.tags.findMany({
        where: inArray(tagsModel.name, tags),
      });

      for (const tag of getTags) {
        await db
          .insert(postsToTags)
          .values({ posts_id: post[0].id, tags_id: tag.id })
          .onConflictDoNothing();
      }

      return post[0];
    } catch (error) {
      if (error instanceof Postgres.PostgresError) {
        if (error.code == "23505") {
          throw new HTTPException(400, { message: "slug already exist" });
        }
      } else {
        console.log(error);
        throw new HTTPException(500, { message: "internal server error" });
      }
    }
  }

  static async getPosts(limit = 100, offset = 0) {
    const postsdata = await db.query.posts.findMany({
      columns:{updated_at: false,deleted_at: false},
      where: and(isNull(postsModel.deleted_at), eq(postsModel.published, true)),
      with: {
        creator: {
          columns: {
            username: true,
            first_name: true,
            last_name: true,
            image: true,
          },
        },
        tags: {
          columns: {},
          with: {
            tag: {
              columns: { name: true },
            },
          },
        },
      },
      limit: limit,
      offset: offset,
      orderBy: desc(postsModel.created_at),
    });

    const total = await db.select({ count: count() }).from(postsModel);
    return { data: postsdata, total: total[0].count };
  }

  static async getYourPosts(user_id: string, limit = 100, offset = 0) {
    const postsdata = await db.query.posts.findMany({
      orderBy: desc(postsModel.created_at),
      limit: limit,
      with: {
        creator: {
          columns: {
            username: true,
            first_name: true,
            last_name: true,
            image: true,
          },
        },
        tags: {
          columns: {},
          with: {
            tag: true,
          },
        },
      },
      where: eq(postsModel.created_by, user_id),
      offset: offset,
    });
    const total = await db
      .select({ count: count() })
      .from(postsModel)
      .where(eq(postsModel.created_by, user_id));
    return { data: postsdata, total: total[0].count };
  }

  static async getPostByUserId(user_id: string, limit = 100, offset = 0) {
    const postsData = await db.query.posts.findMany({
      where: eq(postsModel.created_by, user_id),
      limit: limit,
      offset: offset,
    });
    return postsData;
  }

  static async getPostsByTag($tag: string) {
    const tag = await db.query.tags.findFirst({
      where: eq(tagsModel.name, $tag),
    });
    if (!tag) {
      throw new HTTPException(404, { message: "Tag not Found" });
    }
    const postsdata = await db
      .select({
        id: postsModel.id,
        title: postsModel.title,
        slug: postsModel.slug,
        body: postsModel.body,
        created_at: postsModel.created_at,
      })
      .from(postsModel)
      .rightJoin(postsToTags, eq(postsModel.id, postsToTags.posts_id))
      .where(eq(postsToTags.tags_id, tag.id))
      .orderBy(desc(postsModel.created_at));

    return { data: postsdata, message: "success" };
  }

  static async getPostsRandom() {
    const postsData = await db
      .select()
      .from(postsModel)
      .orderBy(sql.raw("RANDOM()"))
      .limit(6);
    return postsData;
  }

  static async getPost(id_post: string) {
    const post = await db.query.posts.findFirst({
      where: eq(postsModel.id, id_post),
    });
    return post;
  }

  static async deletePost(postId: string) {
    const deletedPost = await db
      .delete(postsModel)
      .where(eq(postsModel.id, postId))
      .returning();
    if (!deletedPost) {
      throw new HTTPException(404, { message: "Post not found" });
    }
    return deletedPost;
  }

  static async getPostsByuser(user_id: string) {
    const postsdata = await db
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
      .where(eq(postsModel.created_by, user_id))
      .orderBy(desc(postsModel.created_at));

    return postsdata;
  }

  // async uploadFile(file: File) {

  //     console.log(file.toString());
  //     const readableStream = new Readable();
  //     const pipelineAsync = promisify(pipeline);
  //     await pipelineAsync(file.stream(), readableStream);
  //     const result = await minioClient.putObject(process.env.S3_BUCKET!, file.name, readableStream, file.size)
  //     console.log(result);

  //     return result.versionId
  // }
}
