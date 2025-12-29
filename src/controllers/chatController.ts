import { Hono } from "hono";
import { chatService } from "../pkg/service";
import { auth } from "../middlewares/auth";
import { validateRequest } from "../middlewares/validateRequest";
import type { Variables } from "../types/context";
import { getPaginationParams } from "../utils/paginate";
import { sendSuccess } from "../utils/response";
import getConfig from "../config";
import {
  conversationIdSchema,
  conversationParamSchema,
  createConversationSchema,
  createConversationStreamSchema,
  createMessageSchema,
} from "../validations/chat";

export const chatController = new Hono<{ Variables: Variables }>()
  // Conversation endpoints
  .post(
    "/conversations",
    auth,
    validateRequest("json", createConversationSchema),
    async (c) => {
      const authUser = c.get("user");
      const body = c.req.valid("json");

      const conversation = await chatService.createConversation(
        authUser.user_id,
        body
      );
      return sendSuccess(c, conversation, "Conversation created successfully", 201);
    }
  )
  .post(
    "/conversations/stream",
    auth,
    validateRequest("json", createConversationStreamSchema),
    async (c) => {
      const authUser = c.get("user");
      const body = c.req.valid("json");

      const abortController = new AbortController();

      const { user_message, stream_generator, conversation_id, user_id, model } =
        await chatService.createConversationStream(authUser.user_id, body, abortController.signal);

      // Get the actual model that will be used
      const config = getConfig;
      const actualModel = model || config.openrouter.defaultModel;

      if (!stream_generator) {
        return sendSuccess(c, [user_message], "Message created successfully", 201);
      }

      let fullContent = "";

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send user message and conversation info first
            controller.enqueue(
              `data: ${JSON.stringify({
                type: "conversation_created",
                data: {
                  conversation_id,
                  user_message,
                },
              })}\n\n`
            );

            // Stream AI response
            let usage: {
              prompt_tokens: number;
              completion_tokens: number;
              total_tokens: number;
            } | null = null;
            for await (const chunk of stream_generator) {
              if (typeof chunk === "string") {
                fullContent += chunk;
                controller.enqueue(
                  `data: ${JSON.stringify({
                    type: "ai_chunk",
                    data: chunk,
                  })}\n\n`
                );
              } else {
                usage = chunk;
              }
            }

            // Save the complete AI message
            const aiMessage = await chatService.saveStreamingMessage(
              conversation_id,
              user_id,
              fullContent,
              actualModel,
              usage || {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
              }
            );

            // Send completion signal with the saved message
            controller.enqueue(
              `data: ${JSON.stringify({
                type: "ai_complete",
                data: aiMessage,
              })}\n\n`
            );
            controller.enqueue("data: [DONE]\n\n");
            controller.close();
          } catch (error) {
            if ((error as Error).name === 'AbortError') {
              console.log('Stream aborted by client');
              return;
            }
            console.error("Streaming error:", error);
            controller.enqueue(
              `data: ${JSON.stringify({
                type: "error",
                data: "Failed to generate AI response",
              })}\n\n`
            );
            controller.close();
          }
        },
        cancel() {
          console.log('Client disconnected, cancelling AI stream');
          abortController.abort();
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }
  )
  .get("/conversations", auth, async (c) => {
    const authUser = c.get("user");
    const params = getPaginationParams(c);
    const { data: conversations, meta } = await chatService.getConversations(
      authUser.user_id,
      params
    );

    return sendSuccess(c, conversations, "Conversations fetched successfully", 200, meta);
  })
  .get(
    "/conversations/:id",
    auth,
    validateRequest("param", conversationIdSchema),
    async (c) => {
      const authUser = c.get("user");
      const params = c.req.valid("param");

      const conversation = await chatService.getConversation(
        params.id,
        authUser.user_id
      );
      return sendSuccess(c, conversation, "Conversation fetched successfully");
    }
  )
  .delete(
    "/conversations/:id",
    auth,
    validateRequest("param", conversationIdSchema),
    async (c) => {
      const authUser = c.get("user");
      const params = c.req.valid("param");

      const conversation = await chatService.deleteConversation(
        params.id,
        authUser.user_id
      );
      return sendSuccess(c, conversation, "Conversation deleted successfully");
    }
  )

  // Message endpoints
  .post(
    "/conversations/:conversationId/messages",
    auth,
    validateRequest("param", conversationParamSchema),
    validateRequest("json", createMessageSchema),
    async (c) => {
      const authUser = c.get("user");
      const params = c.req.valid("param");
      const body = c.req.valid("json");

      const messages = await chatService.createMessage(authUser.user_id, {
        ...body,
        role: body.role || "user", // Use provided role or default to "user"
        conversation_id: params.conversationId,
      });
      return sendSuccess(c, messages, "Messages created successfully", 201);
    }
  )
  .post(
    "/conversations/:conversationId/messages/stream",
    auth,
    validateRequest("param", conversationParamSchema),
    validateRequest("json", createMessageSchema),
    async (c) => {
      const authUser = c.get("user");
      const params = c.req.valid("param");
      const body = c.req.valid("json");

      const abortController = new AbortController();

      const { user_message, stream_generator, conversation_id, user_id, model } =
        await chatService.createStreamingMessage(authUser.user_id, {
          ...body,
          role: body.role || "user", // Use provided role or default to "user"
          conversation_id: params.conversationId,
        }, abortController.signal);

      // Get the actual model that will be used
      const config = getConfig;
      const actualModel = model || config.openrouter.defaultModel;

      if (!stream_generator) {
        return sendSuccess(c, [user_message], "Message created successfully", 201);
      }

      let fullContent = "";

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send user message first
            controller.enqueue(
              `data: ${JSON.stringify({
                type: "user_message",
                data: user_message,
              })}\n\n`
            );

            // Stream AI response
            let usage: {
              prompt_tokens: number;
              completion_tokens: number;
              total_tokens: number;
            } | null = null;
            for await (const chunk of stream_generator) {
              if (typeof chunk === "string") {
                fullContent += chunk;
                controller.enqueue(
                  `data: ${JSON.stringify({
                    type: "ai_chunk",
                    data: chunk,
                  })}\n\n`
                );
              } else {
                usage = chunk;
              }
            }

            // Save the complete AI message
            const aiMessage = await chatService.saveStreamingMessage(
              conversation_id,
              user_id,
              fullContent,
              actualModel,
              usage || {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
              }
            );

            // Send completion signal with the saved message
            controller.enqueue(
              `data: ${JSON.stringify({
                type: "ai_complete",
                data: aiMessage,
              })}\n\n`
            );
            controller.enqueue("data: [DONE]\n\n");
            controller.close();
          } catch (error) {
            if ((error as Error).name === 'AbortError') {
              console.log('Stream aborted by client');
              return;
            }
            console.error("Streaming error:", error);
            controller.enqueue(
              `data: ${JSON.stringify({
                type: "error",
                data: "Failed to generate AI response",
              })}\n\n`
            );
            controller.close();
          }
        },
        cancel() {
          console.log('Client disconnected, cancelling AI stream');
          abortController.abort();
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }
  )
  .get(
    "/conversations/:conversationId/messages",
    auth,
    validateRequest("param", conversationParamSchema),
    async (c) => {
      const authUser = c.get("user");
      const params = c.req.valid("param");

      const messages = await chatService.getMessages(
        params.conversationId,
        authUser.user_id
      );
      return sendSuccess(c, messages, "Messages fetched successfully");
    }
  )
  .get(
    "/messages/:id",
    auth,
    validateRequest("param", conversationIdSchema),
    async (c) => {
      const authUser = c.get("user");
      const params = c.req.valid("param");

      const message = await chatService.getMessage(params.id, authUser.user_id);
      return sendSuccess(c, message, "Message fetched successfully");
    }
  )
  .delete(
    "/messages/:id",
    auth,
    validateRequest("param", conversationIdSchema),
    async (c) => {
      const authUser = c.get("user");
      const params = c.req.valid("param");

      const message = await chatService.deleteMessage(
        params.id,
        authUser.user_id
      );
      return sendSuccess(c, message, "Message deleted successfully");
    }
  );
