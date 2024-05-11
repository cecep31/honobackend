import { HTTPException } from "hono/http-exception";
import { db } from '../../database/drizzel'
import { posts } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

export class PostService {
    constructor() { }

    async getPosts() {
        const postsdata = await db.select().from(posts);
        return postsdata;
    }

    async getPost(id_post: string) {
        const post = await db.select().from(posts).where(eq(posts.id, id_post))
        if (!post) {
            throw new HTTPException(404, { message: "Post not Found" })
        }
        return post
    }
    // async deletePost(id_post: string) {
    //     const post = await this.database.posts.delete({
    //         where: {
    //             id: id_post
    //         }
    //     })
    //     if (!post) {
    //         throw new HTTPException(404, { message: "post not found" })
    //     }
    //     return { id: post.id }
    // }
}