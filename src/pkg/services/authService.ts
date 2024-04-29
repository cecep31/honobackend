import { Database } from "../../config/database";
import { HTTPException } from 'hono/http-exception'

class AuthService {
    constructor(private database: Database) { }

    async signIn(email: string, password: string) {
        const user = await this.database.client.users.findUnique({ where: { email: email } })
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
        return this.database.client.users.findMany({ select: { id: true, first_name: true, last_name: true, email: true, password: false, image: true } });
    }
}

export default AuthService