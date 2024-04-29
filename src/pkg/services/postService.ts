import { PrismaClient } from "@prisma/client";

export class PostService {
    constructor(private database: PrismaClient) {}

    async getPosts() {
        const posts = await this.database.posts.findMany({
            orderBy: {
                created_at: 'desc'
            }
        });

        return posts;
    }
}