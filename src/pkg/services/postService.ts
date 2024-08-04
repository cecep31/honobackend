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

  async getPosts(limit = 100, offset = 0) {
    return this.postrepository.getPostsPaginate(limit, offset);
  }


  async getPostsByTag($tag: string) {
    const tag = await db.query.tags.findFirst({
      where: eq(tagsModel.name, $tag),
    });
    if (!tag) {
      throw new HTTPException(404, { message: "Tag not Found" });
    }
    return await this.postrepository.getPostsByTag(tag.id);
  
  }

  async getPostsRandom(limit = 6) {
    return await this.postrepository.getPostsRandom(limit);
  }

  async getPost(id_post: string) {
    return await this.postrepository.getPostById(id_post);
  }

  async getPostBySlug(slug: string) {
    return await this.postrepository.getPostBySlug(slug);
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

  async deletePost(id: string) {
    return await PostService.deletePost(id);
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
