import { Hono } from "hono";
import { chatService } from "../pkg/service";
import { auth } from "../middlewares/auth";
import { z } from "zod";
import { validateRequest } from "../middlewares/validateRequest";
import type { Variables } from "../types/context";
import { getPaginationParams } from "../utils/paginate";

export const chatController = new Hono<{ Variables: Variables }>()
  // Conversation endpoints
  .post(
    "/conversations",
    auth,
    validateRequest(
      "json",
      z.object({
        title: z.string().min(1).max(255),
      })
    ),
    async (c) => {
      const authUser = c.get("user");
      const body = c.req.valid("json");

      const conversation = await chatService.createConversation(
        authUser.user_id,
        body
      );
      return c.json(
        {
          data: conversation,
          success: true,
          message: "Conversation created successfully",
          requestId: c.get("requestId") || "N/A",
        },
        201
      );
    }
  )
  .get("/conversations", auth, async (c) => {
    const authUser = c.get("user");
    const params = getPaginationParams(c);
    const { data: conversations, meta } = await chatService.getConversations(
      authUser.user_id,
      params
    );

    return c.json({
      data: conversations,
      meta,
      success: true,
      message: "Conversations fetched successfully",
      requestId: c.get("requestId") || "N/A",
    });
  })
  .get(
    "/conversations/:id",
    auth,
    validateRequest("param", z.object({ id: z.string().uuid() })),
    async (c) => {
      const authUser = c.get("user");
      const params = c.req.valid("param");

      const conversation = await chatService.getConversation(
        params.id,
        authUser.user_id
      );
      return c.json({
        data: conversation,
        success: true,
        message: "Conversation fetched successfully",
        requestId: c.get("requestId") || "N/A",
      });
    }
  )
  .delete(
    "/conversations/:id",
    auth,
    validateRequest("param", z.object({ id: z.string().uuid() })),
    async (c) => {
      const authUser = c.get("user");
      const params = c.req.valid("param");

      const conversation = await chatService.deleteConversation(
        params.id,
        authUser.user_id
      );
      return c.json({
        data: conversation,
        success: true,
        message: "Conversation deleted successfully",
        requestId: c.get("requestId") || "N/A",
      });
    }
  )

  // Message endpoints
  .post(
    "/conversations/:conversationId/messages",
    auth,
    validateRequest("param", z.object({ conversationId: z.string().uuid() })),
    validateRequest(
      "json",
      z.object({
        content: z.string().min(1),
        role: z.string().min(1),
        model: z.string().optional(),
      })
    ),
    async (c) => {
      const authUser = c.get("user");
      const params = c.req.valid("param");
      const body = c.req.valid("json");

      const message = await chatService.createMessage(authUser.user_id, {
        ...body,
        conversation_id: params.conversationId,
      });
      return c.json(
        {
          data: message,
          success: true,
          message: "Message created successfully",
          requestId: c.get("requestId") || "N/A",
        },
        201
      );
    }
  )
  .get(
    "/conversations/:conversationId/messages",
    auth,
    validateRequest("param", z.object({ conversationId: z.string().uuid() })),
    async (c) => {
      const authUser = c.get("user");
      const params = c.req.valid("param");

      const messages = await chatService.getMessages(
        params.conversationId,
        authUser.user_id
      );
      return c.json({
        data: messages,
        success: true,
        message: "Messages fetched successfully",
        requestId: c.get("requestId") || "N/A",
      });
    }
  )
  .get(
    "/messages/:id",
    auth,
    validateRequest("param", z.object({ id: z.string().uuid() })),
    async (c) => {
      const authUser = c.get("user");
      const params = c.req.valid("param");

      const message = await chatService.getMessage(params.id, authUser.user_id);
      return c.json({
        data: message,
        success: true,
        message: "Message fetched successfully",
        requestId: c.get("requestId") || "N/A",
      });
    }
  )
  .delete(
    "/messages/:id",
    auth,
    validateRequest("param", z.object({ id: z.string().uuid() })),
    async (c) => {
      const authUser = c.get("user");
      const params = c.req.valid("param");

      const message = await chatService.deleteMessage(
        params.id,
        authUser.user_id
      );
      return c.json({
        data: message,
        success: true,
        message: "Message deleted successfully",
        requestId: c.get("requestId") || "N/A",
      });
    }
  );
