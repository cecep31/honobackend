import { PrismaClient } from "@prisma/client";
import {sign} from 'hono/jwt'
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
            isSuperAdmin: user.issuperadmin,
            exp: Math.floor(Date.now() / 1000) + 60 * 5

        }
        const secret = process.env.JWT_KEY
        const token = await sign(payload, secret ?? "")
        return token;
    }
}

export default AuthService