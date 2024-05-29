import { Hono } from "hono";
import { PostService } from '../pkg/services/postService'
import { zValidator } from "@hono/zod-validator";
import { z } from 'zod'
import { auth } from "../middlewares/auth";
import { db } from '../database/drizzel'

const postcontroller = new Hono()

postcontroller.get('/', async (c) => {

    const postservice = new PostService(db)
    if (c.req.query('random')) {
        const posts = await postservice.getPostsRandom()
        return c.json(posts)
    }
    const limit = c.req.query('limit') ? parseInt(c.req.query('page') ?? "100") : 100
    const offset = c.req.query('offset') ? parseInt(c.req.query('per_page') ?? "0") : 0

    const posts = await postservice.getPosts(limit, offset)
    return c.json(posts)
})

postcontroller.get('/:id', async (c) => {
    const postservice = new PostService(db)
    const id = c.req.param('id')
    const post = await postservice.getPost(id)
    return c.json(post)
})

postcontroller.post("/", auth, zValidator("json",
    z.object({
        title: z.string(),
        body: z.string(),
        slug: z.string()
    })
), async (c) => {
    const postservice = new PostService(db)
    const auth = c.get("jwtPayload") as jwtPayload;
    const body = await c.req.json();
    const post = postservice.AddPost(auth.id, body.title, body.body, body.slug)
    return c.json(post)
})

postcontroller.delete('/:id', async (c) => {
    const postservice = new PostService(db)
    const id = c.req.param('id')
    const post = postservice.deletePost(id)
    return c.json(post)
})

export default postcontroller;