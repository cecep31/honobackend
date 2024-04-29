import { Hono } from "hono";
import { PostService } from '../pkg/services/postService'
import { database } from "../config/database";

const postcontroller = new Hono()
const postservice = new PostService(database)

postcontroller.get('/', async (c) => {
    const posts = await postservice.getPosts()
    return c.json(posts)
})

export default postcontroller;