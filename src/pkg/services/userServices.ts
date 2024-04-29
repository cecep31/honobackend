import { Database } from "../../config/database";

class UserService {
    constructor(private database: Database) { }

    getUsers() {
        return this.database.client.users.findMany({ select: {id: true, first_name: true, last_name: true, email: true,issuperadmin: true, password: false, image: true } });
    }
    gerUser(id: string) {
        return this.database.client.users.findUnique({ where: { id } })
    }
}

export default UserService