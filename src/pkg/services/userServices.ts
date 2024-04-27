import { Database } from "../../config/database";

class UserService {
    constructor(private database: Database) { }

    getUsers() {
        return this.database.client.users.findMany();
    }
    gerUser(id: string) {
        return this.database.client.users.findUnique({ where: { id } })
    }
}

export default UserService