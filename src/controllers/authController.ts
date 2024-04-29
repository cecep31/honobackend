import { Hono } from "hono";
import { Database } from "../config/database";
import AuthService from "../pkg/services/authService";
import { z } from "zod";
import { validator } from 'hono/validator'
import { zValidator } from '@hono/zod-validator'

const auth = new Hono();

const database = new Database();
const authService = new AuthService(database);

auth.post("/login", zValidator(
    'json',
    z.object({
        email: z.string().email(),
        password: z.string()
    })
), async (c) => {

    const body = await c.req.json();
    console.log(body);

    const { email, password } = body;
    const token = await authService.signIn(email, password);
    return c.json({access_toke: token});
})

export default auth;