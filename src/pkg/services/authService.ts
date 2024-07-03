import { sign, verify } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { users } from '../../database/schema/schema';
import { eq } from 'drizzle-orm';
import { db } from '../../database/drizzel'


export class AuthService {
    static async signIn(email: string, password: string) {
        const user = await db.query.users.findFirst({ where: eq(users.email, email) })

        if (!user) {
            console.log("user not found" + email);
            throw new HTTPException(401, { message: "Invalid credentials" });
        }

        const compared = await Bun.password.verify(password, user.password || "", 'bcrypt');

        if (!compared) {
            console.log("password not match");
            throw new HTTPException(401, { message: "Invalid credentials" });
        }

        const payload = {
            id: user.id,
            email: user.email,
            isSuperAdmin: user.issuperadmin,
            exp: Math.floor(Date.now() / 1000) + 5 * 60 * 60,

        };

        const token = await sign(payload, process.env.JWT_KEY!);

        return { access_token: token };
    }

    static async refreshToken(refreshToken: string) {
        try {
            const payload = await verify(refreshToken, process.env.JWT_KEY ?? "");
            const user = await db.query.users.findFirst({ where: eq(users.id, `${payload.id}`) });
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

    static async updatePassword(old_password: string, new_password: string, user_id: string) {
        const userresult = await db.query.users.findFirst({ where: eq(users.id, user_id) })
        const comparepass = await Bun.password.verify(old_password, userresult?.password ?? "", 'bcrypt');
        if (!comparepass) {
            throw new HTTPException(401, { message: "Invalid credentials" });
        }
        const hash = Bun.password.hashSync(new_password, { algorithm: 'bcrypt' })
        return db.update(users).set({ password: hash }).where(eq(users.id, user_id)).returning({ id: users.id })
    }
}