import { desc, eq, isNull } from 'drizzle-orm'
import * as Schema from '../../database/schema/schema';
import { HTTPException } from 'hono/http-exception';
import { db } from '../../database/drizzel';

export class UserService {

    static getUsers() {
        return db.query.users.findMany({
            columns: {
                password: false
            },
            orderBy: [desc(Schema.users.created_at)],
            where: isNull(Schema.users.deleted_at),
        })
    }
    static gerUser(id: string) {
        return db.query.users.findFirst({ columns: { password: false }, where: eq(Schema.users.id, id) })
    }

    static async deleteUser(user_id: string) {
        const look = await this.gerUser(user_id)
        if (!look) {
            throw new HTTPException(404, { message: "User not found" })
        }
        return await db.update(Schema.users).set({ deleted_at: new Date().toISOString() }).where(eq(Schema.users.id, user_id)).returning({ id: Schema.users.id });
    }
    static async addUser(body: PostUser) {
        const hash_password = Bun.password.hashSync(body.password, { algorithm: 'bcrypt', cost: 12 })
        const resultuser = await db.insert(Schema.users).values({
            first_name: body.first_name,
            last_name: body.last_name,
            email: body.email,
            password: hash_password,
            image: body.image,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).returning({ id: Schema.users.id })

        await db.insert(Schema.profiles).values({
            user_id: resultuser[0].id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })

        return resultuser
    }
}
