import { eq } from "drizzle-orm";
import { db } from "../../database/drizzel";
import * as Schema from '../../database/schema/schema'

export class WritetService {
    static async getWriterByUsername(username: string) {
        return await db.query.users.findFirst({
            where: eq(Schema.users.username, username),
            with: { profile: true }
        })
    }
}