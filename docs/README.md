# API Documentation

Welcome to the Hono/TypeScript Backend API documentation. This documentation provides comprehensive details about all available API endpoints.

> **Note:** Module-specific documentation has been moved to the respective module directories in `src/modules/`. Each module contains its own `README.md` with detailed API documentation.

## Base URL

```
https://api.pilput.me/api
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
    "total_items": 100,
    "offset": 0,
    "limit": 10,
    "total_pages": 10
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
| Tags | [`src/modules/tags/README.md`](../src/modules/tags/README.md) | Tag retrieval |
| Likes | [`src/modules/likes/README.md`](../src/modules/likes/README.md) | Post like management |
| Bookmarks | [`src/modules/bookmarks/README.md`](../src/modules/bookmarks/README.md) | Post bookmark management |
| Comments | [`src/modules/comments/README.md`](../src/modules/comments/README.md) | Comment management |
| Holdings | [`src/modules/holdings/README.md`](../src/modules/holdings/README.md) | Investment portfolio tracking & corporate actions calendar |
| Holding Types | [`src/modules/holding-types/README.md`](../src/modules/holding-types/README.md) | Holding type catalog |
| Exchange Rates | [`src/modules/exchange-rates/README.md`](../src/modules/exchange-rates/README.md) | Foreign exchange rates (Yahoo Finance) |
| Notifications | [`src/modules/notifications/README.md`](../src/modules/notifications/README.md) | User notifications |
| Reports | [`src/modules/reports/README.md`](../src/modules/reports/README.md) | Admin analytics reports |
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
| `/posts/me/liked` | GET | Get posts liked by user | Yes |
| `/posts/me/:id` | GET | Get own post by ID (owner) | Yes |
| `/posts/me/analytics` | GET | Get own posts analytics (summary, view trend, top posts) | Yes |
| `/posts/feed/following` | GET | Get following feed | Yes |
| `/posts/feed/for-you` | GET | Get personalized for-you feed | Yes |
| `/posts/sitemap` | GET | Get posts for sitemap | No |
| `/posts/tag/:tag` | GET | Get posts by tag | No |
| `/posts/author/:username` | GET | Get posts by author | No |
| `/posts/slug/:slug` | GET | Get post by slug | No |
| `/posts/u/:username/:slug` | GET | Get post by author and slug | No |
| `/posts/all` | GET | Get all posts (admin) | Yes (Super Admin) |
| `/posts/:id` | GET | Get post by ID | No |
| `/posts` | POST | Create post | Yes |
| `/posts/:id` | PATCH | Update post | Yes |
| `/posts/:id/view` | POST | Record post view (deduped per user) | Optional |
| `/posts/:id/views` | GET | Get post view records (paginated) | Yes |
| `/posts/:id/view-stats` | GET | Get post view statistics | No |
| `/posts/:id/viewed` | GET | Check if current user viewed post | Yes |
| `/posts/:id` | DELETE | Delete post | Yes |
| `/posts/upload/image` | POST | Upload post image | Yes |
| `/posts/upload/presigned-url` | POST | Generate presigned upload URL | Yes |

### Users Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/users` | GET | Get all users | Yes (Super Admin) |
| `/users/me` | GET | Get current user profile | Yes |
| `/users/me` | PATCH | Update current user (core fields) | Yes |
| `/users/me/profile` | PATCH | Update current user profile fields | Yes |
| `/users/me/image` | PATCH | Update profile image | Yes |
| `/users/username/:username` | GET | Get user by username | No |
| `/users/:id` | GET | Get user by ID | Yes (Super Admin) |
| `/users` | POST | Create user | Yes (Super Admin) |
| `/users/:id` | PATCH | Update user | Yes (Super Admin) |
| `/users/:id` | DELETE | Delete user (soft delete) | Yes (Super Admin) |
| `/users/:id/restore` | POST | Restore soft-deleted user | Yes (Super Admin) |
| `/users/:id/follow` | POST | Follow user | Yes |
| `/users/:id/follow` | DELETE | Unfollow user | Yes |
| `/users/:id/followers` | GET | Get user followers | No |
| `/users/:id/following` | GET | Get user following | No |
| `/users/:id/follow-stats` | GET | Get follower/following counts | No |
| `/users/:id/mutual-follows` | GET | Get mutual follows with current user | Yes |
| `/users/:id/is-following` | GET | Check follow status | Yes |

### Tags Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/tags` | GET | Get all tags | No |

### Likes Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/likes/:post_id` | POST | Toggle like | Yes |
| `/likes/:post_id` | GET | Get post likes | No |
| `/likes/:post_id/stats` | GET | Get post like statistics | No |
| `/likes/:post_id/check` | GET | Check if current user liked post | Yes |

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

### Reference / catalog

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/holding-types` | GET | List holding types (global catalog) | Yes |

### Holdings Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/holdings` | GET | Get all holdings | Yes |
| `/holdings/summary` | GET | Get holdings summary | Yes |
| `/holdings/trends` | GET | Get holdings trends | Yes |
| `/holdings/compare` | GET | Compare months | Yes |
| `/holdings/monthly` | GET | Get monthly holdings data | Yes |
| `/holdings/calendar` | GET | Get corporate actions calendar (dividend & RUPS) | Yes |
| `/holdings/price` | GET | Get current price for a symbol | Yes |
| `/holdings/:id` | GET | Get single holding | Yes |
| `/holdings` | POST | Create holding | Yes |
| `/holdings/duplicate` | POST | Duplicate holdings | Yes |
| `/holdings/sync` | POST | Sync current month prices | Yes |
| `/holdings/:id` | PUT | Update holding | Yes |
| `/holdings/:id` | DELETE | Delete holding | Yes |

### Exchange Rates Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/exchange-rates?from=USD&to=IDR` | GET | Get exchange rate for a currency pair (cached 15 min) | Yes |

### Notifications Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/notifications` | GET | Get user notifications (paginated) | Yes |
| `/notifications/unread-count` | GET | Get unread notification count | Yes |
| `/notifications/:id/read` | PATCH | Mark notification as read | Yes |
| `/notifications/read-all` | PATCH | Mark all notifications as read | Yes |

### Reports Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/reports/overview` | GET | Get overview report | Yes (Super Admin) |
| `/reports/users` | GET | Get user report | Yes (Super Admin) |
| `/reports/posts` | GET | Get post report | Yes (Super Admin) |
| `/reports/engagement` | GET | Get engagement metrics | Yes (Super Admin) |

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
- `offset` (number, default: 0) - Number of items to skip
- `limit` (number, default: 10, max: 100) - Items per page

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
- Max file size: 1MB
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

### v1.1.0
- Synchronized with echobackend feature set:
  - New `exchange-rates` module (`GET /exchange-rates`) backed by Yahoo Finance with 15-minute caching
  - Corporate actions calendar (`GET /holdings/calendar`) with IDX dividend & RUPS events
  - Post view tracking: `GET /posts/:id/views`, `GET /posts/:id/view-stats`, `GET /posts/:id/viewed`; `POST /posts/:id/view` now records per-user view rows with deduplication
  - Like statistics: `GET /likes/:post_id/stats`, `GET /likes/:post_id/check`; `GET /likes/:post_id` is now public
  - Follow statistics: `GET /users/:id/follow-stats`, `GET /users/:id/mutual-follows`; followers/following lists are now public
  - User restore: `POST /users/:id/restore` (Super Admin)
  - Author analytics: `GET /posts/me/analytics`
- Documentation: added Notifications, Reports, Holding Types, and Exchange Rates modules to the reference

### v1.0.0
- Initial API release
- Core endpoints for auth, posts, users, tags
- Analytics and charting endpoints
- Investment holdings tracking
- AI chat integration
