export interface CreateConversationBody {
  title: string;
}

export interface CreateMessageBody {
  conversation_id: string;
  content: string;
  role?: string;
  model?: string;
  temperature?: number;
}