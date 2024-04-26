import { Hono } from "hono"

export class UserController {
    private user: Hono;

    constructor() {
        this.user = new Hono()
        this.user.get("/", this.getUser)
    }

    newRouter() {
        return this.user
    }

    getUser(c: any) {
        return c.json([
            { name: "John Doe" },
            { name: "Jane Doe 2" },
        ])
    }
}
