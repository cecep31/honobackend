import { Hono } from "hono";
import { PostService } from "../pkg/services/postService";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { auth } from "../middlewares/auth";
import { notAuth } from "../middlewares/notauth";

export const postController = new Hono()
  .get("/", notAuth, async (c) => {
    if (c.req.query("random")) {
      const posts = await PostService.getPostsRandom();
      return c.json(posts);
    } else if (c.req.query("user_id")) {
      return c.json(await PostService.getPostsByuser(c.req.query("user_id")!));
    }

    const limit = parseInt(c.req.query("limit")!) || 100;
    const offset = parseInt(c.req.query("offset")!) || 0;

    if (c.req.query("yourPost")) {
      const auth = c.get("jwtPayload") as jwtPayload;
      if (auth) {
        return c.json(await PostService.getYourPosts(auth.id, limit, offset));
      } else {
        return c.json({ message: "Unauthorized" }, 401);
      }
    }

    if (c.req.query("user_id")) {
        return c.json(await PostService.getPostByUserId(c.req.query("user_id")!));
    }

    const posts = await PostService.getPosts(limit, offset);
    return c.json(posts);
  })
  .get("/tag/:tag", async (c) => {
    // const limit = parseInt(c.req.query('limit')!) || 100
    // const offset = parseInt(c.req.query('offset')!) || 0
    const posts = await PostService.getPostsByTag(c.req.param("tag"));
    return c.json(posts);
  })

  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const post = await PostService.getPost(id);
    return c.json(post);
  })

  .post(
    "/",
    auth,
    zValidator(
      "json",
      z.object({
        title: z.string().min(5).max(255),
        body: z.string().min(20).max(10000),
        slug: z.string().min(5).max(255),
        tags: z.array(z.string()).optional(),
      })
    ),
    async (c) => {
      const auth = c.get("jwtPayload") as jwtPayload;
      const body = c.req.valid("json");

      return c.json(
        await PostService.addPost(
          auth.id,
          body.title,
          body.body,
          body.slug,
          body.tags
        )
      );
    }
  )
  .delete("/:id", async (c) => {
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
