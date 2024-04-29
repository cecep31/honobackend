import { PrismaClient } from "@prisma/client";

class UserService {
    constructor(private database: PrismaClient) { }

    getUsers() {
        return this.database.users.findMany({ select: {id: true, first_name: true, last_name: true, email: true,issuperadmin: true, password: false, image: true } });
    }
    gerUser(id: string) {
        return this.database.users.findUnique({ where: { id } })
    }
}

export default UserService