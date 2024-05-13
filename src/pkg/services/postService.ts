import { HTTPException } from "hono/http-exception";
import { db } from '../../database/drizzel'
import { posts, users } from "../../../drizzle/schema";
import { desc, eq, sql } from "drizzle-orm";

export class PostService {
    async AddPost(auth_id: string, title: string, body: string, slug: string) {
        const post = await db
            .insert(posts)
            .values({ title: title, body: body, slug: slug, createdBy: auth_id })
            .returning();
        return post
    }

    async getPosts() {
        const postsdata = await db.select().from(posts).orderBy(desc(posts.createdAt) );
        return postsdata;
    }

    async getPostsRandom() {
        const postsData = await db.select().from(posts).orderBy(sql.raw("RANDOM()")).limit(6)
        return postsData
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