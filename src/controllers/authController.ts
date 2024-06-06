import { Hono } from "hono";
import AuthService from "../pkg/services/authService";
import { z } from "zod";
import { zValidator } from '@hono/zod-validator'
import { db } from '../database/drizzel'

const authController = new Hono();

authController.post("/login", zValidator(
    'json',
    z.object({
        email: z.string().email(),
        password: z.string()
    })
), async (c) => {
    const authService = new AuthService(db);
    const body = await c.req.json();
    const { email, password } = body;
    const token = await authService.signIn(email, password);
    return c.json(token);
})
export default authController

