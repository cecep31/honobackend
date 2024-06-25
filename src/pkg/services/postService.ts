import { HTTPException } from "hono/http-exception";
import * as Schema from '../../database/schema/schema'
import { count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../database/drizzel";
import Postgres from "postgres";

export class PostService {
    static async addPost(auth_id: string, title: string, body: string, slug: string, tags: string[] = []) {
        try {

            const post = await db
                .insert(Schema.posts)
                .values({ title: title, body: body, slug: slug, created_by: auth_id, created_at: new Date().toISOString() })
                .returning({
                    id: Schema.posts.id,
                });

            if (tags.length > 0) {
                for (const tag of tags) {
                    await db.insert(Schema.tags).values({ name: tag }).onConflictDoNothing();
                }
            }

            const getTags = await db.query.tags.findMany({ where: inArray(Schema.tags.name, tags) });

            for (const tag of getTags) {
                await db
                    .insert(Schema.postsToTags)
                    .values({ posts_id: post[0].id, tags_id: tag.id })
                    .onConflictDoNothing();
            }

            return post[0];
        } catch (error) {
            if (error instanceof Postgres.PostgresError) {
                if (error.code == "23505") {
                    throw new HTTPException(400, { message: "slug already exist" });
                }
            } else {
                console.log(error);
                throw new HTTPException(500, { message: "internal server error" });
            }

        }
    }

    static async getPosts(limit = 100, offset = 0) {
        const postsdata = await db.query.posts.findMany({
            orderBy: desc(Schema.posts.created_at),
            limit: limit,
            with: {
                creator: {
                    columns: { username: true, first_name: true, last_name: true, image: true },
                },
                tags: {
                    columns: {},
                    with: {
                        tag: true
                    }
                }
            },
            offset: offset,
        })
        const total = await db.select({ count: count() }).from(Schema.posts)
        return { data: postsdata, total: total[0].count }
    }

    static async getYourPosts(user_id: string, limit = 100, offset = 0) {
        const postsdata = await db.query.posts.findMany({
            orderBy: desc(Schema.posts.created_at),
            limit: limit,
            with: {
                creator: {
                    columns: { username: true, first_name: true, last_name: true, image: true },
                },
                tags: {
                    columns: {},
                    with: {
                        tag: true
                    }
                }
            },
            where: eq(Schema.posts.created_by, user_id),
            offset: offset,
        })
        const total = await db.select({ count: count() }).from(Schema.posts)
        return { data: postsdata, total: total[0].count }
    }

    static async getPostsByTag($tag: string) {
        const tag = await db.query.tags.findFirst({ where: eq(Schema.tags.name, $tag) })
        if (!tag) {
            throw new HTTPException(404, { message: "Tag not Found" })
        }
        const postsdata = await db.select({ id: Schema.posts.id, title: Schema.posts.title, slug: Schema.posts.slug, body: Schema.posts.body, created_at: Schema.posts.created_at })
            .from(Schema.posts).rightJoin(Schema.postsToTags, eq(Schema.posts.id, Schema.postsToTags.posts_id)).where(eq(Schema.postsToTags.tags_id, tag.id)).orderBy(desc(Schema.posts.created_at))

        return { data: postsdata, message: "success" }
    }

    static async getPostsRandom() {
        const postsData = await db.select().from(Schema.posts).orderBy(sql.raw("RANDOM()")).limit(6)
        return postsData
    }

    static async getPost(id_post: string) {
        const post = await db.query.posts.findFirst({ where: eq(Schema.posts.id, id_post) })

        if (!post) {
            throw new HTTPException(404, { message: "Post not Found" })
        }
        return post
    }
    static async deletePost(postId: string) {
        const deletedPost = await db.delete(Schema.posts).where(eq(Schema.posts.id, postId)).returning();
        if (!deletedPost) {
            throw new HTTPException(404, { message: "Post not found" });
        }
        return deletedPost;
    }

    static async getPostsByuser(user_id: string) {
        const postsdata = await db.select({
            id: Schema.posts.id,
            title: Schema.posts.title,
            slug: Schema.posts.slug,
            body: Schema.posts.body,
            created_at: Schema.posts.created_at,
            creator: { id: Schema.users.id, username: Schema.users.username },
        })
            .from(Schema.posts)
            .leftJoin(Schema.users, eq(Schema.posts.created_by, Schema.users.id))
            .where(eq(Schema.posts.created_by, user_id))
            .orderBy(desc(Schema.posts.created_at))

        return postsdata
    }
    // async uploadFile(file: File) {

    //     console.log(file.toString());
    //     const readableStream = new Readable();
    //     const pipelineAsync = promisify(pipeline);
    //     await pipelineAsync(file.stream(), readableStream);
    //     const result = await minioClient.putObject(process.env.S3_BUCKET!, file.name, readableStream, file.size)
    //     console.log(result);

    //     return result.versionId
    // }
}