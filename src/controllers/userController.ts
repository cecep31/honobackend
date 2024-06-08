import { Hono } from "hono"
import UserService from "../pkg/services/userServices";
import { validate as validateUuid } from 'uuid';
import { auth } from '../middlewares/auth'
import { superAdmin } from "../middlewares/superAdmin";
import { db } from '../database/drizzel'
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

export const userController = new Hono()
    .get("/", auth, async (c) => {
        const userservice = new UserService(db);
        return c.json(await userservice.getUsers());
    })
    .get("/:id", auth, async (c) => {
        const userservice = new UserService(db);
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
    .post("/", auth, superAdmin, zValidator('json',
        z.object({
            first_name: z.string(),
            last_name: z.string(),
            email: z.string(),
            password: z.string(),
        })), async (c) => {
            const userservice = new UserService(db);
            const body = await c.req.json() as PostUser;
            return c.json(await userservice.addUser(body))
        })
    .delete("/:id", auth, superAdmin, async (c) => {
        const userservice = new UserService(db);
        const id = c.req.param('id')
        const user = userservice.deleteUser(id)
        return c.json(user)
    })

