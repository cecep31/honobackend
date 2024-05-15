import { eq } from 'drizzle-orm'
import { users } from '../../../drizzle/schema'
import * as Schema from '../../../drizzle/schema'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

class UserService {
    constructor(private db: PostgresJsDatabase<typeof Schema>) {}

    getUsers() {
        return this.db.query.users.findMany({
            columns: {
                password: false
            }
        })
    }
    gerUser(id: string) {
        return this.db.query.users.findFirst({ where: eq(users.id, id) })
    }

    deleteUser(user_id: string) {
        return this.db.delete(users).where(eq(users.id, user_id))
    }
}

export default UserService