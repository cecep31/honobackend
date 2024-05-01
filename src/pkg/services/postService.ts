import { PrismaClient, Prisma } from "@prisma/client";
import { HTTPException } from "hono/http-exception";

export class PostService {
    constructor(private database: PrismaClient) { }

    async getPosts(params: {
        skip?: number;
        take?: number;
        cursor?: Prisma.postsWhereUniqueInput;
        where?: Prisma.postsWhereInput;
        orderBy?: Prisma.postsOrderByWithRelationInput;
    }) {
        const { skip, take, cursor, where, orderBy } = params;
        const posts = await this.database.posts.findMany({
            skip,
            take,
            cursor,
            where,
            orderBy,
        });

        return posts;
    }

    async getPost(id_post: string) {
        const post = await this.database.posts.findUnique({
            where: { id: id_post }, include: {
                users: { select: { id: true, first_name: true, last_name: true, email: true, issuperadmin: true, password: false, image: true } }
            }
        })
        if (!post) {
            throw new HTTPException(404, { message: "Post not Found" })
        }
        return post
    }
}