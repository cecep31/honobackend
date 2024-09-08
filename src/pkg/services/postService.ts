import { HTTPException } from "hono/http-exception";
import Postgres from "postgres";
import { PostRepository } from "../repository/postRepository";
import { tagRepository } from "../repository/tagRepository";
import type { PostCreateBody } from "../../types/post";
import { UserRepository } from "../repository/userRepository";

export class PostService {
  private postrepository: PostRepository;
  private tagrepository: tagRepository;
  private userrepository: UserRepository;
  constructor() {
    this.postrepository = new PostRepository();
    this.tagrepository = new tagRepository();
    this.userrepository = new UserRepository();
  }

  async UpdatePublishedByadmin(id: string, published: boolean) {
    return this.postrepository.updatePostPublished(id, published);
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
          throw new HTTPException(400, { message: "slug already exist" });
        }
      } else {
        console.log(error);
        throw new HTTPException(500, { message: "internal server error" });
      }
    }
  }
  async getPostByuserIdSlug(username: string, slug: string) {
    const user = await this.userrepository.getUserByUsername(username);
    if (!user) {
      return undefined;
    }
    return this.postrepository.getPostByCreatorSlug(user.id, slug);
  }

  async getPosts(limit = 100, offset = 0) {
    return this.postrepository.getPostsPaginate(limit, offset);
  }

  async getPostsByTag($tag: string) {
    const tag = await this.tagrepository.getTag($tag);
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

  async deletePost(postId: string) {
    const deletedPost = await this.postrepository.deletePostPermanent(postId);
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
}
