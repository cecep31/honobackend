import { and, asc, count, desc, eq, ilike, isNull } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { chat_conversations, chat_messages } from '../../../database/schemas/postgres/schema';
import type { GetPaginationParams } from '../../../types/paginate';
import { Errors } from '../../../utils/error';
import { getPaginationMetadata } from '../../../utils/paginate';
import type {
  CreateConversationBody,
  CreateMessageBody,
  UpdateConversationBody,
} from '../validation';
import type { OpenRouterService } from './openrouterService';

export class ChatService {
  constructor(private openrouterService: OpenRouterService) {}

  private buildConversationTitle(title?: string, fallbackContent?: string) {
    if (title?.trim()) {
      return title.trim();
    }

    if (fallbackContent?.trim()) {
      return fallbackContent.trim().replace(/\s+/g, ' ').slice(0, 50);
    }

    return 'New conversation';
  }

  private async getOwnedConversation(conversationId: string, userId: string) {
    return await db
      .select()
      .from(chat_conversations)
      .where(
        and(
          eq(chat_conversations.id, conversationId),
          eq(chat_conversations.user_id, userId),
          isNull(chat_conversations.deleted_at)
        )
      )
      .limit(1)
      .then((rows) => rows[0] || null);
  }

  private async touchConversation(conversationId: string, updatedAt?: string) {
    await db
      .update(chat_conversations)
      .set({ updated_at: updatedAt ?? new Date().toISOString() })
      .where(eq(chat_conversations.id, conversationId));
  }

  private buildConversationOrder(orderBy?: string, orderDirection: 'asc' | 'desc' = 'desc') {
    const direction = orderDirection === 'asc' ? asc : desc;
    const selectedOrder =
      orderBy === 'title' ? direction(chat_conversations.title) : direction(chat_conversations.updated_at);

    return [
      desc(chat_conversations.is_pinned),
      desc(chat_conversations.pinned_at),
      selectedOrder,
      desc(chat_conversations.created_at),
    ];
  }

  async createConversation(userId: string, body: CreateConversationBody) {
    const now = new Date().toISOString();
    const [conversation] = await db
      .insert(chat_conversations)
      .values({
        id: crypto.randomUUID(),
        title: this.buildConversationTitle(body.title),
        user_id: userId,
        created_at: now,
        updated_at: now,
      })
      .returning();

    return conversation;
  }

  async createConversationStream(
    userId: string,
    body: { title?: string; content: string; model?: string; temperature?: number },
    signal?: AbortSignal
  ) {
    const now = new Date().toISOString();
    const [conversation] = await db
      .insert(chat_conversations)
      .values({
        id: crypto.randomUUID(),
        title: this.buildConversationTitle(body.title, body.content),
        user_id: userId,
        created_at: now,
        updated_at: now,
      })
      .returning();

    const [userMessage] = await db
      .insert(chat_messages)
      .values({
        id: crypto.randomUUID(),
        conversation_id: conversation.id,
        user_id: userId,
        content: body.content,
        role: 'user',
        model: body.model,
        created_at: now,
        updated_at: now,
      })
      .returning();

    return {
      user_message: userMessage,
      stream_generator: this.openrouterService.generateStream(
        [{ role: 'user', content: body.content }],
        body.model,
        body.temperature,
        signal
      ),
      conversation_id: conversation.id,
      user_id: userId,
      model: body.model || '',
    };
  }

  async getConversations(userId: string, params: GetPaginationParams = { offset: 0, limit: 10 }) {
    const search = params.search?.trim();
    const whereClause = and(
      eq(chat_conversations.user_id, userId),
      isNull(chat_conversations.deleted_at),
      search ? ilike(chat_conversations.title, `%${search}%`) : undefined
    );

    const [conversations, totalRows] = await Promise.all([
      db
        .select()
        .from(chat_conversations)
        .where(whereClause)
        .orderBy(...this.buildConversationOrder(params.orderBy, params.orderDirection))
        .offset(params.offset)
        .limit(params.limit),
      db.select({ count: count() }).from(chat_conversations).where(whereClause),
    ]);

    const meta = getPaginationMetadata(totalRows[0]?.count ?? 0, params.offset, params.limit);
    return { data: conversations, meta };
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await db.query.chat_conversations.findFirst({
      where: (table, { eq, and, isNull }) =>
        and(eq(table.id, conversationId), eq(table.user_id, userId), isNull(table.deleted_at)),
      with: {
        chatMessages: {
          orderBy: (chatMessages, { asc }) => [asc(chatMessages.created_at)],
        },
      },
    });

    if (!conversation) {
      throw Errors.NotFound('Conversation');
    }

    return conversation;
  }

  async updateConversation(conversationId: string, userId: string, body: UpdateConversationBody) {
    const conversation = await this.getOwnedConversation(conversationId, userId);

    if (!conversation) {
      throw Errors.NotFound('Conversation');
    }

    const now = new Date().toISOString();
    const [updatedConversation] = await db
      .update(chat_conversations)
      .set({
        ...(body.title !== undefined ? { title: this.buildConversationTitle(body.title) } : {}),
        ...(body.is_pinned !== undefined
          ? {
              is_pinned: body.is_pinned,
              pinned_at: body.is_pinned ? now : null,
            }
          : {}),
        updated_at: now,
      })
      .where(and(eq(chat_conversations.id, conversationId), eq(chat_conversations.user_id, userId)))
      .returning();

    return updatedConversation;
  }

  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await this.getOwnedConversation(conversationId, userId);

    if (!conversation) {
      throw Errors.NotFound('Conversation');
    }

    return await db
      .delete(chat_conversations)
      .where(and(eq(chat_conversations.id, conversationId), eq(chat_conversations.user_id, userId)))
      .returning();
  }

  async createMessage(userId: string, body: CreateMessageBody) {
    const conversation = await this.getOwnedConversation(body.conversation_id, userId);

    if (!conversation) {
      throw Errors.NotFound('Conversation');
    }

    const now = new Date().toISOString();
    const [message] = await db
      .insert(chat_messages)
      .values({
        id: crypto.randomUUID(),
        conversation_id: body.conversation_id,
        user_id: userId,
        content: body.content,
        role: body.role || 'user',
        model: body.model,
        created_at: now,
        updated_at: now,
      })
      .returning();

    await this.touchConversation(body.conversation_id, now);

    const messages = [message];

    if ((body.role || 'user') === 'user') {
      const previousMessages = await db
        .select()
        .from(chat_messages)
        .where(eq(chat_messages.conversation_id, body.conversation_id))
        .orderBy(chat_messages.created_at);

      const contextMessages = previousMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      if (conversation.title === 'New conversation' && previousMessages.length === 1) {
        await db
          .update(chat_conversations)
          .set({
            title: this.buildConversationTitle(undefined, body.content),
            updated_at: now,
          })
          .where(eq(chat_conversations.id, body.conversation_id));
      }

      try {
        const aiResponse = await this.openrouterService.generateResponse(
          contextMessages,
          body.model,
          body.temperature
        );

        const aiMessage = aiResponse.choices[0].message;
        const usage = aiResponse.usage;
        const aiCreatedAt = new Date().toISOString();

        const [aiMsg] = await db
          .insert(chat_messages)
          .values({
            id: crypto.randomUUID(),
            conversation_id: body.conversation_id,
            user_id: userId,
            content: aiMessage.content,
            role: aiMessage.role,
            model: body.model || '',
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
            created_at: aiCreatedAt,
            updated_at: aiCreatedAt,
          })
          .returning();

        await this.touchConversation(body.conversation_id, aiCreatedAt);
        messages.push(aiMsg);
      } catch (error) {
        console.error('Failed to generate AI response:', error);
      }
    }

    return messages;
  }

  async createStreamingMessage(userId: string, body: CreateMessageBody, signal?: AbortSignal) {
    const conversation = await this.getOwnedConversation(body.conversation_id, userId);

    if (!conversation) {
      throw Errors.NotFound('Conversation');
    }

    const now = new Date().toISOString();
    const [userMessage] = await db
      .insert(chat_messages)
      .values({
        id: crypto.randomUUID(),
        conversation_id: body.conversation_id,
        user_id: userId,
        content: body.content,
        role: body.role || 'user',
        model: body.model,
        created_at: now,
        updated_at: now,
      })
      .returning();

    await this.touchConversation(body.conversation_id, now);

    if ((body.role || 'user') === 'user') {
      const previousMessages = await db
        .select()
        .from(chat_messages)
        .where(eq(chat_messages.conversation_id, body.conversation_id))
        .orderBy(chat_messages.created_at);

      const contextMessages = previousMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      if (conversation.title === 'New conversation' && previousMessages.length === 1) {
        await db
          .update(chat_conversations)
          .set({
            title: this.buildConversationTitle(undefined, body.content),
            updated_at: now,
          })
          .where(eq(chat_conversations.id, body.conversation_id));
      }

      return {
        user_message: userMessage,
        stream_generator: this.openrouterService.generateStream(
          contextMessages,
          body.model,
          body.temperature,
          signal
        ),
        conversation_id: body.conversation_id,
        user_id: userId,
        model: body.model || '',
      };
    }

    return { user_message: userMessage, stream_generator: null };
  }

  async saveStreamingMessage(
    conversationId: string,
    userId: string,
    content: string,
    model: string,
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  ) {
    const now = new Date().toISOString();
    const [aiMsg] = await db
      .insert(chat_messages)
      .values({
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        user_id: userId,
        content,
        role: 'assistant',
        model,
        prompt_tokens: usage?.prompt_tokens,
        completion_tokens: usage?.completion_tokens,
        total_tokens: usage?.total_tokens,
        created_at: now,
        updated_at: now,
      })
      .returning();

    await this.touchConversation(conversationId, now);
    return aiMsg;
  }

  async getMessages(conversationId: string, userId: string) {
    const conversation = await this.getOwnedConversation(conversationId, userId);

    if (!conversation) {
      throw Errors.NotFound('Conversation');
    }

    return await db
      .select()
      .from(chat_messages)
      .where(
        and(eq(chat_messages.conversation_id, conversationId), eq(chat_messages.user_id, userId))
      )
      .orderBy(desc(chat_messages.created_at));
  }

  async getMessage(messageId: string, userId: string) {
    const message = await db
      .select()
      .from(chat_messages)
      .where(and(eq(chat_messages.id, messageId), eq(chat_messages.user_id, userId)))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!message) {
      throw Errors.NotFound('Message');
    }

    return message;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await db
      .select()
      .from(chat_messages)
      .where(and(eq(chat_messages.id, messageId), eq(chat_messages.user_id, userId)))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!message) {
      throw Errors.NotFound('Message');
    }

    return await db
      .delete(chat_messages)
      .where(and(eq(chat_messages.id, messageId), eq(chat_messages.user_id, userId)))
      .returning();
  }
}
