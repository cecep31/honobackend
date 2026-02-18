import { Hono } from "hono";
import { postService } from "../../../services/index";
import { auth } from "../../../middlewares/auth";
import type { jwtPayload } from "../../../types/auth";
import { superAdminMiddleware } from "../../../middlewares/superAdmin";
import { validateRequest } from "../../../middlewares/validateRequest";
import type { Variables } from "../../../types/context";
import { sendSuccess } from "../../../utils/response";
import { Errors } from "../../../utils/error";
import { getS3Helper } from "../../../utils/s3";
import {
  chartLimitQuerySchema,
  createPostSchema,
  listPostsQuerySchema,
  postByUsernameSlugSchema,
  postIdSchema,
  postsOverTimeQuerySchema,
  updatePostSchema,
} from "../validation";

export const postController = new Hono<{ Variables: Variables }>();

postController.get(
  "/",
  validateRequest("query", listPostsQuerySchema),
  async (c) => {
    const q = c.req.valid("query");
    const params = {
      offset: q.offset,
      limit: q.limit,
      search: q.search ?? q.q,
      orderBy: q.orderBy,
      orderDirection: q.orderDirection,
    };
    const { data, meta } = await postService.getPosts(params);
    return sendSuccess(c, data, "Posts fetched successfully", 200, meta);
  }
);

postController.get("/random", async (c) => {
  const posts = await postService.getPostsRandom();
  return sendSuccess(c, posts, "Random posts fetched successfully");
});

postController.get("/trending", async (c) => {
  const posts = await postService.getTrendingPosts(5);
  return sendSuccess(c, posts, "Trending posts fetched successfully");
});

postController.get(
  "/me",
  auth,
  validateRequest("query", listPostsQuerySchema),
  async (c) => {
    const q = c.req.valid("query");
    const params = {
      offset: q.offset,
      limit: q.limit,
      search: q.search ?? q.q,
      orderBy: q.orderBy,
      orderDirection: q.orderDirection,
    };
    const authUser = c.get("user");
    const { data, meta } = await postService.getPostsByUser(
      authUser.user_id,
      params
    );
    return sendSuccess(c, data, "My posts fetched successfully", 200, meta);
  }
);

postController.get("/tag/:tag", async (c) => {
  const posts = await postService.getPostsByTag(c.req.param("tag"));
  return sendSuccess(c, posts, "Posts by tag fetched successfully");
});

postController.get(
  "/author/:username",
  validateRequest("query", listPostsQuerySchema),
  async (c) => {
    const username = c.req.param("username");
    const q = c.req.valid("query");
    const params = {
      offset: q.offset,
      limit: q.limit,
      search: q.search ?? q.q,
      orderBy: q.orderBy,
      orderDirection: q.orderDirection,
    };
    const { data, meta } = await postService.getPostsByUsername(
      username,
      params.limit,
      params.offset
    );
    return sendSuccess(
      c,
      data,
      `Posts by ${username} fetched successfully`,
      200,
      meta
    );
  }
);

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

// Chart endpoints — must be registered BEFORE /:id to prevent route shadowing.
// Hono matches routes in registration order; /:id would otherwise capture /charts/* requests.
postController.get(
  "/charts/posts-over-time",
  validateRequest("query", postsOverTimeQuerySchema),
  async (c) => {
    const { days, groupBy } = c.req.valid("query");
    const data = await postService.getPostsOverTime(days, groupBy);
    return sendSuccess(c, data, "Posts over time data fetched successfully");
  }
);

postController.get(
  "/charts/posts-by-tag",
  validateRequest("query", chartLimitQuerySchema),
  async (c) => {
    const { limit } = c.req.valid("query");
    const data = await postService.getPostsByTagDistribution(limit);
    return sendSuccess(c, data, "Posts by tag distribution fetched successfully");
  }
);

postController.get(
  "/charts/top-by-views",
  validateRequest("query", chartLimitQuerySchema),
  async (c) => {
    const { limit } = c.req.valid("query");
    const data = await postService.getTopPostsByViews(limit);
    return sendSuccess(c, data, "Top posts by views fetched successfully");
  }
);

postController.get(
  "/charts/top-by-likes",
  validateRequest("query", chartLimitQuerySchema),
  async (c) => {
    const { limit } = c.req.valid("query");
    const data = await postService.getTopPostsByLikes(limit);
    return sendSuccess(c, data, "Top posts by likes fetched successfully");
  }
);

postController.get(
  "/charts/user-activity",
  validateRequest("query", chartLimitQuerySchema),
  async (c) => {
    const { limit } = c.req.valid("query");
    const data = await postService.getUserActivity(limit);
    return sendSuccess(c, data, "User activity data fetched successfully");
  }
);

postController.get("/charts/engagement-metrics", async (c) => {
  const data = await postService.getEngagementMetrics();
  return sendSuccess(c, data, "Engagement metrics fetched successfully");
});

postController.get(
  "/charts/engagement-comparison",
  validateRequest("query", chartLimitQuerySchema),
  async (c) => {
    const { limit } = c.req.valid("query");
    const data = await postService.getEngagementComparison(limit);
    return sendSuccess(c, data, "Engagement comparison data fetched successfully");
  }
);

// Get post by id (auth required, owner only) — keep this AFTER all static/prefix GET routes
postController.get(
  "/:id",
  auth,
  validateRequest("param", postIdSchema),
  async (c) => {
    const id = c.req.param("id");
    const authUser = c.get("user");
    const post = await postService.getPostByIdForOwner(id, authUser.user_id);
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
    const authUser = c.get("user");
    const body = c.req.valid("json");
    const post = await postService.addPost(authUser.user_id, body);
    return sendSuccess(c, post, "Post created successfully", 201);
  }
);

postController.patch(
  "/:id",
  auth,
  validateRequest("param", postIdSchema),
  validateRequest("json", updatePostSchema),
  async (c) => {
    const id = c.req.param("id");
    const authUser = c.get("user") as jwtPayload;
    const body = c.req.valid("json");
    const post = await postService.updatePost(id, authUser.user_id, body);
    return sendSuccess(c, post, "Post updated successfully");
  }
);

postController.post(
  "/:id/view",
  validateRequest("param", postIdSchema),
  async (c) => {
    const id = c.req.param("id");
    const result = await postService.incrementView(id);
    return sendSuccess(c, result, "Post view incremented");
  }
);

postController.delete("/:id", auth, async (c) => {
  const id = c.req.param("id");
  const authUser = c.get("user") as jwtPayload;
  const post = await postService.deletePost(id, authUser.user_id);
  return sendSuccess(c, post, "Post deleted successfully");
});

// Upload image endpoint
postController.post("/upload/image", auth, async (c) => {
  const authUser = c.get("user") as jwtPayload;
  const formData = await c.req.formData();
  const file = formData.get("image") as File;

  if (!file) {
    throw Errors.InvalidInput("image", "No image file provided");
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw Errors.InvalidInput("image", "Invalid file type. Allowed: JPEG, PNG, GIF, WebP");
  }

  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw Errors.InvalidInput("image", "File size exceeds 5MB limit");
  }

  // Generate unique key for the file
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = file.name.split(".").pop() || "jpg";
  const key = `posts/${authUser.user_id}/${timestamp}-${randomStr}.${extension}`;

  // Get file buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to S3
  const s3 = getS3Helper();
  const url = await s3.uploadFile(key, buffer);

  return sendSuccess(c, { url }, "Image uploaded successfully", 201);
});

