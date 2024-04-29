import { Hono } from "hono"
import { Database } from "../config/database";
import UserService from "../pkg/services/userServices";
import { validate as validateUuid } from 'uuid';

const user = new Hono();

const database = new Database();
const userservice = new UserService(database);

user.get("/", async (c) => {
    return c.json(await userservice.getUsers());
})

user.get("/:id", async (c) => {
    const id = c.req.param("id");
    //check id is uuid
    if (!validateUuid(id)) {
        return c.text("invalid id", 400);
    }
    const user = await userservice.gerUser(id);
    if (!user) {
        return c.text("user not found", 404);
    }
    return c.json(user);
})

async function getUsers(context: any) {
    return context.json(await userservice.getUsers());
}



export default user
