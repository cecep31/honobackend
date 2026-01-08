# API Documentation

Welcome to the Hono/TypeScript Backend API documentation. This documentation provides comprehensive details about all available API endpoints.

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

See [Authentication API](auth.md) for details on:
- Login/Register
- Token refresh
- OAuth with GitHub
- Password management

---

## Modules

### [Auth API](auth.md)
User authentication and authorization endpoints.

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

---

### [Posts API](posts.md)
Blog post management and retrieval.

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/posts` | GET | Get all posts | No |
| `/posts/random` | GET | Get random posts | No |
| `/posts/trending` | GET | Get trending posts | No |
| `/posts/mine` | GET | Get user's posts | Yes |
| `/posts/tag/:tag` | GET | Get posts by tag | No |
| `/posts/user/:username` | GET | Get posts by user | No |
| `/posts/slug/:slug` | GET | Get post by slug | No |
| `/posts/u/:username/:slug` | GET | Get post by author and slug | No |
| `/posts/all` | GET | Get all posts (admin) | Yes (Super Admin) |
| `/posts/:id` | GET | Get post by ID | No |
| `/posts` | POST | Create post | Yes |
| `/posts/:id` | PATCH | Update post | Yes |
| `/posts/:id/view` | POST | Increment view count | No |
| `/posts/:id` | DELETE | Delete post | Yes |
| `/posts/upload/image` | POST | Upload post image | Yes |

#### [Posts Charts API](posts-charts.md)
Analytics and visualization endpoints for posts.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/posts/charts/posts-over-time` | GET | Posts over time |
| `/posts/charts/posts-by-tag` | GET | Posts by tag distribution |
| `/posts/charts/top-by-views` | GET | Top posts by views |
| `/posts/charts/top-by-likes` | GET | Top posts by likes |
| `/posts/charts/user-activity` | GET | User activity stats |
| `/posts/charts/engagement-metrics` | GET | Engagement metrics |
| `/posts/charts/engagement-comparison` | GET | Views vs likes comparison |

---

### [Users API](users.md)
User profile management.

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/users` | GET | Get all users | Yes (Super Admin) |
| `/users/me` | GET | Get current user profile | Yes |
| `/users/:id` | GET | Get user by ID | Yes |
| `/users` | POST | Create user | Yes (Super Admin) |
| `/users/:id` | DELETE | Delete user | Yes (Super Admin) |

---

### [Writers API](writers.md)
Public writer profile endpoints.

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/writers/:username` | GET | Get writer profile | No |
| `/writers/:username/posts` | GET | Get writer's posts | No |

---

### [Tags API](tags.md)
Tag retrieval endpoints.

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/tags` | GET | Get all tags | No |

---

### [Likes API](likes.md)
Post like management.

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/likes/:post_id` | POST | Toggle like | Yes |
| `/likes/:post_id` | GET | Get post likes | Yes |

---

### [Bookmarks API](bookmarks.md)
Post bookmark management.

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/bookmarks/:post_id` | POST | Toggle bookmark | Yes |
| `/bookmarks` | GET | Get user bookmarks | Yes |

---

### [Holdings API](holdings.md)
Investment portfolio tracking.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/holdings` | GET | Get all holdings |
| `/holdings/summary` | GET | Get holdings summary |
| `/holdings/trends` | GET | Get holdings trends |
| `/holdings/compare` | GET | Compare months |
| `/holdings/types` | GET | Get holding types |
| `/holdings/:id` | GET | Get single holding |
| `/holdings` | POST | Create holding |
| `/holdings/duplicate` | POST | Duplicate holdings |
| `/holdings/:id` | PUT | Update holding |
| `/holdings/:id` | DELETE | Delete holding |

---

### [Chat API](chat.md)
AI-powered chat with OpenRouter integration.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat/conversations` | GET | List conversations |
| `/chat/conversations` | POST | Create conversation |
| `/chat/conversations/:id` | GET | Get conversation |
| `/chat/conversations/:id` | DELETE | Delete conversation |
| `/chat/conversations/:id/messages` | POST | Send message (sync) |
| `/chat/conversations/:id/messages/stream` | POST | Send message (streaming) |
| `/chat/conversations/stream` | POST | Create + stream message |
| `/chat/messages/:id` | GET | Get message |
| `/chat/messages/:id` | DELETE | Delete message |

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

## SDKs & Libraries

### JavaScript/TypeScript

```typescript
import { Client } from '@pilput/sdk';

const client = new Client({
  baseUrl: 'https://api.pilput.me/v1',
  apiKey: process.env.API_KEY
});

// Example: Fetch posts
const posts = await client.posts.list();
```

### Python (Coming Soon)

```python
from pilput import Client

client = Client(base_url='https://api.pilput.me/v1')
posts = client.posts.list()
```

---

## Support

- **Documentation:** See individual module docs
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
