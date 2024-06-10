import { Hono } from "hono";
import {AuthService} from "../pkg/services/authService";
import { z } from "zod";
import { zValidator } from '@hono/zod-validator'

export const authController = new Hono()
    .post("/login", zValidator(
        'json',
        z.object({
            email: z.string().email(),
            password: z.string()
        })
    ), async (c) => {
        const body = await c.req.json();
        const { email, password } = body;
        const token = await AuthService.signIn(email, password);
        return c.json(token);
    })

