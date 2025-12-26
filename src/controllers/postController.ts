import { Hono } from "hono";
import { postService } from "../pkg/service";
import { auth } from "../middlewares/auth";
import type { jwtPayload } from "../types/auth";
import { superAdminMiddleware } from "../middlewares/superAdmin";
import { getPaginationParams } from "../utils/paginate";
import { validateRequest } from "../middlewares/validateRequest";
import type { Variables } from "../types/context";
import {
  createPostSchema,
  postByUsernameSlugSchema,
  postIdSchema,
  updatePublishedSchema,
} from "../validations/post";

export const postController = new Hono<{ Variables: Variables }>();

postController.get("/", async (c) => {
  try {
    const params = getPaginationParams(c);
    const posts = await postService.getPosts(params);
    return c.json({
      ...posts,
      message: "Posts fetched successfully",
      success: true,
      error: null,
      requestId: c.get("requestId") || "N/A",
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return c.json(
      {
        message: "Failed to fetch posts",
        success: false,
        error: "An unexpected error occurred",
        requestId: c.get("requestId") || "N/A",
      },
      500
    );
  }
});

postController.get("/random", async (c) => {
  try {
    const posts = await postService.getPostsRandom();
    return c.json({
      success: true,
      data: posts,
      message: "Posts fetched",
      requestId: c.get("requestId") || "N/A",
    });
  } catch (error) {
    console.error("Error fetching random posts:", error);
    return c.json(
      {
        success: false,
        message: "Failed to fetch random posts",
        error: "an unpected error",
        requestId: c.get("requestId") || "N/A",
      },
      500
    );
  }
});

postController.get("/mine", auth, async (c) => {
  const params = getPaginationParams(c);
  const auth = c.get("user");
  const posts = await postService.getPostsByuser(auth.user_id, params);
  return c.json({
    ...posts,
    message: "Posts fetched successfully",
    success: true,
    error: null,
    requestId: c.get("requestId") || "N/A",
  });
});

postController.get("/tag/:tag", async (c) => {
  return c.json(postService.getPostsByTag(c.req.param("tag")));
});

postController.get("/slug/:slug", async (c) => {
  const post = await postService.getPostBySlug(c.req.param("slug"));
  if (!post) {
    return c.json({ message: "Post not found" }, 404);
  }
  return c.json(post);
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
      return c.json(
        {
          success: false,
          message: "Post not found",
          data: null,
          requestId: c.get("requestId") || "N/A",
        },
        404
      );
    }
    return c.json({
      success: true,
      data: post,
      message: "Post fetched",
      requestId: c.get("requestId") || "N/A",
    });
  }
);

postController.get("/all", auth, superAdminMiddleware, async (c) => {
  try {
    const posts = await postService.getAllPosts();
    return c.json({ success: true, data: posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return c.json(
      {
        message: "Failed to fetch posts",
        success: false,
        error: "An unexpected error occurred",
        requestId: c.get("requestId") || "N/A",
      },
      500
    );
  }
});
//get post by id
postController.get(
  "/:id",
  validateRequest("param", postIdSchema),
  async (c) => {
    const id = c.req.param("id");
    const post = await postService.getPost(id);
    if (!post) {
      return c.json({ message: "Post not found" }, 404);
    }
    return c.json(post);
  }
);
postController.post(
  "/",
  auth,
  validateRequest("json", createPostSchema),
  async (c) => {
    const auth = c.get("user");
    const body = c.req.valid("json");
    return c.json(await postService.addPost(auth.user_id, body));
  }
);

postController.delete("/:id", auth, async (c) => {
  const id = c.req.param("id");
  const auth = c.get("user") as jwtPayload;
  const post = await postService.deletePost(id, auth.user_id);
  return c.json(post);
});

postController.patch(
  "/:id/published",
  auth,
  validateRequest("json", updatePublishedSchema),
  validateRequest("param", postIdSchema),
  async (c) => {
    const body = c.req.valid("json");
    const id = c.req.param("id");
    // const user = c.get("jwtPayload") as jwtPayload;
    const post = await postService.UpdatePublishedByadmin(id, body.published);
    return c.json(post);
  }
);