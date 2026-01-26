# API Documentation

Welcome to the Hono/TypeScript Backend API documentation. This documentation provides comprehensive details about all available API endpoints.

> **Note:** Module-specific documentation has been moved to the respective module directories in `src/modules/`. Each module contains its own `README.md` with detailed API documentation.

## Base URL

```
https://api.pilput.me/v1
```

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  },
  "message": "Data fetched successfully"
}
```

---

## Authentication

Most endpoints require authentication via JWT Bearer token:

```
Authorization: Bearer <your_jwt_token>
```

---

## Modules

Each module has its own README.md with detailed documentation:

| Module | Location | Description |
|--------|----------|-------------|
| Auth | [`src/modules/auth/README.md`](../src/modules/auth/README.md) | User authentication and authorization |
| Posts | [`src/modules/posts/README.md`](../src/modules/posts/README.md) | Blog post management |
| Users | [`src/modules/users/README.md`](../src/modules/users/README.md) | User profile management |
| Writers | [`src/modules/writers/README.md`](../src/modules/writers/README.md) | Public writer profiles |
| Tags | [`src/modules/tags/README.md`](../src/modules/tags/README.md) | Tag retrieval |
| Likes | [`src/modules/likes/README.md`](../src/modules/likes/README.md) | Post like management |
| Bookmarks | [`src/modules/bookmarks/README.md`](../src/modules/bookmarks/README.md) | Post bookmark management |
| Comments | [`src/modules/comments/README.md`](../src/modules/comments/README.md) | Comment management |
| Holdings | [`src/modules/holdings/README.md`](../src/modules/holdings/README.md) | Investment portfolio tracking |
| Chat | [`src/modules/chat/README.md`](../src/modules/chat/README.md) | AI-powered chat |

---

## Quick Reference

### Auth Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/oauth/github` | GET | GitHub OAuth login | No |
| `/oauth/github/callback` | GET | OAuth callback handler | No |
| `/login` | POST | User login | No |
| `/register` | POST | User registration | No |
| `/username/:username` | GET | Check username availability | No |
| `/email/:email` | GET | Check email availability | No |
| `/refresh-token` | POST | Refresh access token | No |
| `/logout` | POST | User logout | Yes |
| `/password` | PATCH | Update password | Yes |
| `/forgot-password` | POST | Request password reset | No |
| `/reset-password` | POST | Reset password | No |

### Posts Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/posts` | GET | Get all posts | No |
| `/posts/random` | GET | Get random posts | No |
| `/posts/trending` | GET | Get trending posts | No |
| `/posts/me` | GET | Get user's posts | Yes |
| `/posts/tag/:tag` | GET | Get posts by tag | No |
| `/posts/author/:username` | GET | Get posts by author | No |
| `/posts/slug/:slug` | GET | Get post by slug | No |
| `/posts/u/:username/:slug` | GET | Get post by author and slug | No |
| `/posts/all` | GET | Get all posts (admin) | Yes (Super Admin) |
| `/posts/:id` | GET | Get post by ID | No |
| `/posts` | POST | Create post | Yes |
| `/posts/:id` | PATCH | Update post | Yes |
| `/posts/:id/view` | POST | Increment view count | No |
| `/posts/:id` | DELETE | Delete post | Yes |
| `/posts/upload/image` | POST | Upload post image | Yes |

### Users Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/users` | GET | Get all users | Yes (Super Admin) |
| `/users/me` | GET | Get current user profile | Yes |
| `/users/:id` | GET | Get user by ID | Yes |
| `/users` | POST | Create user | Yes (Super Admin) |
| `/users/:id` | DELETE | Delete user | Yes (Super Admin) |
| `/users/:id/follow` | POST | Follow user | Yes |
| `/users/:id/follow` | DELETE | Unfollow user | Yes |
| `/users/:id/followers` | GET | Get user followers | Yes |
| `/users/:id/following` | GET | Get user following | Yes |
| `/users/:id/is-following` | GET | Check follow status | Yes |

### Writers Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/writers/:username` | GET | Get writer profile | No |
| `/writers/:username/posts` | GET | Get writer's posts | No |

### Tags Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/tags` | GET | Get all tags | No |

### Likes Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/likes/:post_id` | POST | Toggle like | Yes |
| `/likes/:post_id` | GET | Get post likes | Yes |

### Bookmarks Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/bookmarks/:post_id` | POST | Toggle bookmark | Yes |
| `/bookmarks` | GET | Get user bookmarks | Yes |

### Comments Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/comments` | POST | Create comment | Yes |
| `/comments/post/:post_id` | GET | Get comments for post | No |
| `/comments/:comment_id/replies` | GET | Get comment replies | No |
| `/comments/:comment_id` | GET | Get single comment | No |
| `/comments/:comment_id` | PUT | Update comment | Yes |
| `/comments/:comment_id` | DELETE | Delete comment | Yes |
| `/comments/user/:user_id` | GET | Get user's comments | No |

### Holdings Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/holdings` | GET | Get all holdings | Yes |
| `/holdings/summary` | GET | Get holdings summary | Yes |
| `/holdings/trends` | GET | Get holdings trends | Yes |
| `/holdings/compare` | GET | Compare months | Yes |
| `/holdings/types` | GET | Get holding types | Yes |
| `/holdings/:id` | GET | Get single holding | Yes |
| `/holdings` | POST | Create holding | Yes |
| `/holdings/duplicate` | POST | Duplicate holdings | Yes |
| `/holdings/:id` | PUT | Update holding | Yes |
| `/holdings/:id` | DELETE | Delete holding | Yes |

### Chat Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/chat/conversations` | GET | List conversations | Yes |
| `/chat/conversations` | POST | Create conversation | Yes |
| `/chat/conversations/:id` | GET | Get conversation | Yes |
| `/chat/conversations/:id` | DELETE | Delete conversation | Yes |
| `/chat/conversations/:id/messages` | POST | Send message (sync) | Yes |
| `/chat/conversations/:id/messages/stream` | POST | Send message (streaming) | Yes |
| `/chat/conversations/stream` | POST | Create + stream message | Yes |
| `/chat/messages/:id` | GET | Get message | Yes |
| `/chat/messages/:id` | DELETE | Delete message | Yes |

---

## Common Query Parameters

### Pagination
Used in list endpoints:
- `page` (number, default: 1) - Page number
- `limit` (number, default: 10) - Items per page

### Sorting
Used in holdings and similar endpoints:
- `sortBy` (string) - Field to sort by
- `order` (string: `asc` | `desc`) - Sort direction

### Filtering
- `month` (number) - Filter by month (1-12)
- `year` (number) - Filter by year
- `tag` (string) - Filter by tag name
- `username` (string) - Filter by username

---

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created (new resource) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found (resource doesn't exist) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

---

## Rate Limiting

- Auth login: 7 requests per 15 minutes per IP
- General endpoints: Standard rate limiting applies
- Check response headers for rate limit status:
  - `RateLimit-Limit`
  - `RateLimit-Remaining`
  - `RateLimit-Reset`

---

## File Upload

For image uploads (e.g., post images):

**Endpoint:** `POST /posts/upload/image`

**Requirements:**
- Content-Type: `multipart/form-data`
- Max file size: 5MB
- Allowed types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`

---

## Webhooks & Real-time

### Server-Sent Events (SSE)
Chat streaming responses use SSE format:

```
data: {"type": "ai_chunk", "content": "Hello"}
data: {"type": "ai_chunk", "content": " world"}
data: {"type": "ai_complete", "message": {...}}
[DONE]
```

---

## Support

- **Documentation:** See individual module docs in `src/modules/`
- **Issues:** Report bugs via GitHub issues
- **Email:** api-support@pilput.me

---

## Changelog

### v1.0.0
- Initial API release
- Core endpoints for auth, posts, users, tags
- Analytics and charting endpoints
- Investment holdings tracking
- AI chat integration
