# Posts API Documentation

The Posts API provides endpoints for creating, reading, updating, and deleting blog posts. This documentation covers the main post management endpoints. For analytics and visualization endpoints, see the Chart Endpoints section below.

**Base URL:** `/v1/posts`

Successful JSON responses include `request_id` and `timestamp` on every endpoint (omitted in some examples below for brevity).

---

## Authentication

Most endpoints are public (no authentication required). The following require a Bearer token:

- `POST /` — Create a new post
- `PATCH /:id` — Update a post
- `DELETE /:id` — Delete a post
- `POST /upload/image` — Upload post image (multipart)
- `POST /upload/presigned-url` — Get a presigned S3 URL for client-side upload
- `GET /me` — Current user’s posts
- `GET /me/liked` — Posts the current user liked
- `GET /me/:id` — Post by ID (owner only; includes drafts)
- `GET /feed/following` — Feed from followed users and tags
- `GET /feed/for-you` — Personalized “for you” feed
- `GET /charts/my-likes-by-month` — Monthly likes on your posts
- `GET /all` — Super admin only (all posts including unpublished)

Protected endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

List endpoints that return pagination use this `meta` shape (from `offset` + `limit` query params):

| Field | Type | Description |
|-------|------|-------------|
| total_items | number | Total rows matching the query |
| offset | number | Current offset |
| limit | number | Page size |
| total_pages | number | `ceil(total_items / limit)` |

There is no `page` query parameter; use `offset` (e.g. `offset=0`, `offset=10`).

### 1. Get All Posts
Retrieve a paginated list of all published posts.

- **URL:** `/`
- **Method:** `GET`
- **Authentication:** Not required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| offset | number | No | 0 | Pagination offset |
| limit | number | No | 10 | Items per page |
| search | string | No | - | Search in title and body |
| q | string | No | - | Alias for search |
| orderBy | string | No | - | Field to order by |
| orderDirection | string | No | desc | Order direction (asc/desc) |

**Example Request:**
```bash
curl -X GET "/v1/posts?offset=0&limit=10"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Getting Started with TypeScript",
      "slug": "getting-started-typescript",
      "excerpt": "Learn how to get started with TypeScript...",
      "body": "Full post content here...",
      "photo_url": "/images/posts/typescript-guide.jpg",
      "published": true,
      "view_count": 1250,
      "like_count": 89,
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "username": "johndoe",
        "first_name": "John",
        "last_name": "Doe",
        "image": "https://example.com/avatars/johndoe.jpg"
      },
      "tags": ["typescript", "javascript", "programming"],
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-05T00:00:00Z"
    }
  ],
  "meta": {
    "total_items": 50,
    "offset": 0,
    "limit": 10,
    "total_pages": 5
  },
  "message": "Posts fetched successfully"
}
```

---

### 2. Get Random Posts
Retrieve a selection of random published posts.

- **URL:** `/random`
- **Method:** `GET`
- **Authentication:** Not required

**Example Request:**
```bash
curl -X GET /v1/posts/random
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Random Post Title",
      "slug": "random-post-title",
      "excerpt": "...",
      "photo_url": "/images/posts/random.jpg",
      "user": {
        "username": "author"
      },
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "message": "Random posts fetched successfully"
}
```

---

### 3. Get Trending Posts
Retrieve trending published posts (ordered by views, then likes). The server returns a fixed number of posts (currently **5**); there is no query parameter to change this.

- **URL:** `/trending`
- **Method:** `GET`
- **Authentication:** Not required
- **Query Parameters:** None

**Example Request:**
```bash
curl -X GET "/v1/posts/trending"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Trending Post Title",
      "slug": "trending-post-title",
      "excerpt": "...",
      "photo_url": "/images/posts/trending.jpg",
      "view_count": 10000,
      "like_count": 500,
      "user": {
        "username": "popularauthor"
      },
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "message": "Trending posts fetched successfully"
}
```

---

### 4. Get My Posts
Retrieve posts created by the authenticated user.

- **URL:** `/me`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| offset | number | No | 0 | Pagination offset |
| limit | number | No | 10 | Items per page |
| search | string | No | - | Search in title and body |
| q | string | No | - | Alias for search |
| orderBy | string | No | - | Field to order by |
| orderDirection | string | No | desc | Order direction (asc/desc) |

**Example Request:**
```bash
curl -X GET "/v1/posts/me?offset=0&limit=10" \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total_items": 25,
    "offset": 0,
    "limit": 10,
    "total_pages": 3
  },
  "message": "My posts fetched successfully"
}
```

---

### 5. Get Liked Posts
Retrieve posts liked by the authenticated user.

- **URL:** `/me/liked`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| offset | number | No | 0 | Pagination offset |
| limit | number | No | 10 | Items per page |

**Example Request:**
```bash
curl -X GET "/v1/posts/me/liked?offset=0&limit=10" \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Liked Post Title",
      "slug": "liked-post-title",
      "excerpt": "...",
      "photo_url": "/images/posts/liked.jpg",
      "view_count": 500,
      "like_count": 25,
      "user": {
        "id": "author-id",
        "username": "author",
        "image": "https://example.com/avatars/author.jpg"
      },
      "tags": ["typescript"],
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total_items": 10,
    "offset": 0,
    "limit": 10,
    "total_pages": 1
  },
  "message": "Liked posts fetched successfully"
}
```

**Note:** Posts are ordered by the time they were liked (most recently liked first). Only published posts are returned.

---

### 6. Get Posts by Tag
Retrieve all posts with a specific tag.

- **URL:** `/tag/:tag`
- **Method:** `GET`
- **Authentication:** Not required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| offset | number | No | 0 | Pagination offset |
| limit | number | No | 10 | Items per page |

**Example Request:**
```bash
curl -X GET /v1/posts/tag/typescript
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "TypeScript Tutorial",
      "slug": "typescript-tutorial",
      "excerpt": "...",
      "photo_url": "/images/posts/typescript.jpg",
      "tags": ["typescript", "javascript"],
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total_items": 100,
    "offset": 0,
    "limit": 10,
    "total_pages": 10
  },
  "message": "Posts by tag fetched successfully"
}
```

---

### 7. Get Posts by Username
Retrieve published posts by a specific author (newest first).

- **URL:** `/author/:username`
- **Method:** `GET`
- **Authentication:** Not required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| offset | number | No | 0 | Pagination offset |
| limit | number | No | 10 | Items per page |

The route accepts the same query schema as other list endpoints, but **only `offset` and `limit` are applied** for this handler (search/sort query fields are ignored).

**Example Request:**
```bash
curl -X GET "/v1/posts/author/johndoe?offset=0&limit=10"
```

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total_items": 15,
    "offset": 0,
    "limit": 10,
    "total_pages": 2
  },
  "message": "Posts by johndoe fetched successfully"
}
```

---

### 8. Get Post by Slug
Retrieve a single post by its slug.

- **URL:** `/slug/:slug`
- **Method:** `GET`
- **Authentication:** Not required

**Example Request:**
```bash
curl -X GET /v1/posts/slug/getting-started-typescript
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Getting Started with TypeScript",
    "slug": "getting-started-typescript",
    "excerpt": "Learn how to get started with TypeScript...",
    "body": "Full post content here...",
    "photo_url": "/images/posts/typescript-guide.jpg",
    "published": true,
    "view_count": 1250,
    "like_count": 89,
    "is_liked": false,
    "is_bookmarked": false,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "username": "johndoe",
      "first_name": "John",
      "last_name": "Doe",
      "image": "https://example.com/avatars/johndoe.jpg",
      "bio": "Full stack developer",
      "website": "https://johndoe.com"
    },
    "tags": ["typescript", "javascript", "programming"],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-05T00:00:00Z"
  },
  "message": "Post fetched successfully"
}
```

---

### 9. Get Post by Username and Slug
Retrieve a single post by the author's username and the post's slug.

- **URL:** `/u/:username/:slug`
- **Method:** `GET`
- **Authentication:** Not required

**Example Request:**
```bash
curl -X GET /v1/posts/u/johndoe/getting-started-typescript
```

**Response (200):** Same as Get Post by Slug

---

### 10. Get All Posts (Admin)
Retrieve all posts including unpublished ones. Super admin only.

- **URL:** `/all`
- **Method:** `GET`
- **Authentication:** Required
- **Requires:** Super Admin role
- **Query Parameters:** None

**Example Request:**
```bash
curl -X GET /v1/posts/all \
  -H "Authorization: Bearer <admin_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "My Post",
      "slug": "my-post",
      "published": false,
      "view_count": 0,
      "like_count": 0,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "message": "All posts fetched successfully"
}
```

---

### 11. Get Post by ID
Retrieve a single post by its ID.

- **URL:** `/:id`
- **Method:** `GET`
- **Authentication:** Not required
- **Query Parameters:** None

**Example Request:**
```bash
curl -X GET /v1/posts/550e8400-e29b-41d4-a716-446655440000
```

**Response (200):** Same as Get Post by Slug

---

### 12. Create Post
Create a new post.

- **URL:** `/`
- **Method:** `POST`
- **Authentication:** Required
- **Content-Type:** `application/json`
- **Query Parameters:** None

**Request Body:**
```json
{
  "title": "Getting Started with TypeScript",
  "body": "Full post content here. Must be at least 20 characters.",
  "slug": "getting-started-typescript",
  "tags": ["typescript", "javascript", "programming"],
  "photo_url": "/images/posts/typescript-guide.jpg",
  "published": true
}
```

**Validation Rules:**
| Field | Type | Required | Rules |
|-------|------|----------|-------|
| title | string | Yes | 5-255 characters |
| body | string | Yes | 20-500000 characters (HTML sanitized) |
| slug | string | Yes | 5-255 characters, URL-friendly |
| tags | array | No | Array of tag strings |
| photo_url | string \| null | No | Omit or null if none |
| published | boolean | No | Default: true |
| published_at | string (ISO 8601) | No | Must be omitted when `published` is false |

**Example Request:**
```bash
curl -X POST /v1/posts \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "My New Post", "body": "This is my new post content...", "slug": "my-new-post", "tags": ["news"], "published": true}'
```

**Response (201):** Returns only the new post id; fetch `GET /me/:id` or list endpoints for full rows.

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "message": "Post created successfully"
}
```

---

### 13. Update Post
Update an existing post.

- **URL:** `/:id`
- **Method:** `PATCH`
- **Authentication:** Required
- **Content-Type:** `application/json`
- **Query Parameters:** None

**Request Body:**
```json
{
  "title": "Updated Title",
  "body": "Updated content...",
  "tags": ["updated", "tags"],
  "published": true
}
```

**Validation Rules:**
| Field | Type | Required | Rules |
|-------|------|----------|-------|
| title | string | No | 5-255 characters |
| body | string | No | 20-500000 characters (HTML sanitized) |
| slug | string | No | 5-255 characters |
| tags | array | No | Array of tag strings |
| photo_url | string | No | - |
| published | boolean | No | - |
| published_at | string \| null | No | Same rules as create |

**Example Request:**
```bash
curl -X PATCH /v1/posts/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Updated Title",
    "...": "..."
  },
  "message": "Post updated successfully"
}
```

---

### 14. Increment View Count
Increment the view count of a post.

- **URL:** `/:id/view`
- **Method:** `POST`
- **Authentication:** Not required
- **Query Parameters:** None

**Example Request:**
```bash
curl -X POST /v1/posts/550e8400-e29b-41d4-a716-446655440000/view
```

**Response (200):** `data` is an array from the DB `RETURNING` clause (one row when the post exists).

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "view_count": 1251
    }
  ],
  "message": "Post view incremented"
}
```

If no row matched the id, `data` may be an empty array.

---

### 15. Delete Post
Delete a post.

- **URL:** `/:id`
- **Method:** `DELETE`
- **Authentication:** Required
- **Query Parameters:** None

**Example Request:**
```bash
curl -X DELETE /v1/posts/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):** Soft-delete; `data` is an array with the deleted post id.

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000"
    }
  ],
  "message": "Post deleted successfully"
}
```

---

### 16. Upload Image
Upload an image for a post to S3.

- **URL:** `/upload/image`
- **Method:** `POST`
- **Authentication:** Required
- **Content-Type:** `multipart/form-data`
- **Query Parameters:** None

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| image | File | Yes | Image file (JPEG, PNG, GIF, WebP) |

**Validation Rules:**
- Allowed types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Max size: **1MB**

**Example Request:**
```bash
curl -X POST /v1/posts/upload/image \
  -H "Authorization: Bearer <your_token>" \
  -F "image=@/path/to/image.jpg"
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "url": "https://cdn.example.com/posts/user-id/timestamp-random.jpg"
  },
  "message": "Image uploaded successfully"
}
```

---

### 17. Generate Presigned Upload URL
Request a short-lived presigned URL to upload an image directly to object storage (client uploads the file to the URL, then uses `publicUrl` in the post body).

- **URL:** `/upload/presigned-url`
- **Method:** `POST`
- **Authentication:** Required
- **Content-Type:** `application/json`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| contentType | string | Yes | One of: `image/jpeg`, `image/png`, `image/gif`, `image/webp` |
| filename | string | No | Safe filename base (sanitized); a random name is used if omitted |
| size | number | No | Intended size in bytes (must not exceed 1MB if sent) |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "presignedUrl": "https://...",
    "key": "posts/<user-id>/<name>.jpg",
    "publicUrl": "https://...",
    "expiresIn": 300,
    "maxSize": 1048576,
    "requestedSize": 102400
  },
  "message": "Presigned URL generated successfully"
}
```

---

### 18. Get Following Feed
Retrieve posts from users and tags the authenticated user follows.

- **URL:** `/feed/following`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| offset | number | No | 0 | Pagination offset |
| limit | number | No | 10 | Items per page |
| search | string | No | - | Search in title and body |
| q | string | No | - | Alias for search |
| orderBy | string | No | - | Field to order by |
| orderDirection | string | No | desc | Order direction (asc/desc) |

**Example Request:**
```bash
curl -X GET "/v1/posts/feed/following?offset=0&limit=10" \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total_items": 25,
    "offset": 0,
    "limit": 10,
    "total_pages": 3
  },
  "message": "Following feed fetched successfully"
}
```

---

### 19. Get For You Feed
Personalized feed: published posts ranked by relevance to users and tags you follow, with pagination. Supports search on title/body.

- **URL:** `/feed/for-you`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| offset | number | No | 0 | Pagination offset |
| limit | number | No | 10 | Items per page |
| search | string | No | - | Search in title and body |
| q | string | No | - | Alias for search |

The shared list query schema also allows `orderBy` / `orderDirection`, but **this route ignores them**; ordering is fixed (relevance score, then recency).

**Example Request:**
```bash
curl -X GET "/v1/posts/feed/for-you?offset=0&limit=10" \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):** Same `meta` shape as other paginated list endpoints.

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total_items": 40,
    "offset": 0,
    "limit": 10,
    "total_pages": 4
  },
  "message": "For you feed fetched successfully"
}
```

---

### 20. Get Sitemap Posts
Retrieve minimal post data for sitemap generation. Rate limited.

- **URL:** `/sitemap`
- **Method:** `GET`
- **Authentication:** Not required
- **Rate Limit:** 10 requests per 5 minutes

**Example Request:**
```bash
curl -X GET /v1/posts/sitemap
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "slug": "getting-started-typescript",
      "username": "johndoe",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-05T00:00:00Z"
    }
  ],
  "message": "Sitemap posts fetched successfully"
}
```

---

### 21. Get Post by ID (Owner)
Retrieve a single post by its ID. Only the post owner can access this endpoint (includes drafts).

- **URL:** `/me/:id`
- **Method:** `GET`
- **Authentication:** Required

**Example Request:**
```bash
curl -X GET /v1/posts/me/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):** Same as Get Post by Slug

---

## Chart Endpoints

This section describes chart endpoints available for posts module. These endpoints provide data for visualizing post statistics and engagement metrics in frontend.

### 1. Posts Over Time
**GET** `/v1/posts/charts/posts-over-time`

Get number of posts created over a specified time period, grouped by day, week, or month.

**Query Parameters:**
- `days` (optional, default: 30) - Number of days to look back
- `groupBy` (optional, default: "day") - Grouping interval: "day", "week", or "month"

**Example Request:**
```
GET /v1/posts/charts/posts-over-time?days=60&groupBy=week
```

**Response:**
```json
{
  "success": true,
  "message": "Posts over time data fetched successfully",
  "data": [
    {
      "date": "2026-01",
      "count": 15
    },
    {
      "date": "2026-02",
      "count": 23
    }
  ]
}
```

**Use Case:** Line chart or bar chart showing post creation trends over time.

---

### 2. Posts by Tag Distribution
**GET** `/v1/posts/charts/posts-by-tag`

Get distribution of posts across different tags.

**Query Parameters:**
- `limit` (optional, default: 10) - Number of top tags to return

**Example Request:**
```
GET /v1/posts/charts/posts-by-tag?limit=15
```

**Response:**
```json
{
  "success": true,
  "message": "Posts by tag distribution fetched successfully",
  "data": [
    {
      "tag_name": "javascript",
      "tag_id": 1,
      "post_count": 45
    },
    {
      "tag_name": "typescript",
      "tag_id": 2,
      "post_count": 38
    }
  ]
}
```

**Use Case:** Pie chart or bar chart showing which tags are most popular.

---

### 3. Top Posts by Views
**GET** `/v1/posts/charts/top-by-views`

Get posts with highest view counts.

**Query Parameters:**
- `limit` (optional, default: 10) - Number of posts to return

**Example Request:**
```
GET /v1/posts/charts/top-by-views?limit=5
```

**Response:**
```json
{
  "success": true,
  "message": "Top posts by views fetched successfully",
  "data": [
    {
      "id": "uuid",
      "title": "Getting Started with TypeScript",
      "slug": "getting-started-typescript",
      "view_count": 1250,
      "like_count": 89,
      "created_at": "2026-01-01T00:00:00Z",
      "user": {
        "id": "uuid",
        "username": "johndoe",
        "first_name": "John",
        "last_name": "Doe"
      }
    }
  ]
}
```

**Use Case:** Leaderboard or horizontal bar chart of most viewed posts.

---

### 4. Top Posts by Likes
**GET** `/v1/posts/charts/top-by-likes`

Get posts with highest like counts.

**Query Parameters:**
- `limit` (optional, default: 10) - Number of posts to return

**Example Request:**
```
GET /v1/posts/charts/top-by-likes?limit=5
```

**Response:**
```json
{
  "success": true,
  "message": "Top posts by likes fetched successfully",
  "data": [
    {
      "id": "uuid",
      "title": "Advanced React Patterns",
      "slug": "advanced-react-patterns",
      "view_count": 980,
      "like_count": 156,
      "created_at": "2026-01-05T00:00:00Z",
      "user": {
        "id": "uuid",
        "username": "janedoe",
        "first_name": "Jane",
        "last_name": "Doe"
      }
    }
  ]
}
```

**Use Case:** Leaderboard or horizontal bar chart of most liked posts.

---

### 5. User Activity
**GET** `/v1/posts/charts/user-activity`

Get statistics about user posting activity, including post counts and engagement metrics per user.

**Query Parameters:**
- `limit` (optional, default: 10) - Number of users to return

**Example Request:**
```
GET /v1/posts/charts/user-activity?limit=15
```

**Response:**
```json
{
  "success": true,
  "message": "User activity data fetched successfully",
  "data": [
    {
      "user_id": "uuid",
      "username": "johndoe",
      "first_name": "John",
      "last_name": "Doe",
      "post_count": 25,
      "total_views": 5420,
      "total_likes": 342
    }
  ]
}
```

**Use Case:** Table or bar chart showing most active content creators.

---

### 6. Engagement Metrics Overview
**GET** `/v1/posts/charts/engagement-metrics`

Get overall engagement metrics for all posts.

**Query Parameters:** None

**Example Request:**
```
GET /v1/posts/charts/engagement-metrics
```

**Response:**
```json
{
  "success": true,
  "message": "Engagement metrics fetched successfully",
  "data": {
    "total_posts": 150,
    "total_views": 45230,
    "total_likes": 3420,
    "avg_views_per_post": 301.53,
    "avg_likes_per_post": 22.8,
    "published_posts": 142,
    "draft_posts": 8
  }
}
```

**Use Case:** Dashboard cards or KPI widgets showing overall statistics.

---

### 7. Engagement Comparison
**GET** `/v1/posts/charts/engagement-comparison`

Get posts with their view and like counts, including engagement rate (likes/views ratio).

**Query Parameters:**
- `limit` (optional, default: 10) - Number of posts to return

**Example Request:**
```
GET /v1/posts/charts/engagement-comparison?limit=30
```

**Response:**
```json
{
  "success": true,
  "message": "Engagement comparison data fetched successfully",
  "data": [
    {
      "id": "uuid",
      "title": "Understanding Async/Await",
      "slug": "understanding-async-await",
      "view_count": 1200,
      "like_count": 96,
      "engagement_rate": 8.0,
      "created_at": "2026-01-03T00:00:00Z"
    }
  ]
}
```

**Use Case:** Scatter plot or bubble chart comparing views vs likes, or table showing engagement rates.

---

### 8. My Likes by Month
**GET** `/v1/posts/charts/my-likes-by-month`

Count how many likes your posts received in each calendar month. Uses each like’s `created_at` timestamp; only includes likes on posts you authored (non-deleted posts).

**Authentication:** Required (Bearer token)

**Query Parameters:**
- `months` (optional, default: 12) - How many past months to include, counting from the first day of the month (minimum 1, maximum 120). Months with zero likes are omitted from `data`.

**Example Request:**
```bash
curl -X GET "/v1/posts/charts/my-likes-by-month?months=24" \
  -H "Authorization: Bearer <your_token>"
```

**Response:**
```json
{
  "success": true,
  "message": "Monthly likes on your posts fetched successfully",
  "data": [
    {
      "month": "2026-01",
      "count": 12
    },
    {
      "month": "2026-02",
      "count": 28
    }
  ]
}
```

**Use Case:** Line or bar chart of likes over time for the signed-in author’s content.

---

## Data Models

### Post Object

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique post identifier |
| title | string | Post title |
| slug | string | URL-friendly identifier |
| body | string | Full post content (HTML sanitized) |
| excerpt | string | Optional; some list endpoints return a short preview |
| photo_url | string \| null | Featured image URL |
| published | boolean | Publication status |
| view_count | number | Number of views |
| like_count | number | Number of likes |
| is_liked | boolean | Whether current user liked |
| is_bookmarked | boolean | Whether current user bookmarked |
| user | object | Post author information |
| user.id | UUID | Author's user ID |
| user.username | string | Author's username |
| user.first_name | string | Author's first name |
| user.last_name | string | Author's last name |
| user.image | string | Author's avatar URL |
| tags | array | Array of tag strings |
| created_at | ISO 8601 | Creation timestamp |
| updated_at | ISO 8601 | Last update timestamp |

---

## Error Responses

Errors follow the API-wide shape: `success`, `message`, `error` (optional `code` and `details`), plus `request_id` and `timestamp`.

**Example (validation):**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALID_001",
    "details": [{ "field": "body", "message": "String must contain at least 20 character(s)" }]
  },
  "request_id": "…",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

**401 Unauthorized** — missing or invalid Bearer token.  
**403 Forbidden** — authenticated but not allowed (e.g. not the post owner, not super admin).  
**404 Not Found** — post or resource does not exist.

---

## Implementation Example

### JavaScript/TypeScript

```typescript
// Fetch posts with pagination
async function getPosts(offset = 0, limit = 10): Promise<{ data: Post[]; meta: PaginationMeta }> {
  const response = await fetch(`/v1/posts?offset=${offset}&limit=${limit}`);
  const result = await response.json();
  return result;
}

// Get single post by slug
async function getPostBySlug(slug: string): Promise<Post> {
  const response = await fetch(`/v1/posts/slug/${slug}`);
  const result = await response.json();
  return result.data;
}

// Create a new post
async function createPost(data: PostCreateBody): Promise<Post> {
  const response = await fetch('/v1/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  const result = await response.json();
  return result.data;
}

// Upload post image
async function uploadPostImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('/v1/posts/upload/image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  const result = await response.json();
  return result.data;
}

// Increment view count (data is a single-element array when updated)
async function incrementView(postId: string): Promise<number> {
  const response = await fetch(`/v1/posts/${postId}/view`, {
    method: 'POST'
  });
  const result = await response.json();
  return result.data[0]?.view_count ?? 0;
}
```

---

## Security Notes

- Image upload (multipart and presigned flow) enforces type and **1MB** size limits
- Users can only modify or delete their own posts
- Draft posts are only visible to the author (use `GET /me/:id` for drafts)
- View counts use a separate endpoint
- `GET /sitemap` is rate-limited (10 requests per 5 minutes per client key)
