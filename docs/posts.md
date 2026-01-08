# Posts API Documentation

The Posts API provides endpoints for creating, reading, updating, and deleting blog posts. This documentation covers the main post management endpoints. For analytics and visualization endpoints, see [Posts Charts](posts-charts.md).

**Base URL:** `/v1/posts`

---

## Authentication

Most endpoints are public (no authentication required). The following endpoints require authentication:
- `POST /` - Create a new post
- `PATCH /:id` - Update a post
- `DELETE /:id` - Delete a post
- `POST /upload/image` - Upload post images
- `GET /mine` - Get authenticated user's posts
- `GET /all` - Super admin only (get all posts)

Protected endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Get All Posts
Retrieve a paginated list of all published posts.

- **URL:** `/`
- **Method:** `GET`
- **Authentication:** Not required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 10 | Items per page |

**Example Request:**
```bash
curl -X GET "/v1/posts?page=1&limit=10"
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
      "creator": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "username": "johndoe",
        "first_name": "John",
        "last_name": "Doe",
        "avatar_url": "https://example.com/avatars/johndoe.jpg"
      },
      "tags": ["typescript", "javascript", "programming"],
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-05T00:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
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
      "creator": {
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
Retrieve the most viewed posts.

- **URL:** `/trending`
- **Method:** `GET`
- **Authentication:** Not required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| limit | number | No | 5 | Number of posts to return |

**Example Request:**
```bash
curl -X GET "/v1/posts/trending?limit=5"
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
      "creator": {
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

- **URL:** `/mine`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 10 | Items per page |

**Example Request:**
```bash
curl -X GET "/v1/posts/mine?page=1&limit=10" \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  },
  "message": "My posts fetched successfully"
}
```

---

### 5. Get Posts by Tag
Retrieve all posts with a specific tag.

- **URL:** `/tag/:tag`
- **Method:** `GET`
- **Authentication:** Not required

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
  "message": "Posts by tag fetched successfully"
}
```

---

### 6. Get Posts by Username
Retrieve all posts by a specific user.

- **URL:** `/user/:username`
- **Method:** `GET`
- **Authentication:** Not required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 10 | Items per page |

**Example Request:**
```bash
curl -X GET "/v1/posts/user/johndoe?page=1&limit=10"
```

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  },
  "message": "Posts by johndoe fetched successfully"
}
```

---

### 7. Get Post by Slug
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
    "creator": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "username": "johndoe",
      "first_name": "John",
      "last_name": "Doe",
      "avatar_url": "https://example.com/avatars/johndoe.jpg",
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

### 8. Get Post by Username and Slug
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

### 9. Get All Posts (Admin)
Retrieve all posts including unpublished ones. Super admin only.

- **URL:** `/all`
- **Method:** `GET`
- **Authentication:** Required
- **Requires:** Super Admin role

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

### 10. Get Post by ID
Retrieve a single post by its ID.

- **URL:** `/:id`
- **Method:** `GET`
- **Authentication:** Not required

**Example Request:**
```bash
curl -X GET /v1/posts/550e8400-e29b-41d4-a716-446655440000
```

**Response (200):** Same as Get Post by Slug

---

### 11. Create Post
Create a new post.

- **URL:** `/`
- **Method:** `POST`
- **Authentication:** Required
- **Content-Type:** `application/json`

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
| body | string | Yes | 20-10000 characters |
| slug | string | Yes | 5-255 characters, URL-friendly |
| tags | array | No | Array of tag strings |
| photo_url | string | No | Default: "/images/default.jpg" |
| published | boolean | No | Default: true |

**Example Request:**
```bash
curl -X POST /v1/posts \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "My New Post", "body": "This is my new post content...", "slug": "my-new-post", "tags": ["news"], "published": true}'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "My New Post",
    "slug": "my-new-post",
    "...": "..."
  },
  "message": "Post created successfully"
}
```

---

### 12. Update Post
Update an existing post.

- **URL:** `/:id`
- **Method:** `PATCH`
- **Authentication:** Required
- **Content-Type:** `application/json`

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
| body | string | No | 20-10000 characters |
| slug | string | No | 5-255 characters |
| tags | array | No | Array of tag strings |
| photo_url | string | No | - |
| published | boolean | No | - |

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

### 13. Increment View Count
Increment the view count of a post.

- **URL:** `/:id/view`
- **Method:** `POST`
- **Authentication:** Not required

**Example Request:**
```bash
curl -X POST /v1/posts/550e8400-e29b-41d4-a716-446655440000/view
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "view_count": 1251
  },
  "message": "Post view incremented"
}
```

---

### 14. Delete Post
Delete a post.

- **URL:** `/:id`
- **Method:** `DELETE`
- **Authentication:** Required

**Example Request:**
```bash
curl -X DELETE /v1/posts/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Post deleted successfully"
}
```

---

### 15. Upload Image
Upload an image for a post to S3.

- **URL:** `/upload/image`
- **Method:** `POST`
- **Authentication:** Required
- **Content-Type:** `multipart/form-data`

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| image | File | Yes | Image file (JPEG, PNG, GIF, WebP) |

**Validation Rules:**
- Allowed types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Max size: 5MB

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

## Data Models

### Post Object

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique post identifier |
| title | string | Post title |
| slug | string | URL-friendly identifier |
| excerpt | string | Short preview of content |
| body | string | Full post content |
| photo_url | string | Featured image URL |
| published | boolean | Publication status |
| view_count | number | Number of views |
| like_count | number | Number of likes |
| is_liked | boolean | Whether current user liked |
| is_bookmarked | boolean | Whether current user bookmarked |
| creator | object | Post author information |
| creator.id | UUID | Author's user ID |
| creator.username | string | Author's username |
| creator.first_name | string | Author's first name |
| creator.last_name | string | Author's last name |
| creator.avatar_url | string | Author's avatar URL |
| creator.bio | string | Author's bio |
| creator.website | string | Author's website |
| tags | array | Array of tag strings |
| created_at | ISO 8601 | Creation timestamp |
| updated_at | ISO 8601 | Last update timestamp |

---

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Validation error message"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "You can only update your own posts"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Post not found"
}
```

---

## Implementation Example

### JavaScript/TypeScript

```typescript
// Fetch posts with pagination
async function getPosts(page = 1, limit = 10): Promise<{ data: Post[]; meta: PaginationMeta }> {
  const response = await fetch(`/v1/posts?page=${page}&limit=${limit}`);
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

// Increment view count
async function incrementView(postId: string): Promise<number> {
  const response = await fetch(`/v1/posts/${postId}/view`, {
    method: 'POST'
  });
  const result = await response.json();
  return result.data.view_count;
}
```

---

## Security Notes

- Image upload has strict file type and size validation
- Users can only modify their own posts
- Draft (unpublished) posts are only visible to the author
- View counts are incremented via separate endpoint to prevent abuse
- Rate limiting may apply to image uploads
