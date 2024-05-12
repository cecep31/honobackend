import { sign, verify } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { compare } from 'bcryptjs'
import { db } from "../../database/drizzel";
import { users } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';


class AuthService {

    async signIn(email: string, password: string) {
        const user = await db.query.users.findFirst({ where: eq(users.email, email) })
        
        if (!user) {
            throw new HTTPException(401, { message: "Invalid credentials" });
        }
        
        const compared = await compare(password, user.password ?? "");
        // const compared = await Bun.password.verify(password,user.password ?? "", "bcrypt");

        if (!compared) {
            throw new HTTPException(401, { message: "Invalid credentials" });
        }

        const payload = {
            id: user.id,
            email: user.email,
            isSuperAdmin: user.issuperadmin,
            exp: Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60,
        };

        const token = await sign(payload, process.env.JWT_KEY!);


        return { access_token: token };
    }

    async refreshToken(refreshToken: string) {
        try {
            const payload = await verify(refreshToken, process.env.JWT_KEY ?? "");
            const user = await db.query.users.findFirst({ where: eq(users.id, payload.id) });
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