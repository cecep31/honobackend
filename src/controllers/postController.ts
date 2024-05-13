import { Hono } from "hono";
import { PostService } from '../pkg/services/postService'
import { zValidator } from "@hono/zod-validator";
import { z } from 'zod'
import { auth } from "../middlewares/auth";

const postcontroller = new Hono()
const postservice = new PostService()

postcontroller.get('/', async (c) => {
    if (c.req.query('random')) {
        const posts = await postservice.getPostsRandom()
        return c.json(posts)
    }
    const posts = await postservice.getPosts()
    return c.json(posts)
})

postcontroller.get('/:id', async (c) => {
    const id = c.req.param('id')
    const post = await postservice.getPost(id)
    return c.json(post)
})

postcontroller.post("/", auth,zValidator("json",
    z.object({
        title: z.string(),
        body: z.string(),
        slug: z.string()
    })
), async (c) => {
    const auth = c.get("jwtPayload") as jwtPayload;  
    const body = await c.req.json();  
    const post = postservice.AddPost(auth.id, body.title, body.body, body.slug)
    return c.json(post)
})

postcontroller.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const post = postservice.deletePost(id)
    return c.json(post)
})

export default postcontroller;