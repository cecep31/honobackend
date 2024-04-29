import { Hono } from "hono";
import { database } from "../config/database";
import AuthService from "../pkg/services/authService";
import { z } from "zod";
import { zValidator } from '@hono/zod-validator'

const authController = new Hono();
const authService = new AuthService(database);

authController.post("/login", zValidator(
    'json',
    z.object({
        email: z.string().email(),
        password: z.string()
    })
), async (c) => {
    const body = await c.req.json();
    const { email, password } = body;
    const token = await authService.signIn(email, password);
    return c.json({access_toke: token});
})

export default authController;