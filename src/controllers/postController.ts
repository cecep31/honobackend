import { Hono } from "hono";
import { postservice } from "../pkg/service";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { auth } from "../middlewares/auth";
import type { jwtPayload } from "../types/auth";
import { superAdmin } from "../middlewares/superAdmin";

const postController = new Hono();
postController.get("/", async (c) => {
  const limit = parseInt(c.req.query("limit")!) || 10;
  const offset = parseInt(c.req.query("offset")!) || 0;

  const posts = await postservice.getPosts(limit, offset);
  return c.json(posts);
});
postController.get("/random", async (c) => {
  return c.json(await postservice.getPostsRandom());
});
postController.get("/mine", auth, async (c) => {
  const limit = parseInt(c.req.query("limit")!) || 10;
  const offset = parseInt(c.req.query("offset")!) || 0;
  const auth = c.get("jwtPayload") as jwtPayload;
  if (auth) {
    return c.json(await postservice.getPostsByuser(auth.id, limit, offset));
  } else {
    return c.json({ message: "Unauthorized" }, 401);
  }
});
postController.get("/tag/:tag", async (c) => {
  return c.json(postservice.getPostsByTag(c.req.param("tag")));
});
postController.get("/slug/:slug", async (c) => {
  const post = await postservice.getPostBySlug(c.req.param("slug"));
  if (!post) {
    return c.json({ message: "Post not found" }, 404);
  }
  return c.json(post);
});
postController.get(
  "/username/:username/slug/:slug",
  zValidator(
    "param",
    z.object({
      username: z.string().min(5).max(20),
      slug: z.string().min(5).max(255),
    })
  ),
  async (c) => {
    const username = c.req.param("username");
    const slug = c.req.param("slug");
    const post = await postservice.getPostByuserIdSlug(username, slug);
    if (!post) {
      return c.json({ message: "Post not found" }, 404);
    }
    return c.json(post);
  }
);
postController.get("/all", auth, superAdmin, async (c) => {
  return c.json(await postservice.getAllPosts());
});
//get post by id
postController.get(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const id = c.req.param("id");
    const post = await postservice.getPost(id);
    if (!post) {
      return c.json({ message: "Post not found" }, 404);
    }
    return c.json(post);
  }
);
postController.post(
  "/",
  auth,
  zValidator(
    "json",
    z.object({
      title: z.string().min(5).max(255),
      body: z.string().min(20).max(10000),
      slug: z.string().min(5).max(255),
      tags: z.array(z.string()).optional().default([]),
      photo_url: z.string().optional().default("/images/default.jpg"),
      published: z.boolean().optional().default(true),
    })
  ),
  async (c) => {
    const auth = c.get("jwtPayload") as jwtPayload;
    const body = c.req.valid("json");
    return c.json(await postservice.addPost(auth.id, body));
  }
);

postController.delete("/:id", auth, superAdmin, async (c) => {
  const id = c.req.param("id");
  const post = await postservice.deletePost(id);
  return c.json(post);
});
postController.patch(
  "/:id/published",
  auth,
  zValidator("json", z.object({ published: z.boolean() })),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const body = c.req.valid("json");
    const id = c.req.param("id");
    const user = c.get("jwtPayload") as jwtPayload;
    const post = await postservice.UpdatePublishedByadmin(id, body.published);
    return c.json(post);
  }
);

export default postController;
