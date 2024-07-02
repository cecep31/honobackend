import { Hono } from "hono"
import { WritetService } from "../pkg/services/writerService";

export const writerController = new Hono()
    .get("/:username", async (c) => {
        const username = c.req.param("username");
        console.log(username);
        
        const user = await WritetService.getWriterByUsername(username);
        if (!user) {
            return c.text("user not found", 404);
        }
        return c.json(user);
    })

