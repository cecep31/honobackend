import { Hono } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import getConfig from '../../../config';
import { auth } from '../../../middlewares/auth';
import { validateRequest } from '../../../middlewares/validateRequest';
import type { AppServices } from '../../../services';
import type { Variables } from '../../../types/context';
import { Errors } from '../../../utils/error';
import { sendSuccess } from '../../../utils/response';
import {
  conversationIdSchema,
  conversationParamSchema,
  createConversationSchema,
  createConversationStreamSchema,
  createMessageSchema,
  listConversationsQuerySchema,
} from '../validation';

type ChatService = AppServices['chatService'];

const chatAiRateLimiter = rateLimiter<{ Variables: Variables }>({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-6',
  keyGenerator: (c) => c.var.user?.user_id || 'unknown',
  handler: () => {
    throw Errors.TooManyRequests(3600);
  },
});

export const createChatController = (chatService: ChatService) =>
  new Hono<{ Variables: Variables }>()
    .post('/conversations', auth, validateRequest('json', createConversationSchema), async (c) => {
      const authUser = c.get('user');
      const body = c.req.valid('json');
      const conversation = await chatService.createConversation(authUser.user_id, body);
      return sendSuccess(c, conversation, 'Conversation created successfully', 201);
    })
    .post(
      '/conversations/stream',
      auth,
      chatAiRateLimiter,
      validateRequest('json', createConversationStreamSchema),
      async (c) => {
        const authUser = c.get('user');
        const body = c.req.valid('json');
        const abortController = new AbortController();

        const { user_message, stream_generator, conversation_id, user_id, model } =
          await chatService.createConversationStream(
            authUser.user_id,
            body,
            abortController.signal
          );

        const config = getConfig;
        const actualModel = model || config.openrouter.defaultModel;

        if (!stream_generator) {
          return sendSuccess(c, [user_message], 'Message created successfully', 201);
        }

        let fullContent = '';
        const stream = new ReadableStream({
          async start(controller) {
            try {
              controller.enqueue(
                `data: ${JSON.stringify({
                  type: 'conversation_created',
                  data: { conversation_id, user_message },
                })}\n\n`
              );

              let usage: {
                prompt_tokens: number;
                completion_tokens: number;
                total_tokens: number;
              } | null = null;

              for await (const chunk of stream_generator) {
                if (typeof chunk === 'string') {
                  fullContent += chunk;
                  controller.enqueue(
                    `data: ${JSON.stringify({ type: 'ai_chunk', data: chunk })}\n\n`
                  );
                } else {
                  usage = chunk;
                }
              }

              const aiMessage = await chatService.saveStreamingMessage(
                conversation_id,
                user_id,
                fullContent,
                actualModel,
                usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
              );

              controller.enqueue(
                `data: ${JSON.stringify({ type: 'ai_complete', data: aiMessage })}\n\n`
              );
              controller.enqueue('data: [DONE]\n\n');
              controller.close();
            } catch (error) {
              if ((error as Error).name === 'AbortError') {
                try {
                  controller.close();
                } catch {}
                return;
              }
              console.error('Streaming error:', error);
              try {
                controller.enqueue(
                  `data: ${JSON.stringify({ type: 'error', data: 'Failed to generate AI response' })}\n\n`
                );
                controller.close();
              } catch {}
            }
          },
          cancel() {
            abortController.abort();
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      }
    )
    .get(
      '/conversations',
      auth,
      validateRequest('query', listConversationsQuerySchema),
      async (c) => {
        const authUser = c.get('user');
        const q = c.req.valid('query');
        const params = {
          offset: q.offset,
          limit: q.limit,
          search: q.search ?? q.q,
          orderBy: q.orderBy,
          orderDirection: q.orderDirection,
        };
        const { data: conversations, meta } = await chatService.getConversations(
          authUser.user_id,
          params
        );
        return sendSuccess(c, conversations, 'Conversations fetched successfully', 200, meta);
      }
    )
    .get('/conversations/:id', auth, validateRequest('param', conversationIdSchema), async (c) => {
      const authUser = c.get('user');
      const params = c.req.valid('param');
      const conversation = await chatService.getConversation(params.id, authUser.user_id);
      return sendSuccess(c, conversation, 'Conversation fetched successfully');
    })
    .delete(
      '/conversations/:id',
      auth,
      validateRequest('param', conversationIdSchema),
      async (c) => {
        const authUser = c.get('user');
        const params = c.req.valid('param');
        const conversation = await chatService.deleteConversation(params.id, authUser.user_id);
        return sendSuccess(c, conversation, 'Conversation deleted successfully');
      }
    )
    .post(
      '/conversations/:conversationId/messages',
      auth,
      chatAiRateLimiter,
      validateRequest('param', conversationParamSchema),
      validateRequest('json', createMessageSchema),
      async (c) => {
        const authUser = c.get('user');
        const params = c.req.valid('param');
        const body = c.req.valid('json');
        const messages = await chatService.createMessage(authUser.user_id, {
          ...body,
          role: body.role || 'user',
          conversation_id: params.conversationId,
        });
        return sendSuccess(c, messages, 'Messages created successfully', 201);
      }
    )
    .post(
      '/conversations/:conversationId/messages/stream',
      auth,
      chatAiRateLimiter,
      validateRequest('param', conversationParamSchema),
      validateRequest('json', createMessageSchema),
      async (c) => {
        const authUser = c.get('user');
        const params = c.req.valid('param');
        const body = c.req.valid('json');
        const abortController = new AbortController();

        const { user_message, stream_generator, conversation_id, user_id, model } =
          await chatService.createStreamingMessage(
            authUser.user_id,
            {
              ...body,
              role: body.role || 'user',
              conversation_id: params.conversationId,
            },
            abortController.signal
          );

        const config = getConfig;
        const actualModel = model || config.openrouter.defaultModel;

        if (!stream_generator) {
          return sendSuccess(c, [user_message], 'Message created successfully', 201);
        }

        let fullContent = '';
        const stream = new ReadableStream({
          async start(controller) {
            try {
              controller.enqueue(
                `data: ${JSON.stringify({
                  type: 'user_message',
                  data: user_message,
                })}\n\n`
              );

              let usage: {
                prompt_tokens: number;
                completion_tokens: number;
                total_tokens: number;
              } | null = null;

              for await (const chunk of stream_generator) {
                if (typeof chunk === 'string') {
                  fullContent += chunk;
                  controller.enqueue(
                    `data: ${JSON.stringify({ type: 'ai_chunk', data: chunk })}\n\n`
                  );
                } else {
                  usage = chunk;
                }
              }

              const aiMessage = await chatService.saveStreamingMessage(
                conversation_id,
                user_id,
                fullContent,
                actualModel,
                usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
              );

              controller.enqueue(
                `data: ${JSON.stringify({ type: 'ai_complete', data: aiMessage })}\n\n`
              );
              controller.enqueue('data: [DONE]\n\n');
              controller.close();
            } catch (error) {
              if ((error as Error).name === 'AbortError') {
                try {
                  controller.close();
                } catch {}
                return;
              }
              console.error('Streaming error:', error);
              try {
                controller.enqueue(
                  `data: ${JSON.stringify({ type: 'error', data: 'Failed to generate AI response' })}\n\n`
                );
                controller.close();
              } catch {}
            }
          },
          cancel() {
            abortController.abort();
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      }
    )
    .get(
      '/conversations/:conversationId/messages',
      auth,
      validateRequest('param', conversationParamSchema),
      async (c) => {
        const authUser = c.get('user');
        const params = c.req.valid('param');
        const messages = await chatService.getMessages(params.conversationId, authUser.user_id);
        return sendSuccess(c, messages, 'Messages fetched successfully');
      }
    )
    .get('/messages/:id', auth, validateRequest('param', conversationIdSchema), async (c) => {
      const authUser = c.get('user');
      const params = c.req.valid('param');
      const message = await chatService.getMessage(params.id, authUser.user_id);
      return sendSuccess(c, message, 'Message fetched successfully');
    })
    .delete('/messages/:id', auth, validateRequest('param', conversationIdSchema), async (c) => {
      const authUser = c.get('user');
      const params = c.req.valid('param');
      const message = await chatService.deleteMessage(params.id, authUser.user_id);
      return sendSuccess(c, message, 'Message deleted successfully');
    });
