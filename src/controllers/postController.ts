import { Hono } from "hono";
import { PostService } from '../pkg/services/postService'
import { database } from "../config/database";

const postcontroller = new Hono()
const postservice = new PostService(database)

postcontroller.get('/', async (c) => {
    const param = c.req.query()
    const posts = await postservice.getPosts(param)
    return c.json(posts)
})

postcontroller.get('/:id', async (c) => {
    const id = c.req.param('id')
    const post = await postservice.getPost(id)
    return c.json(post)
})

export default postcontroller;