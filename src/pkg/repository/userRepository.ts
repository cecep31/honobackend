import { db } from "../../database/drizzel";
import { eq } from 'drizzle-orm';
import { users as usersModel } from '../../database/schema/schema';

export class UserRepository {
    async getUser(id: string) {
        return db.query.users.findFirst({ 
            where:  eq(usersModel.id, id)
        });
    }

    async getUserByEmail(email: string) {
        return db.query.users.findFirst({ 
            where:  eq(usersModel.email, email)
        });
    }
    async updatePassword(id: string, password: string) {
        return db.update(usersModel).set({ password: password }).where(eq(usersModel.id, id)).returning({ id: usersModel.id });
    }
}