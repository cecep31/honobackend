import { PrismaClient } from "@prisma/client";
import { sign } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { compare } from 'bcryptjs'

class AuthService {
    constructor(private database: PrismaClient) { }

    async signIn(email: string, password: string) {
        const user = await this.database.users.findUnique({ where: { email: email } })
        if (!user) {
            throw new HTTPException(401, { message: "email or password not match" })
        }
        const compared = await compare(password, user.password ?? "")

        if (!compared) {
            throw new HTTPException(401, { message: "email or password not match" })
        }
        const payload = {
            id: user.id,
            email: user.email,
            isSuperAdmin: user.issuperadmin,
            exp: Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60
        }
        const secret = process.env.JWT_KEY
        console.log(secret);

        const token = await sign(payload, secret ?? "")
        return token;
    }
}

export default AuthService