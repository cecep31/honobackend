import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../database/drizzel";
import { users } from '../../database/schema/schema'

export class WritetService {
    static async getWriterByUsername(username: string) {
        const user = await db.query.users.findFirst({
            columns: { password: false, updated_at: false },
            where: and(eq(users.username, username), isNull(users.deleted_at)),
            with: { profile: { columns: { id: false, updated_at: false } } }
        })
        return user
    }
}