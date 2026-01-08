# Bookmarks API Documentation

The Bookmarks API provides endpoints for users to bookmark and manage their favorite posts.

**Base URL:** `/v1/bookmarks`

---

## Authentication

All endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Toggle Bookmark
Add or remove a bookmark for a post. If the post is already bookmarked, it will be unbookmarked.

- **URL:** `/:post_id`
- **Method:** `POST`
- **Authentication:** Required

**Example Request:**
```bash
curl -X POST /v1/bookmarks/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "bookmarked": true,
    "post_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "message": "Bookmark toggled successfully"
}
```

**Response (when unbookmarked):**
```json
{
  "success": true,
  "data": {
    "bookmarked": false,
    "post_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "message": "Bookmark toggled successfully"
}
```

---

### 2. Get User Bookmarks
Retrieve all bookmarks for the authenticated user.

- **URL:** `/`
- **Method:** `GET`
- **Authentication:** Required

**Example Request:**
```bash
curl -X GET /v1/bookmarks \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "post_id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Getting Started with TypeScript",
      "slug": "getting-started-typescript",
      "excerpt": "Learn how to get started with TypeScript...",
      "photo_url": "/images/posts/typescript-guide.jpg",
      "creator": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "username": "johndoe",
        "first_name": "John",
        "last_name": "Doe"
      },
      "created_at": "2026-01-01T00:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "post_id": "550e8400-e29b-41d4-a716-446655440004",
      "title": "Advanced React Patterns",
      "slug": "advanced-react-patterns",
      "excerpt": "Explore advanced React patterns...",
      "photo_url": "/images/posts/react-patterns.jpg",
      "creator": {
        "id": "550e8400-e29b-41d4-a716-446655440005",
        "username": "janedoe",
        "first_name": "Jane",
        "last_name": "Doe"
      },
      "created_at": "2026-01-02T00:00:00Z"
    }
  ],
  "message": "Bookmarks fetched successfully"
}
```

---

## Data Models

### Bookmark Response Object

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique bookmark identifier |
| post_id | UUID | ID of the bookmarked post |
| title | string | Post title |
| slug | string | URL-friendly post identifier |
| excerpt | string | Short preview of post content |
| photo_url | string | Featured image URL |
| creator | object | Post author information |
| creator.id | UUID | Author's user ID |
| creator.username | string | Author's username |
| creator.first_name | string | Author's first name |
| creator.last_name | string | Author's last name |
| created_at | ISO 8601 | When the bookmark was created |

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
// Toggle a bookmark
async function toggleBookmark(postId: string): Promise<{ bookmarked: boolean }> {
  const response = await fetch(`/v1/bookmarks/${postId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const result = await response.json();
  return result.data;
}

// Get all bookmarks
async function getBookmarks(): Promise<Bookmark[]> {
  const response = await fetch('/v1/bookmarks', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const result = await response.json();
  return result.data;
}
```

### React Hook Example

```typescript
import { useState, useCallback } from 'react';

function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleBookmark = useCallback(async (postId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/v1/bookmarks/${postId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const { data } = await response.json();
      if (data.bookmarked) {
        setBookmarks(prev => [...prev, data]);
      } else {
        setBookmarks(prev => prev.filter(b => b.post_id !== postId));
      }
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/v1/bookmarks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const { data } = await response.json();
      setBookmarks(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { bookmarks, loading, toggleBookmark, fetchBookmarks };
}
```

---

## Security Notes

- All endpoints require authentication
- Users can only access their own bookmarks
- Bookmark operations are validated against the authenticated user
