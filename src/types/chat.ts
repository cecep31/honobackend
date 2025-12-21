export interface ChatConversation {
  id: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  title: string;
  user_id: string;
}

export interface ChatMessage {
  id: string;
  created_at: string;
  updated_at: string | null;
  conversation_id: string;
  user_id: string;
  role: string;
  content: string;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
}

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