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

**Response (200) - Like created:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "post_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "created_at": "2026-04-08T10:30:00Z"
  },
  "message": "Like updated successfully",
  "request_id": "abc-123",
  "timestamp": "2026-04-08T10:30:00.000Z"
}
```

**Response (200) - Like removed:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "post_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "created_at": "2026-04-08T10:30:00Z"
  },
  "message": "Like updated successfully",
  "request_id": "abc-123",
  "timestamp": "2026-04-08T10:30:00.000Z"
}
```

**Note:** When a like is removed, the `data` field may be `null` or `undefined` depending on the database driver behavior.

---

### 2. Get Post Likes
Retrieve the list of likes for a post.

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
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "created_at": "2026-04-08T10:30:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "created_at": "2026-04-08T11:00:00Z"
    }
  ],
  "message": "Likes fetched successfully",
  "request_id": "abc-123",
  "timestamp": "2026-04-08T11:30:00.000Z"
}
```

---

## Data Models

### Like Record Object

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier for the like record |
| post_id | UUID | ID of the post |
| user_id | UUID | ID of the user who liked the post |
| created_at | ISO 8601 | Timestamp when the like was created |

---

## Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required",
  "error": {
    "code": "AUTH_001"
  },
  "request_id": "abc-123",
  "timestamp": "2026-04-08T10:30:00.000Z"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error",
  "error": {
    "code": "SYS_001"
  },
  "request_id": "abc-123",
  "timestamp": "2026-04-08T10:30:00.000Z"
}
```

---

## Implementation Example

### JavaScript/TypeScript

```typescript
// Toggle a like on a post
async function toggleLike(postId: string) {
  const response = await fetch(`/v1/likes/${postId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const result = await response.json();
  return result.data;
}

// Get likes for a post
async function getPostLikes(postId: string) {
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
  initialLiked: boolean;
}

function LikeButton({ postId, initialLiked }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
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
      // If data exists, like was created; if null/undefined, like was removed
      setLiked(!!data);
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
    </button>
  );
}
```

---

## Database Schema

The `post_likes` table structure:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique like identifier |
| post_id | UUID | FK → posts.id, NOT NULL | Reference to the post |
| user_id | UUID | FK → users.id, NOT NULL | Reference to the user |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | When the like was created |

**Indexes:**
- `idx_post_likes_post_id` - Fast lookup by post
- `idx_post_likes_user_id` - Fast lookup by user
- `idx_post_likes_unique_user_post` - Unique constraint on (post_id, user_id) pair
- `idx_post_likes_created_at` - Sort by creation time
- `idx_post_likes_post_created_at` - Composite index for post + time queries

---

## Technical Notes

- **Transaction Safety**: Like toggles are wrapped in database transactions to ensure atomicity
- **Unique Constraint**: The database enforces one like per user per post via unique index
- **Cascade Deletes**: Likes are automatically deleted when the associated post or user is deleted
- **Soft Deletes**: This module does not implement soft deletes for likes

---

## Future Enhancements

Potential improvements for the likes API:

- [ ] Return like count in POST response
- [ ] Include `liked` boolean flag in POST response
- [ ] Add user details to GET response (join with users table)
- [ ] Add pagination for GET `/v1/likes/:post_id`
- [ ] Add validation for non-existent posts
- [ ] Prevent users from liking their own posts
- [ ] Add bulk like endpoints for multiple posts

---

## Related Modules

- **Posts**: Posts include like counts and `is_liked_by_current_user` fields in responses
- **Comments**: Comments may also have like functionality in the future
- **Analytics**: Like data can be used for engagement metrics
