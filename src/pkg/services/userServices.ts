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
}

export default UserService