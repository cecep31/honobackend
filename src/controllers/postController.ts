import { Hono } from "hono";
import { postService } from "../pkg/service";
import { auth } from "../middlewares/auth";
import type { jwtPayload } from "../types/auth";
import { superAdminMiddleware } from "../middlewares/superAdmin";
import { getPaginationParams } from "../utils/paginate";
import { validateRequest } from "../middlewares/validateRequest";
import type { Variables } from "../types/context";
import { sendSuccess } from "../utils/response";
import { Errors } from "../utils/error";
import {
  createPostSchema,
  postByUsernameSlugSchema,
  postIdSchema,
  updatePublishedSchema,
} from "../validations/post";

export const postController = new Hono<{ Variables: Variables }>();

postController.get("/", async (c) => {
  const params = getPaginationParams(c);
  const { data, meta } = await postService.getPosts(params);
  return sendSuccess(c, data, "Posts fetched successfully", 200, meta);
});

postController.get("/random", async (c) => {
  const posts = await postService.getPostsRandom();
  return sendSuccess(c, posts, "Random posts fetched successfully");
});

postController.get("/mine", auth, async (c) => {
  const params = getPaginationParams(c);
  const auth = c.get("user");
  const { data, meta } = await postService.getPostsByuser(auth.user_id, params);
  return sendSuccess(c, data, "My posts fetched successfully", 200, meta);
});

postController.get("/tag/:tag", async (c) => {
  const posts = await postService.getPostsByTag(c.req.param("tag"));
  return sendSuccess(c, posts, "Posts by tag fetched successfully");
});

postController.get("/slug/:slug", async (c) => {
  const post = await postService.getPostBySlug(c.req.param("slug"));
  if (!post) {
    throw Errors.NotFound("Post");
  }
  return sendSuccess(c, post, "Post fetched successfully");
});

postController.get(
  "u/:username/:slug",
  validateRequest("param", postByUsernameSlugSchema),
  async (c) => {
    const params = c.req.valid("param");
    const post = await postService.getPostByUsernameSlug(
      params.username,
      params.slug
    );
    if (!post) {
      throw Errors.NotFound("Post");
    }
    return sendSuccess(c, post, "Post fetched successfully");
  }
);

postController.get("/all", auth, superAdminMiddleware, async (c) => {
  const posts = await postService.getAllPosts();
  return sendSuccess(c, posts, "All posts fetched successfully");
});

//get post by id
postController.get(
  "/:id",
  validateRequest("param", postIdSchema),
  async (c) => {
    const id = c.req.param("id");
    const post = await postService.getPost(id);
    if (!post) {
      throw Errors.NotFound("Post");
    }
    return sendSuccess(c, post, "Post fetched successfully");
  }
);

postController.post(
  "/",
  auth,
  validateRequest("json", createPostSchema),
  async (c) => {
    const auth = c.get("user");
    const body = c.req.valid("json");
    const post = await postService.addPost(auth.user_id, body);
    return sendSuccess(c, post, "Post created successfully", 201);
  }
);

postController.delete("/:id", auth, async (c) => {
  const id = c.req.param("id");
  const auth = c.get("user") as jwtPayload;
  const post = await postService.deletePost(id, auth.user_id);
  return sendSuccess(c, post, "Post deleted successfully");
});

postController.patch(
  "/:id/published",
  auth,
  validateRequest("json", updatePublishedSchema),
  validateRequest("param", postIdSchema),
  async (c) => {
    const body = c.req.valid("json");
    const id = c.req.param("id");
    const post = await postService.UpdatePublishedByadmin(id, body.published);
    return sendSuccess(c, post, "Post published status updated successfully");
  }
);
