import { Database } from "../../config/database";

class UserService {
    constructor(private database: Database) { }

    getUsers() {
        return this.database.client.users.findMany();
    }
}

export default UserService