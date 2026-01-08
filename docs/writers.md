# Writers API Documentation

The Writers API provides public endpoints for retrieving writer/author profiles and their posts.

**Base URL:** `/v1/writers`

---

## Authentication

All endpoints are public (no authentication required).

---

## Endpoints

### 1. Get Writer Profile
Retrieve a writer's public profile by their username.

- **URL:** `/:username`
- **Method:** `GET`
- **Authentication:** Not required

**Example Request:**
```bash
curl -X GET /v1/writers/johndoe
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "first_name": "John",
    "last_name": "Doe",
    "avatar_url": "https://example.com/avatars/johndoe.jpg",
    "bio": "Full stack developer passionate about TypeScript and Node.js",
    "website": "https://johndoe.com",
    "social": {
      "twitter": "johndoe",
      "github": "johndoe",
      "linkedin": "johndoe"
    },
    "stats": {
      "total_posts": 25,
      "total_views": 15000,
      "total_likes": 500,
      "avg_read_time": 5.2
    },
    "top_tags": ["typescript", "javascript", "nodejs", "react"],
    "created_at": "2025-01-01T00:00:00Z"
  },
  "message": "Writer profile fetched successfully"
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "Writer not found"
}
```

---

### 2. Get Writer Posts
Retrieve all published posts by a specific writer.

- **URL:** `/:username/posts`
- **Method:** `GET`
- **Authentication:** Not required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 10 | Items per page |

**Example Request:**
```bash
curl -X GET "/v1/writers/johndoe/posts?page=1&limit=10"
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
      "excerpt": "Learn how to get started with TypeScript in this comprehensive guide...",
      "photo_url": "/images/posts/typescript-guide.jpg",
      "view_count": 1250,
      "like_count": 89,
      "read_time": 8,
      "tags": ["typescript", "javascript"],
      "created_at": "2026-01-01T00:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Building REST APIs with Hono",
      "slug": "building-rest-apis-hono",
      "excerpt": "Learn how to build fast and lightweight REST APIs using Hono...",
      "photo_url": "/images/posts/hono-api.jpg",
      "view_count": 980,
      "like_count": 67,
      "read_time": 6,
      "tags": ["hono", "api", "nodejs"],
      "created_at": "2026-01-05T00:00:00Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  },
  "message": "Writer posts fetched successfully"
}
```

---

## Data Models

### Writer Profile Object

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique writer identifier |
| username | string | Writer's unique username |
| first_name | string | Writer's first name |
| last_name | string | Writer's last name |
| avatar_url | string | URL to writer's avatar |
| bio | string | Writer's biography |
| website | string | Writer's website URL |
| social | object | Social media links |
| social.twitter | string | Twitter handle |
| social.github | string | GitHub username |
| social.linkedin | string | LinkedIn profile slug |
| stats | object | Writer statistics |
| stats.total_posts | number | Total published posts |
| stats.total_views | number | Total views on all posts |
| stats.total_likes | number | Total likes on all posts |
| stats.avg_read_time | number | Average post read time in minutes |
| top_tags | array | Writer's most used tags |
| created_at | ISO 8601 | Account creation timestamp |

### Writer Post Preview Object

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Post identifier |
| title | string | Post title |
| slug | string | URL-friendly post identifier |
| excerpt | string | Short preview of post content |
| photo_url | string | Featured image URL |
| view_count | number | Number of views |
| like_count | number | Number of likes |
| read_time | number | Estimated read time in minutes |
| tags | array | Post tags |
| created_at | ISO 8601 | Post creation timestamp |

---

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Invalid username format"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Writer not found"
}
```

---

## Implementation Example

### JavaScript/TypeScript

```typescript
// Fetch writer profile
async function getWriterProfile(username: string): Promise<WriterProfile> {
  const response = await fetch(`/v1/writers/${username}`);
  const result = await response.json();
  return result.data;
}

// Fetch writer's posts
async function getWriterPosts(
  username: string,
  page = 1,
  limit = 10
): Promise<{ data: WriterPost[]; meta: PaginationMeta }> {
  const response = await fetch(`/v1/writers/${username}/posts?page=${page}&limit=${limit}`);
  const result = await response.json();
  return result;
}
```

### React Component Example

```tsx
import { useState, useEffect } from 'react';

interface WriterProfile {
  username: string;
  bio: string;
  avatar_url: string;
  stats: {
    total_posts: number;
    total_views: number;
  };
  top_tags: string[];
}

interface WriterPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  view_count: number;
  like_count: number;
  created_at: string;
}

function WriterProfilePage({ username }: { username: string }) {
  const [profile, setProfile] = useState<WriterProfile | null>(null);
  const [posts, setPosts] = useState<WriterPost[]>([]);

  useEffect(() => {
    // Fetch profile
    fetch(`/v1/writers/${username}`)
      .then(res => res.json())
      .then(result => setProfile(result.data));

    // Fetch posts
    fetch(`/v1/writers/${username}/posts`)
      .then(res => res.json())
      .then(result => setPosts(result.data));
  }, [username]);

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="writer-profile">
      <img src={profile.avatar_url} alt={profile.username} />
      <h1>{profile.username}</h1>
      <p>{profile.bio}</p>
      <div className="stats">
        <span>{profile.stats.total_posts} posts</span>
        <span>{profile.stats.total_views} views</span>
      </div>
      <div className="tags">
        {profile.top_tags.map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
      <div className="posts">
        {posts.map(post => (
          <article key={post.id}>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
```

---

## Use Cases

### Writer Landing Page
Display a complete writer profile with their stats, bio, and recent posts.

### Writer Directory
Create a directory of all writers with their statistics.

### Post Attribution
Link posts back to their author's writer profile.

---

## Notes

- Writer profiles are automatically created when users publish their first post
- Stats are calculated from published posts only
- Private/draft posts are not included in statistics
- Writer pages are SEO-friendly and shareable
