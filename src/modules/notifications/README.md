# Notifications API

In-app notifications for the authenticated user (read/unread, pagination).

**Base URL:** `/v1/notifications`

---

## Authentication

All endpoints require a Bearer token:

```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. List notifications

- **URL:** `/`
- **Method:** `GET`
- **Query parameters** (strings in query, parsed server-side):
  - `offset` — default **0**
  - `limit` — default **20**
  - `unread` — optional; if `true`, only rows where `read === false`

**Response (200):** `message`: `"Notifications fetched successfully"`. `data` is the notification rows (each includes `data` as parsed JSON when stored as string). `meta`: `total_items`, `offset`, `limit`, `total_pages`.

---

### 2. Unread count

- **URL:** `/unread-count`
- **Method:** `GET`

**Response (200):** `data`: `{ "unread_count": number }`, `message`: `"Unread notification count fetched successfully"`.

---

### 3. Mark one as read

- **URL:** `/:id/read`
- **Method:** `PATCH`
- **Param:** `id` — notification UUID (must belong to the current user)

**Response (200):** Updated notification in `data`.

---

### 4. Mark all as read

- **URL:** `/read-all`
- **Method:** `PATCH`

**Response (200):** `data`: `{ "updated_count": number }`, `message`: `"All notifications marked as read successfully"`.

---

## Errors

Uses the shared API error shape (`AUTH_001`, `DB_001` for missing notification, `VALID_001`, etc.). See `src/utils/error.ts` and `AGENTS.md`.
