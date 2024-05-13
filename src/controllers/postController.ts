import { Hono } from "hono";
import { PostService } from '../pkg/services/postService'
import { zValidator } from "@hono/zod-validator";
import { z } from 'zod'

const postcontroller = new Hono()
const postservice = new PostService()

postcontroller.get('/', async (c) => {
    const posts = await postservice.getPosts()
    return c.json(posts)
})

postcontroller.get('/:id', async (c) => {
    const id = c.req.param('id')
    const post = await postservice.getPost(id)
    return c.json(post)
})

postcontroller.post("/", zValidator("json",
    z.object({
        title: z.string(),
        body: z.string(),
        slug: z.string()
    })
), (c) => {
    return c.text("hello world")
})

postcontroller.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const post = postservice.deletePost(id)
    return c.json(post)
})

export default postcontroller;