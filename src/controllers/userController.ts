import { Hono } from "hono"
import { Database } from "../config/database";
import UserService from "../pkg/services/userServices";

export class UserController {
    private user: Hono;

    constructor(private userservice: UserService) {
        // this.database.client.users.findMany().then((users) => {
        //     console.log(users);
        // })
        this.user = new Hono()
    }
    
    newRouter() {
        this.user.get("/", this.getUsers)
        return this.user
    }


    async getUsers(context: any) {
        
        return context.json(this.userservice.getUsers());
    }
}
