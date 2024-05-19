import { desc, eq } from 'drizzle-orm'
import * as Schema from '../../schema/schema';
const { users } = Schema;
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import Bcrypt from 'bcryptjs'
import { HTTPException } from 'hono/http-exception';

class UserService {
    constructor(private db: PostgresJsDatabase<typeof Schema>) { }

    getUsers() {
        return this.db.query.users.findMany({
            columns: {
                password: false
            },
            orderBy: [desc(users.created_at)]
        })
    }
    gerUser(id: string) {
        return this.db.query.users.findFirst({ columns: { password: false }, where: eq(users.id, id) })
    }

    async deleteUser(user_id: string) {
        const look = await this.gerUser(user_id)
        if (!look) {
            throw new HTTPException(404, { message: "User not found" })
        }
        return this.db.delete(users).where(eq(users.id, user_id)).returning({ id: users.id })
    }
    addUser(body: PostUser) {
        const hash_password = Bcrypt.hashSync(body.password)
        console.log(body);

        return this.db.insert(users).values({
            first_name: body.first_name,
            last_name: body.last_name,
            email: body.email,
            password: hash_password,
            image: body.image,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .returning({ id: users.id })
    }
}

export default UserService