import { HTTPException } from "hono/http-exception";
import {
  posts as postsModel,
  postsToTags,
  tags as tagsModel,
} from "../../database/schema/schema";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../../database/drizzel";
import Postgres from "postgres";
import { PostRepository } from "../repository/postRepository";
import { tagRepository } from "../repository/tagRepository";

export class PostService {
  postrepository: PostRepository;
  tagrepository: tagRepository;
  constructor() {
    this.postrepository = new PostRepository();
    this.tagrepository = new tagRepository();
  }
  async addPost(auth_id: string, body: PostCreateBody) {
    try {
      const post = await this.postrepository.addPost({
        title: body.title,
        body: body.body,
        slug: body.slug,
        photo_url: body.photo_url,
        published: body.published,
        created_by: auth_id,
      });

      if (body.tags.length > 0) {
        for (const tag of body.tags) {
          await this.tagrepository.addTag(tag);
        }
      }

      const getTags = await db.query.tags.findMany({
        where: inArray(tagsModel.name, body.tags),
      });

      for (const tag of getTags) {
        await this.tagrepository.addTagToPost(post[0].id, tag.id);
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
      columns: { updated_at: false, deleted_at: false },
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

  async getPostsRandom() {
    return await this.postrepository.getPostsRandom();
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

  async getPostsByuser(user_id: string, limit = 10, offset = 0) {
    return await this.postrepository.getPostsByUser(user_id, limit, offset);
  }
  async getPostsByUsername(username: string, limit = 10, offset = 0) {
    return await this.postrepository.getPostsByUsername(
      username,
      limit,
      offset
    );
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
