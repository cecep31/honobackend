# Chat API Documentation

The Chat API provides endpoints for managing conversations and messages, integrating with AI models via OpenRouter.

**Base URL:** `/v1/chat`

## Authentication
All endpoints require a Bearer token in the `Authorization` header.

---

## Conversations

### Create Conversation
Create a new conversation.

- **URL:** `/conversations`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "title": "My New Chat"
  }
  ```
- **Response (201):**
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "title": "My New Chat",
      "user_id": "uuid",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    },
    "message": "Conversation created successfully"
  }
  ```

### List Conversations
Get a paginated list of the user's conversations.

- **URL:** `/conversations`
- **Method:** `GET`
- **Query Params:** `page`, `limit`
- **Response (200):**
  ```json
  {
    "success": true,
    "data": [...],
    "meta": {
      "total": 10,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
  ```

### Get Conversation
Get details of a specific conversation.

- **URL:** `/conversations/:id`
- **Method:** `GET`

### Delete Conversation
Delete a conversation and all its messages.

- **URL:** `/conversations/:id`
- **Method:** `DELETE`

---

## Messages

### Create Message (Sync)
Send a message and wait for the full AI response.

- **URL:** `/conversations/:conversationId/messages`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "content": "Hello, how are you?",
    "role": "user",
    "model": "openai/gpt-3.5-turbo",
    "temperature": 0.7
  }
  ```
- **Response (201):** Returns an array containing the user message and the assistant response.

### Create Message (Streaming)
Send a message and receive the AI response as a stream of Server-Sent Events (SSE).

- **URL:** `/conversations/:conversationId/messages/stream`
- **Method:** `POST`
- **Body:** Same as Create Message (Sync).
- **Stream Events:**
  - `type: user_message` - The saved user message object.
  - `type: ai_chunk` - A string fragment of the AI response.
  - `type: ai_complete` - The final saved assistant message object.
  - `type: error` - Sent if an error occurs during streaming.
  - `[DONE]` - Final signal.

---

## Combined Actions

### Start Conversation with Stream
Create a new conversation and start a streaming AI response in one request.

- **URL:** `/conversations/stream`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "title": "Optional Title",
    "content": "First message content",
    "model": "openai/gpt-3.5-turbo",
    "temperature": 0.7
  }
  ```
- **Stream Events:**
  - `type: conversation_created` - Contains the `conversationId` and the saved `userMessage`.
  - `type: ai_chunk` - AI response fragments.
  - `type: ai_complete` - The final saved assistant message.
  - `[DONE]` - Final signal.

---

## Message Management

### List Messages
Get all messages for a specific conversation.

- **URL:** `/conversations/:conversationId/messages`
- **Method:** `GET`

### Get Message
Get details of a specific message.

- **URL:** `/messages/:id`
- **Method:** `GET`

### Delete Message
Delete a specific message.

- **URL:** `/messages/:id`
- **Method:** `DELETE`
