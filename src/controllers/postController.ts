import { Hono } from "hono";
import { PostService } from "../pkg/services/postService";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { auth } from "../middlewares/auth";

const postservice = new PostService();

export const postController = new Hono()
  .get("/", async (c) => {
    if (c.req.query("random")) {
      return c.json(await postservice.getPostsRandom());
    }

    const limit = parseInt(c.req.query("limit")!) || 10;
    const offset = parseInt(c.req.query("offset")!) || 0;

    if (c.req.query("username")) {
      return c.json(
        await postservice.getPostsByUsername(
          c.req.query("username")!,
          limit,
          offset
        )
      );
    }

    const posts = await PostService.getPosts(limit, offset);
    return c.json(posts);
  })
  .get("/me", auth, async (c) => {
    const limit = parseInt(c.req.query("limit")!) || 10;
    const offset = parseInt(c.req.query("offset")!) || 0;
    const auth = c.get("jwtPayload") as jwtPayload;
    if (auth) {
      return c.json(await postservice.getPostsByuser(auth.id, limit, offset));
    } else {
      return c.json({ message: "Unauthorized" }, 401);
    }
  })
  .get("/tag/:tag", async (c) => {
    const posts = await PostService.getPostsByTag(c.req.param("tag"));
    return c.json(posts);
  })
  .get("/slug/:slug", async (c) => {
    const post = await postservice.getPostBySlug(c.req.param("slug"));
    if (!post) {
      return c.json({ message: "Post not found" }, 404);
    }
    return c.json(post);
  })
  .get(
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
  )
  .post(
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
  )
  .delete("/:id", auth, async (c) => {
    const id = c.req.param("id");
    const post = await PostService.deletePost(id);
    return c.json(post);
  });

// postcontroller.post("/image", async (c) => {
//     const postservice = new PostService(db)
//     const request = await c.req.parseBody()
//     const file = request['file'] as File
//     postservice.uploadFile(file)
//     console.log(file);

//     return c.json({})
// })
