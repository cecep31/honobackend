import { HTTPException } from "hono/http-exception";
import * as Schema from '../../schema/schema'
import { count, desc, eq, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export class PostService {
    constructor(private db: PostgresJsDatabase<typeof Schema>) { }
    async AddPost(auth_id: string, title: string, body: string, slug: string) {
        const post = await this.db
            .insert(Schema.posts)
            .values({ title: title, body: body, slug: slug, created_by: auth_id })
            .returning();
        return post
    }

    async getPosts(perPgae = 0, page = 1) {
        let postsdata: any
        if (perPgae === 0) {
            postsdata = await this.db.select().from(Schema.posts).orderBy(desc(Schema.posts.created_at));
            return postsdata;

        } else {
            postsdata = await this.db.select().from(Schema.posts).orderBy(desc(Schema.posts.created_at)).limit(perPgae).offset((page - 1) * perPgae);
            postsdata = await this.db.query.posts.findMany({
                orderBy: desc(Schema.posts.created_at),
                limit: perPgae,
                with: {
                    creator: true
                },
                offset: (page - 1) * perPgae,
            })
            const total = await this.db.select({ count: count() }).from(Schema.posts)
            console.log(total);
            return { data: postsdata, total: total[0].count }
        }
    }

    async getPostsRandom() {
        const postsData = await this.db.select().from(Schema.posts).orderBy(sql.raw("RANDOM()")).limit(6)
        return postsData
    }

    async getPost(id_post: string) {
        const post = await this.db.query.posts.findFirst({ where: eq(Schema.posts.id, id_post) })

        if (!post) {
            throw new HTTPException(404, { message: "Post not Found" })
        }
        return post
    }
    async deletePost(postId: string) {
        const deletedPost = await this.db.delete(Schema.posts).where(eq(Schema.posts.id, postId)).returning();
        if (!deletedPost) {
            throw new HTTPException(404, { message: "Post not found" });
        }
        return { id: postId };
    }
}