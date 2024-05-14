import { eq } from 'drizzle-orm'
import { db } from '../../database/drizzel'
import { users } from '../../../drizzle/schema'
class UserService {
    constructor() { }

    getUsers() {
        return db.query.users.findMany({
            columns: {
                password: false
            }
        })
    }
    gerUser(id: string) {
        return db.query.users.findFirst({ where: eq(users.id, id) })
    }

    deleteUser(user_id: string) {
        return db.delete(users).where(eq(users.id, user_id))
    }
}

export default UserService