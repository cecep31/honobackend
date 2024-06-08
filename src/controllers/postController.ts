import { Hono } from "hono";
import { PostService } from '../pkg/services/postService'
import { zValidator } from "@hono/zod-validator";
import { z } from 'zod'
import { auth } from "../middlewares/auth";
import { db } from '../database/drizzel'

export const postController = new Hono()
    .get('/', async (c) => {
        const postservice = new PostService(db)
        if (c.req.query('random')) {
            const posts = await postservice.getPostsRandom()
            return c.json(posts)
        }
        const limit = parseInt(c.req.query('limit')!) || 100
        const offset = parseInt(c.req.query('offset')!) || 0

        const posts = await postservice.getPosts(limit, offset)
        return c.json(posts)
    })

    .get('/:id', async (c) => {
        const postservice = new PostService(db)
        const id = c.req.param('id')
        const post = await postservice.getPost(id)
        return c.json(post)
    })

    .post("/", auth, zValidator("json",
        z.object({
            title: z.string(),
            body: z.string().min(20),
            slug: z.string()
        })
    ), async (c) => {
        const postservice = new PostService(db)
        const auth = c.get("jwtPayload") as jwtPayload;
        const body = await c.req.valid("json");
        const post = postservice.AddPost(auth.id, body.title, body.body, body.slug)
        return c.json(post)
    })

    .delete('/:id', async (c) => {
        const postservice = new PostService(db)
        const id = c.req.param('id')
        const post = postservice.deletePost(id)
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
