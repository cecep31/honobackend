import { db } from "../../database/drizzle";
import { chat_conversations, chat_messages } from "../../database/schemas/postgre/schema";
import type { CreateConversationBody, CreateMessageBody } from "../../types/chat";
import { Errors } from "../../utils/error";
import type { GetPaginationParams } from "../../types/paginate";
import { getPaginationMetadata } from "../../utils/paginate";
import { eq, and, desc, count } from "drizzle-orm";
import type { OpenRouterService } from "./openrouterService";

export class ChatService {
  constructor(private openrouterService: OpenRouterService) {}

  async createConversation(userId: string, body: CreateConversationBody) {
    const [conversation] = await db.insert(chat_conversations).values({
      id: crypto.randomUUID(),
      title: body.title,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).returning();

    return conversation;
  }

  async createConversationStream(userId: string, body: { title?: string; content: string; model?: string; temperature?: number }, signal?: AbortSignal) {
    // 1. Create conversation
    const [conversation] = await db.insert(chat_conversations).values({
      id: crypto.randomUUID(),
      title: body.title || body.content.slice(0, 50),
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).returning();

    // 2. Save user message
    const [userMessage] = await db.insert(chat_messages).values({
      id: crypto.randomUUID(),
      conversation_id: conversation.id,
      user_id: userId,
      content: body.content,
      role: "user",
      model: body.model,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).returning();

    // 3. Prepare for streaming AI response
    const contextMessages = [{
      role: "user",
      content: body.content,
    }];

    return {
      user_message: userMessage,
      stream_generator: this.openrouterService.generateStream(contextMessages, body.model, body.temperature, signal),
      conversation_id: conversation.id,
      user_id: userId,
      model: body.model || "",
    };
  }

  async getConversations(userId: string, params: GetPaginationParams = { offset: 0, limit: 10 }) {
    const [conversations, total] = await Promise.all([
      db.select()
      .from(chat_conversations)
      .where(eq(chat_conversations.user_id, userId))
        .orderBy(desc(chat_conversations.created_at))
        .offset(params.offset)
        .limit(params.limit),
      db.select({ count: count() })
      .from(chat_conversations)
      .where(eq(chat_conversations.user_id, userId))
        .then(result => result[0]?.count || 0)
    ]);

    const meta = getPaginationMetadata(total, params.offset, params.limit);
    return { data: conversations, meta };
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await db.select()
      .from(chat_conversations)
      .where(and(
        eq(chat_conversations.id, conversationId),
        eq(chat_conversations.user_id, userId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);

    if (!conversation) {
      throw Errors.NotFound("Conversation");
    }
    return conversation;
  }

  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await db.select()
      .from(chat_conversations)
      .where(and(
        eq(chat_conversations.id, conversationId),
        eq(chat_conversations.user_id, userId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);

    if (!conversation) {
      throw Errors.NotFound("Conversation");
    }

    return await db.delete(chat_conversations)
      .where(and(
        eq(chat_conversations.id, conversationId),
        eq(chat_conversations.user_id, userId)
      ))
      .returning();
  }

  async createMessage(userId: string, body: CreateMessageBody) {
    // Check if conversation exists and belongs to user
    const conversation = await db.select()
      .from(chat_conversations)
      .where(and(
        eq(chat_conversations.id, body.conversation_id),
        eq(chat_conversations.user_id, userId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);

    if (!conversation) {
      throw Errors.NotFound("Conversation");
    }

    const [message] = await db.insert(chat_messages).values({
      id: crypto.randomUUID(),
      conversation_id: body.conversation_id,
      user_id: userId,
      content: body.content,
      role: body.role || "user",
      model: body.model,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).returning();

    const messages = [message];

    // If the message is from user, generate AI response
    if (body.role === "user") {
      // Get previous messages for context
      const previousMessages = await db.select()
        .from(chat_messages)
        .where(eq(chat_messages.conversation_id, body.conversation_id))
        .orderBy(chat_messages.created_at);

      const contextMessages = previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      try {
        const aiResponse = await this.openrouterService.generateResponse(contextMessages, body.model, body.temperature);

        const aiMessage = aiResponse.choices[0].message;
        const usage = aiResponse.usage;

        const [aiMsg] = await db.insert(chat_messages).values({
          id: crypto.randomUUID(),
          conversation_id: body.conversation_id,
          user_id: userId,
          content: aiMessage.content,
          role: aiMessage.role,
          model: body.model || "",
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).returning();

        messages.push(aiMsg);
      } catch (error) {
        console.error("Failed to generate AI response:", error);
        // Don't throw, just log and continue
      }
    }

    return messages;
  }

  async createStreamingMessage(userId: string, body: CreateMessageBody, signal?: AbortSignal) {
    // Check if conversation exists and belongs to user
    const conversation = await db.select()
      .from(chat_conversations)
      .where(and(
        eq(chat_conversations.id, body.conversation_id),
        eq(chat_conversations.user_id, userId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);

    if (!conversation) {
      throw Errors.NotFound("Conversation");
    }

    // Save user message first
    const [userMessage] = await db.insert(chat_messages).values({
      id: crypto.randomUUID(),
      conversation_id: body.conversation_id,
      user_id: userId,
      content: body.content,
      role: body.role || "user",
      model: body.model,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).returning();

    // If the message is from user, prepare for streaming AI response
    if (body.role === "user") {
      // Get previous messages for context
      const previousMessages = await db.select()
        .from(chat_messages)
        .where(eq(chat_messages.conversation_id, body.conversation_id))
        .orderBy(chat_messages.created_at);

      const contextMessages = previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      return {
        user_message: userMessage,
        stream_generator: this.openrouterService.generateStream(contextMessages, body.model, body.temperature, signal),
        conversation_id: body.conversation_id,
        user_id: userId,
        model: body.model || "",
      };
    }

    return { user_message: userMessage, stream_generator: null };
  }

  async saveStreamingMessage(conversationId: string, userId: string, content: string, model: string, usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) {
    const [aiMsg] = await db.insert(chat_messages).values({
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      user_id: userId,
      content,
      role: "assistant",
      model,
      prompt_tokens: usage?.prompt_tokens,
      completion_tokens: usage?.completion_tokens,
      total_tokens: usage?.total_tokens,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).returning();

    return aiMsg;
  }

  async getMessages(conversationId: string, userId: string) {
    // Check if conversation exists and belongs to user
    const conversation = await db.select()
      .from(chat_conversations)
      .where(and(
        eq(chat_conversations.id, conversationId),
        eq(chat_conversations.user_id, userId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);

    if (!conversation) {
      throw Errors.NotFound("Conversation");
    }

    return await db.select()
      .from(chat_messages)
      .where(and(
        eq(chat_messages.conversation_id, conversationId),
        eq(chat_messages.user_id, userId)
      ))
      .orderBy(desc(chat_messages.created_at));
  }

  async getMessage(messageId: string, userId: string) {
    const message = await db.select()
      .from(chat_messages)
      .where(and(
        eq(chat_messages.id, messageId),
        eq(chat_messages.user_id, userId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);

    if (!message) {
      throw Errors.NotFound("Message");
    }
    return message;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await db.select()
      .from(chat_messages)
      .where(and(
        eq(chat_messages.id, messageId),
        eq(chat_messages.user_id, userId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);

    if (!message) {
      throw Errors.NotFound("Message");
    }

    return await db.delete(chat_messages)
      .where(and(
        eq(chat_messages.id, messageId),
        eq(chat_messages.user_id, userId)
      ))
      .returning();
  }
}