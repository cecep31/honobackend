# Chat API Documentation

The Chat API provides endpoints for managing conversations and messages, integrating with AI models via OpenRouter.

**Base URL:** `/v1/chat`

## Authentication

All endpoints require a Bearer token in the `Authorization` header.

## Rate limiting (AI routes)

These routes apply an additional limit of **30 requests per hour per user** (on top of the global API rate limit):

- `POST /conversations/stream`
- `POST /conversations/:conversationId/messages`
- `POST /conversations/:conversationId/messages/stream`

On limit, the API responds with **429** and error code `RATE_001`; `error.details.retry_after` is **3600** (seconds).

---

## Response envelope

Successful JSON responses follow the shared shape: `success`, `data`, `message`, `request_id`, `timestamp`, and optional `meta` (see `sendSuccess` in `src/utils/response.ts`).

---

## Conversations

### Create conversation

Create a new conversation.

- **URL:** `/conversations`
- **Method:** `POST`
- **Body:** (all optional)
  ```json
  {
    "title": "My New Chat"
  }
  ```
  If `title` is omitted, the server uses `"New conversation"`.
- **Response (201):** `message`: `"Conversation created successfully"`. `data` includes `id`, `title`, `user_id`, `is_pinned`, `pinned_at`, `created_at`, `updated_at`.

### List conversations

Paginated list of the current user’s conversations. Pinned rows are ordered first; then by `orderBy` / `orderDirection` (see query params).

- **URL:** `/conversations`
- **Method:** `GET`
- **Query params:**
  - `offset` — string, default `0`
  - `limit` — string, default `10`
  - `search` or `q` — optional filter on conversation title (case-insensitive contains)
  - `orderBy` — optional; use `title` to sort by title, otherwise ordering uses `updated_at`
  - `orderDirection` — `asc` or `desc`, default `desc`
- **Response (200):** `message`: `"Conversations fetched successfully"`. `meta` uses offset-based pagination:
  ```json
  {
    "total_items": 10,
    "offset": 0,
    "limit": 10,
    "total_pages": 1
  }
  ```

### Get conversation

Load one conversation. **Includes nested messages:** `data.chatMessages` is ordered ascending by `created_at`.

- **URL:** `/conversations/:id`
- **Method:** `GET`
- **Response (200):** `message`: `"Conversation fetched successfully"`.

### Update conversation

- **URL:** `/conversations/:id`
- **Method:** `PATCH`
- **Body:** at least one field required
  ```json
  {
    "title": "Renamed",
    "is_pinned": true
  }
  ```
- **Response (200):** `message`: `"Conversation updated successfully"`.

### Delete conversation

Deletes the conversation row (messages are removed via foreign key cascade).

- **URL:** `/conversations/:id`
- **Method:** `DELETE`
- **Response (200):** `message`: `"Conversation deleted successfully"`.

---

## Messages

### Create message (sync)

Send a message; when `role` is `user` (default), the server calls OpenRouter and appends the assistant reply when successful.

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
  - `role` — optional, default `"user"`
  - `model` — optional OpenRouter model id
  - `temperature` — optional, default `0.7`, range `0`–`2`
- **Response (201):** `data` is an **array** of saved messages (typically the user message plus the assistant message when generation succeeds). `message`: `"Messages created successfully"`. If the assistant call fails, `data` may contain only the user message.

### Create message (streaming)

SSE (`text/event-stream`). Each event line is `data: <payload>\n\n` where `<payload>` is JSON with `type` and `data`, except the terminal line `data: [DONE]\n\n`.

- **URL:** `/conversations/:conversationId/messages/stream`
- **Method:** `POST`
- **Body:** same as sync create message.
- **Events:**
  - `type: user_message` — `data` is the saved user message object.
  - `type: ai_chunk` — `data` is a string fragment of the assistant reply.
  - `type: ai_complete` — `data` is the saved assistant message (includes token fields when available).
  - `type: error` — `data` is the string `"Failed to generate AI response"` if streaming fails.
  - `data: [DONE]\n\n` — end of stream.
- **Non-streaming fallback:** if no stream is available, response is **201** JSON with `data: [<user_message>]` and `message`: `"Message created successfully"`.

---

## Combined actions

### Start conversation with stream

Create a conversation and stream the first assistant reply.

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
  `content` is required; `title` is optional (title is derived from content when omitted).
- **SSE events:**
  - `type: conversation_created` — `data` is `{ "conversation_id": "...", "user_message": { ... } }`.
  - `type: ai_chunk` / `type: ai_complete` / `type: error` — same semantics as message streaming.
  - `data: [DONE]\n\n` — end of stream.
- **Non-streaming fallback:** same as message stream (**201** with a single user message array when no generator).

---

## Message management

### List messages

Returns messages for the conversation, newest first (`created_at` descending).

- **URL:** `/conversations/:conversationId/messages`
- **Method:** `GET`

### Get message

- **URL:** `/messages/:id`
- **Method:** `GET`
- **Response (200):** `message`: `"Message fetched successfully"`.

### Delete message

- **URL:** `/messages/:id`
- **Method:** `DELETE`
- **Response (200):** `message`: `"Message deleted successfully"`.
