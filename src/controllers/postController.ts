import { Hono } from "hono";
import { PostService } from '../pkg/services/postService'
import { zValidator } from "@hono/zod-validator";
import { z } from 'zod'
import { auth } from "../middlewares/auth";

export const postController = new Hono()
    .get('/', async (c) => {
        if (c.req.query('random')) {
            const posts = await PostService.getPostsRandom()
            return c.json(posts)
        }
        const limit = parseInt(c.req.query('limit')!) || 100
        const offset = parseInt(c.req.query('offset')!) || 0

        const posts = await PostService.getPosts(limit, offset)
        return c.json(posts)
    })

    .get('/:id', async (c) => {
        const id = c.req.param('id')
        const post = await PostService.getPost(id)
        return c.json(post)
    })

    .post("/", auth, zValidator("json",
        z.object({
            title: z.string(),
            body: z.string().min(20),
            slug: z.string()
        })
    ), async (c) => {
        const auth = c.get("jwtPayload") as jwtPayload;
        const body = await c.req.valid("json");
        const post = PostService.AddPost(auth.id, body.title, body.body, body.slug)
        return c.json(post)
    })

    .delete('/:id', async (c) => {
        const id = c.req.param('id')
        const post = PostService.deletePost(id)
        return c.json(post)
    })

// postcontroller.post("/image", async (c) => {
//     const postservice = new PostService(db)
//     const request = await c.req.parseBody()
//     const file = request['file'] as File
//     postservice.uploadFile(file)
//     console.log(file);

//     return c.json({})
// })
