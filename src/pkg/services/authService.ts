import { PrismaClient } from "@prisma/client";
import { HTTPException } from 'hono/http-exception'

class AuthService {
    constructor(private database: PrismaClient) { }

    async signIn(email: string, password: string) {
        const user = await this.database.users.findUnique({ where: { email: email } })
        if (!user) {
            throw new HTTPException(401, { message: "email or password not match" })
        }
        const hash = await Bun.password.hash(password);
        console.log(user.password);
        
        const compare = await Bun.password.verify(password, hash ?? "")
        console.log(compare);
        
        if (!compare) {
            throw new HTTPException(401, { message: "email or password not match" })
        }
        const payload = {
            id: user.id,
            email: user.email,
            isSuperAdmin: user.issuperadmin

        }
        return this.database.users.findMany({ select: { id: true, first_name: true, last_name: true, email: true, password: false, image: true } });
    }
}

export default AuthService