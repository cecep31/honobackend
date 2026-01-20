# Tags API Documentation

The Tags API provides endpoints for retrieving available tags used in posts.

**Base URL:** `/v1/tags`

---

## Authentication

All endpoints are public (no authentication required).

---

## Endpoints

### 1. Get All Tags
Retrieve all available tags used in published posts.

- **URL:** `/`
- **Method:** `GET`
- **Authentication:** Not required

**Example Request:**
```bash
curl -X GET /v1/tags
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "typescript",
      "slug": "typescript",
      "post_count": 45
    },
    {
      "id": 2,
      "name": "javascript",
      "slug": "javascript",
      "post_count": 89
    },
    {
      "id": 3,
      "name": "react",
      "slug": "react",
      "post_count": 67
    },
    {
      "id": 4,
      "name": "nodejs",
      "slug": "nodejs",
      "post_count": 34
    },
    {
      "id": 5,
      "name": "python",
      "slug": "python",
      "post_count": 28
    }
  ],
  "message": "Tags fetched successfully"
}
```

---

## Data Models

### Tag Object

| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique tag identifier |
| name | string | Tag name (display format) |
| slug | string | URL-friendly tag identifier |
| post_count | number | Number of posts with this tag |

---

## Error Responses

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Failed to fetch tags"
}
```

---

## Implementation Example

### JavaScript/TypeScript

```typescript
// Fetch all tags
async function getTags(): Promise<Tag[]> {
  const response = await fetch('/v1/tags');
  const result = await response.json();
  return result.data;
}

// Get popular tags (sorted by post_count)
async function getPopularTags(limit = 10): Promise<Tag[]> {
  const response = await fetch('/v1/tags');
  const result = await response.json();
  return result.data
    .sort((a: Tag, b: Tag) => b.post_count - a.post_count)
    .slice(0, limit);
}
```

### React Component Example

```tsx
import { useState, useEffect } from 'react';

interface Tag {
  id: number;
  name: string;
  slug: string;
  post_count: number;
}

function TagCloud() {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    fetch('/v1/tags')
      .then(res => res.json())
      .then(result => setTags(result.data));
  }, []);

  return (
    <div className="tag-cloud">
      {tags.map(tag => (
        <a
          key={tag.id}
          href={`/posts/tag/${tag.slug}`}
          className="tag"
          style={{ fontSize: `${Math.min(12 + tag.post_count / 5, 24)}px` }}
        >
          {tag.name}
          <span className="count">{tag.post_count}</span>
        </a>
      ))}
    </div>
  );
}
```

---

## Usage with Posts

Tags are used in posts to categorize content. To fetch posts by tag:

```bash
curl -X GET /v1/posts/tag/typescript
```

See [Posts API](../posts/README.md) for more information.

---

## Notes

- Tags are automatically created when posts are created with new tag names
- Tag names are normalized to lowercase with spaces replaced by hyphens
- The `post_count` reflects only published posts
