import { PrismaClient } from "@prisma/client";
import { sign, verify } from 'hono/jwt'
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

        const token = await sign(payload, secret ?? "")
        return { access_token: token };
    }

    async refreshToken(refreshToken: string) {
        try {
            const payload = await verify(refreshToken, process.env.JWT_KEY ?? "");
            const user = await this.database.users.findUnique({ where: { id: payload.id } });
            if (!user) {
                throw new HTTPException(401, { message: "User not found" });
            }
            const newPayload = {
                id: user.id,
                email: user.email,
                isSuperAdmin: user.issuperadmin,
                exp: Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60
            }
            const newToken = await sign(newPayload, process.env.JWT_KEY ?? "");
            return { access_token: newToken };
        } catch (error) {
            throw new HTTPException(401, { message: "Invalid token" });
        }
    }
}

export default AuthService