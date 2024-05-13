import { HTTPException } from "hono/http-exception";
import { db } from '../../database/drizzel'
import { posts, users } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

export class PostService {
    constructor() { }

    async getPosts() {
        const postsdata = await db.select().from(posts);
        return postsdata;
    }

    async getPost(id_post: string) {
        const post = await db.query.posts.findFirst({ where: eq(posts.id, id_post) })
        if (!post) {
            throw new HTTPException(404, { message: "Post not Found" })
        }
        return post
    }
    async deletePost(postId: string) {
        const deletedPost = await db.delete(posts).where(eq(posts.id, postId)).returning();
        if (!deletedPost) {
            throw new HTTPException(404, { message: "Post not found" });
        }
        return { id: postId };
    }
}