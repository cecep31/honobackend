import Postgres from "postgres";
import { PostRepository } from "../repository/postRepository";
import { TagRepository } from "../repository/tagRepository";
import type { PostCreateBody } from "../../types/post";
import type { GetPaginationParams } from "../../types/paginate";
import { getPaginationMetadata } from "../../utils/paginate";
import { HTTPException } from "hono/http-exception";
import { errorHttp } from "../../utils/error";

export class PostService {
  constructor(
    private postrepository: PostRepository,
    private tagrepository: TagRepository
  ) {}

  async UpdatePublishedByadmin(id: string, published: boolean) {
    return this.postrepository.updatePostPublished(id, published);
  }

  async getAllPostsByUser(user_id: string, limit = 100, offset = 0) {
    return this.postrepository.getAllPostsByUser(user_id, limit, offset);
  }

  async getAllPosts(limit = 100, offset = 0) {
    return this.postrepository.getAllPosts(limit, offset);
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

      const getTags = await this.tagrepository.getTagsByNameArray(body.tags);

      for (const tag of getTags) {
        await this.tagrepository.addTagToPost(post[0].id, tag.id);
      }

      return post[0];
    } catch (error) {
      if (error instanceof Postgres.PostgresError) {
        if (error.code == "23505") {
          throw errorHttp("slug already exist", 400);
        }
      } else {
        console.log(error);
        throw errorHttp("internal server error", 500);
      }
    }
  }

  async getPostByUsernameSlug(username: string, slug: string) {
    const data = await this.postrepository.getPostByUsernameSlug(username, slug);
    return {
      ...data,
      tags: data?.tags.map((tag) => tag.tag),
    }
  }

  async getPosts(params: GetPaginationParams) {
    const { total, data } = await this.postrepository.getPostsPaginate(params);
    const response = data.map((post) => {
      post.body = post.body?.substring(0, 200) || "" + "...";
      return {
        id: post.id,
        title: post.title,
        body: post.body,
        slug: post.slug,
        photo_url: post.photo_url,
        created_by: post.created_by,
        created_at: post.created_at,
        updated_at: post.updated_at,
        published: post.published,
        creator: post.creator,
        tags: post.tags.map((tag) => tag.tag),
      };
    });
    const metadata = getPaginationMetadata(total, params.offset, params.limit);
    return { data: response, metadata };
  }

  async getPostsByTag($tag: string) {
    const tag = await this.tagrepository.getTag($tag);
    if (!tag) {
      throw new HTTPException(404, { message: "Tag not Found" });
    }
    return await this.postrepository.getPostsByTag(tag.id);
  }

  async getPostsRandom(limit = 6) {
    const data = await this.postrepository.getPostsRandom(limit);
    const response = data.forEach((post) => {
      post.body = post.body?.substring(0, 200) || "" + "...";
    })
    return response;
  }

  async getPost(id_post: string) {
    return await this.postrepository.getPostById(id_post);
  }

  async getPostBySlug(slug: string) {
    return await this.postrepository.getPostBySlug(slug);
  }

  async deletePost(postId: string, auth_id: string) {
    const deletedPost = await this.postrepository.deletePost(postId, auth_id);
    if (!deletedPost) {
      throw new HTTPException(404, { message: "Post not found" });
    }
    return deletedPost;
  }

  async getPostsByuser(user_id: string, params: GetPaginationParams) {
    const { data, total } = await this.postrepository.getPostsByUser(
      user_id,
      params
    );
    const metadata = getPaginationMetadata(total, params.offset, params.limit);
    return { data, metadata };
  }
  async getPostsByUsername(username: string, limit = 10, offset = 0) {
    return await this.postrepository.getPostsByUsername(
      username,
      limit,
      offset
    );
  }
}
