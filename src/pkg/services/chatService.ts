import { db } from "../../database/drizzle";
import { chatConversations, chatMessages } from "../../database/schemas/postgre/schema";
import type { CreateConversationBody, CreateMessageBody } from "../../types/chat";
import { errorHttp } from "../../utils/error";
import type { GetPaginationParams } from "../../types/paginate";
import { getPaginationMetadata } from "../../utils/paginate";
import { eq, and, desc, count } from "drizzle-orm";

export class ChatService {
  async createConversation(userId: string, body: CreateConversationBody) {
    const [conversation] = await db.insert(chatConversations).values({
      id: crypto.randomUUID(),
      title: body.title,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).returning();

    return conversation;
  }

  async getConversations(userId: string, params: GetPaginationParams = { offset: 0, limit: 10 }) {
    const [conversations, total] = await Promise.all([
      db.select()
        .from(chatConversations)
        .where(eq(chatConversations.user_id, userId))
        .orderBy(desc(chatConversations.created_at))
        .offset(params.offset)
        .limit(params.limit),
      db.select({ count: count() })
        .from(chatConversations)
        .where(eq(chatConversations.user_id, userId))
        .then(result => result[0]?.count || 0)
    ]);

    const meta = getPaginationMetadata(total, params.offset, params.limit);
    return { data: conversations, meta };
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await db.select()
      .from(chatConversations)
      .where(and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.user_id, userId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);

    if (!conversation) {
      throw errorHttp("Conversation not found", 404);
    }
    return conversation;
  }

  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await db.select()
      .from(chatConversations)
      .where(and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.user_id, userId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);

    if (!conversation) {
      throw errorHttp("Conversation not found", 404);
    }

    return await db.delete(chatConversations)
      .where(and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.user_id, userId)
      ))
      .returning();
  }

  async createMessage(userId: string, body: CreateMessageBody) {
    // Check if conversation exists and belongs to user
    const conversation = await db.select()
      .from(chatConversations)
      .where(and(
        eq(chatConversations.id, body.conversation_id),
        eq(chatConversations.user_id, userId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);

    if (!conversation) {
      throw errorHttp("Conversation not found or doesn't belong to user", 404);
    }

    const [message] = await db.insert(chatMessages).values({
      id: crypto.randomUUID(),
      conversation_id: body.conversation_id,
      user_id: userId,
      content: body.content,
      role: body.role,
      model: body.model,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).returning();

    return message;
  }

  async getMessages(conversationId: string, userId: string) {
    // Check if conversation exists and belongs to user
    const conversation = await db.select()
      .from(chatConversations)
      .where(and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.user_id, userId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);

    if (!conversation) {
      throw errorHttp("Conversation not found or doesn't belong to user", 404);
    }

    return await db.select()
      .from(chatMessages)
      .where(and(
        eq(chatMessages.conversation_id, conversationId),
        eq(chatMessages.user_id, userId)
      ))
      .orderBy(desc(chatMessages.created_at));
  }

  async getMessage(messageId: string, userId: string) {
    const message = await db.select()
      .from(chatMessages)
      .where(and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.user_id, userId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);

    if (!message) {
      throw errorHttp("Message not found or doesn't belong to user", 404);
    }
    return message;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await db.select()
      .from(chatMessages)
      .where(and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.user_id, userId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);

    if (!message) {
      throw errorHttp("Message not found or doesn't belong to user", 404);
    }

    return await db.delete(chatMessages)
      .where(and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.user_id, userId)
      ))
      .returning();
  }
}