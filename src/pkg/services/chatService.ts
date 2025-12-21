import { db } from "../../database/drizzle";
import { chatConversations, chatMessages } from "../../database/schemas/postgre/schema";
import type { CreateConversationBody, CreateMessageBody } from "../../types/chat";
import { errorHttp } from "../../utils/error";
import type { GetPaginationParams } from "../../types/paginate";
import { getPaginationMetadata } from "../../utils/paginate";
import { eq, and, desc, count } from "drizzle-orm";
import getConfig from "../../config";

interface OpenRouterResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class ChatService {
  private async callOpenRouter(messages: { role: string; content: string }[], model: string = "anthropic/claude-3-haiku"): Promise<OpenRouterResponse> {
    const config = getConfig;
    const response = await fetch(`${config.openrouter.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.openrouter.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json() as OpenRouterResponse;
    return data;
  }

  private async *callOpenRouterStream(messages: { role: string; content: string }[], model: string = "anthropic/claude-3-haiku") {
    const config = getConfig;
    const response = await fetch(`${config.openrouter.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.openrouter.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              return usage;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.usage) {
                usage = parsed.usage;
              }
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                yield delta;
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    return usage;
  }

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

    const messages = [message];

    // If the message is from user, generate AI response
    if (body.role === "user") {
      // Get previous messages for context
      const previousMessages = await db.select()
        .from(chatMessages)
        .where(eq(chatMessages.conversation_id, body.conversation_id))
        .orderBy(chatMessages.created_at);

      const contextMessages = previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      try {
        const aiResponse = await this.callOpenRouter(contextMessages, body.model || "anthropic/claude-3-haiku");

        const aiMessage = aiResponse.choices[0].message;
        const usage = aiResponse.usage;

        const [aiMsg] = await db.insert(chatMessages).values({
          id: crypto.randomUUID(),
          conversation_id: body.conversation_id,
          user_id: userId,
          content: aiMessage.content,
          role: aiMessage.role,
          model: body.model || "anthropic/claude-3-haiku",
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

  async createStreamingMessage(userId: string, body: CreateMessageBody) {
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

    // Save user message first
    const [userMessage] = await db.insert(chatMessages).values({
      id: crypto.randomUUID(),
      conversation_id: body.conversation_id,
      user_id: userId,
      content: body.content,
      role: body.role,
      model: body.model,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).returning();

    // If the message is from user, prepare for streaming AI response
    if (body.role === "user") {
      // Get previous messages for context
      const previousMessages = await db.select()
        .from(chatMessages)
        .where(eq(chatMessages.conversation_id, body.conversation_id))
        .orderBy(chatMessages.created_at);

      const contextMessages = previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      return {
        userMessage,
        streamGenerator: this.callOpenRouterStream(contextMessages, body.model || "anthropic/claude-3-haiku"),
        conversationId: body.conversation_id,
        userId,
        model: body.model || "anthropic/claude-3-haiku",
      };
    }

    return { userMessage, streamGenerator: null };
  }

  async saveStreamingMessage(conversationId: string, userId: string, content: string, model: string, usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) {
    const [aiMsg] = await db.insert(chatMessages).values({
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