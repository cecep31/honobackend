# Likes API Documentation

The Likes API provides endpoints for users to like/unlike posts and retrieve like information.

**Base URL:** `/v1/likes`

---

## Authentication

All endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Toggle Like
Add or remove a like from a post. If the post is already liked, it will be unliked.

- **URL:** `/:post_id`
- **Method:** `POST`
- **Authentication:** Required

**Example Request:**
```bash
curl -X POST /v1/likes/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "liked": true,
    "post_id": "550e8400-e29b-41d4-a716-446655440000",
    "total_likes": 42
  },
  "message": "Like updated successfully"
}
```

**Response (when unliked):**
```json
{
  "success": true,
  "data": {
    "liked": false,
    "post_id": "550e8400-e29b-41d4-a716-446655440000",
    "total_likes": 41
  },
  "message": "Like updated successfully"
}
```

---

### 2. Get Post Likes
Retrieve the total like count and list of users who liked a post.

- **URL:** `/:post_id`
- **Method:** `GET`
- **Authentication:** Required

**Example Request:**
```bash
curl -X GET /v1/likes/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "post_id": "550e8400-e29b-41d4-a716-446655440000",
    "total_likes": 42,
    "liked_by_current_user": true,
    "users": [
      {
        "user_id": "550e8400-e29b-41d4-a716-446655440001",
        "username": "johndoe",
        "first_name": "John",
        "last_name": "Doe",
        "avatar_url": "https://example.com/avatars/johndoe.jpg",
        "liked_at": "2026-01-01T00:00:00Z"
      },
      {
        "user_id": "550e8400-e29b-41d4-a716-446655440002",
        "username": "janedoe",
        "first_name": "Jane",
        "last_name": "Doe",
        "avatar_url": "https://example.com/avatars/janedoe.jpg",
        "liked_at": "2026-01-02T00:00:00Z"
      }
    ]
  },
  "message": "Likes fetched successfully"
}
```

---

## Data Models

### Like Response Object

| Field | Type | Description |
|-------|------|-------------|
| post_id | UUID | ID of the post |
| total_likes | number | Total number of likes |
| liked_by_current_user | boolean | Whether the current user has liked this post |
| users | array | List of users who liked the post |

### User Like Object

| Field | Type | Description |
|-------|------|-------------|
| user_id | UUID | User's unique identifier |
| username | string | User's username |
| first_name | string | User's first name |
| last_name | string | User's last name |
| avatar_url | string | URL to user's avatar |
| liked_at | ISO 8601 | When the like was created |

---

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Invalid post_id format"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required"
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
// Toggle a like on a post
async function toggleLike(postId: string): Promise<{ liked: boolean; total_likes: number }> {
  const response = await fetch(`/v1/likes/${postId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const result = await response.json();
  return result.data;
}

// Get like information for a post
async function getPostLikes(postId: string): Promise<LikeInfo> {
  const response = await fetch(`/v1/likes/${postId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const result = await response.json();
  return result.data;
}
```

### React Component Example

```tsx
import { useState, useCallback } from 'react';

interface LikeButtonProps {
  postId: string;
  initialLikes: number;
  initialLiked: boolean;
}

function LikeButton({ postId, initialLikes, initialLiked }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [loading, setLoading] = useState(false);

  const handleLike = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/v1/likes/${postId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const { data } = await response.json();
      setLiked(data.liked);
      setLikeCount(data.total_likes);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`like-button ${liked ? 'liked' : ''}`}
    >
      <span className="icon">{liked ? '❤️' : '🤍'}</span>
      <span className="count">{likeCount}</span>
    </button>
  );
}
```

---

## Integration with Posts

When fetching posts, the like information is typically included in the post response:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My Blog Post",
  "body": "...",
  "like_count": 42,
  "is_liked_by_current_user": true,
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

## Security Notes

- All endpoints require authentication
- Users can only like/unlike posts they haven't created
- Like counts are updated atomically to prevent race conditions
- Users can only see like information for posts they have access to
