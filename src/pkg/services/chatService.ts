import { ChatRepository } from "../repository/chatRepository";
import type { CreateConversationBody, CreateMessageBody } from "../../types/chat";
import { errorHttp } from "../../utils/error";

export class ChatService {
  constructor(private chatRepository: ChatRepository) {}

  async createConversation(userId: string, body: CreateConversationBody) {
    return await this.chatRepository.createConversation(userId, body.title);
  }

  async getConversations(userId: string) {
    return await this.chatRepository.getConversations(userId);
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.chatRepository.getConversation(conversationId, userId);
    if (!conversation) {
      throw errorHttp("Conversation not found", 404);
    }
    return conversation;
  }

  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await this.chatRepository.getConversation(conversationId, userId);
    if (!conversation) {
      throw errorHttp("Conversation not found", 404);
    }
    return await this.chatRepository.deleteConversation(conversationId, userId);
  }

  async createMessage(userId: string, body: CreateMessageBody) {
    // Check if conversation exists and belongs to user
    const conversation = await this.chatRepository.getConversation(body.conversation_id, userId);
    if (!conversation) {
      throw errorHttp("Conversation not found or doesn't belong to user", 404);
    }

    return await this.chatRepository.createMessage(
      body.conversation_id,
      userId,
      body.content,
      body.role,
      body.model
    );
  }

  async getMessages(conversationId: string, userId: string) {
    // Check if conversation exists and belongs to user
    const conversation = await this.chatRepository.getConversation(conversationId, userId);
    if (!conversation) {
      throw errorHttp("Conversation not found or doesn't belong to user", 404);
    }

    return await this.chatRepository.getMessages(conversationId, userId);
  }

  async getMessage(messageId: string, userId: string) {
    const message = await this.chatRepository.getMessage(messageId, userId);
    if (!message) {
      throw errorHttp("Message not found or doesn't belong to user", 404);
    }
    return message;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.chatRepository.getMessage(messageId, userId);
    if (!message) {
      throw errorHttp("Message not found or doesn't belong to user", 404);
    }
    return await this.chatRepository.deleteMessage(messageId, userId);
  }
}