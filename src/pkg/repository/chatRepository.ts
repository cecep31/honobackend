import { db } from "../../database/drizzel";
import { chatConversations, chatMessages } from "../../database/schemas/postgre/schema";
import { eq, and, desc, count } from "drizzle-orm";
import type { GetPaginationParams } from "../../types/paginate";

export class ChatRepository {
  async createConversation(userId: string, title: string) {
    const [conversation] = await db.insert(chatConversations).values({
      id: crypto.randomUUID(),
      title,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).returning();

    return conversation;
  }

  async getConversations(userId: string, params: GetPaginationParams = { offset: 0, limit: 10 }) {
    return await db.select()
      .from(chatConversations)
      .where(eq(chatConversations.user_id, userId))
      .orderBy(desc(chatConversations.created_at))
      .offset(params.offset)
      .limit(params.limit);
  }

  async getConversationsCount(userId: string) {
    const result = await db.select({ count: count() })
      .from(chatConversations)
      .where(eq(chatConversations.user_id, userId));

    return result[0]?.count || 0;
  }

  async getConversation(conversationId: string, userId: string) {
    return await db.select()
      .from(chatConversations)
      .where(and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.user_id, userId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);
  }

  async deleteConversation(conversationId: string, userId: string) {
    return await db.delete(chatConversations)
      .where(and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.user_id, userId)
      ))
      .returning();
  }

  async createMessage(conversationId: string, userId: string, content: string, role: string, model?: string) {
    const [message] = await db.insert(chatMessages).values({
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      user_id: userId,
      content,
      role,
      model,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).returning();

    return message;
  }

  async getMessages(conversationId: string, userId: string) {
    return await db.select()
      .from(chatMessages)
      .where(and(
        eq(chatMessages.conversation_id, conversationId),
        eq(chatMessages.user_id, userId)
      ))
      .orderBy(desc(chatMessages.created_at));
  }

  async getMessage(messageId: string, userId: string) {
    return await db.select()
      .from(chatMessages)
      .where(and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.user_id, userId)
      ))
      .limit(1)
      .then(rows => rows[0] || null);
  }

  async deleteMessage(messageId: string, userId: string) {
    return await db.delete(chatMessages)
      .where(and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.user_id, userId)
      ))
      .returning();
  }
}