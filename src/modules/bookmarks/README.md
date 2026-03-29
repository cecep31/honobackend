# Bookmarks API Documentation

The Bookmarks API provides endpoints for users to bookmark and organize their favorite posts into folders.

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
Add or remove a bookmark for a post. If the post is already bookmarked, it will be removed.

- **URL:** `/:post_id`
- **Method:** `POST`
- **Authentication:** Required
- **Body (optional):**
```json
{
  "folder_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Custom Name",
  "notes": "Read this later"
}
```

**Example Request:**
```bash
curl -X POST /v1/bookmarks/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"folder_id": "...", "name": "Important Article"}'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "action": "added",
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "post_id": "550e8400-e29b-41d4-a716-446655440001",
    "user_id": "550e8400-e29b-41d4-a716-446655440003",
    "folder_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Important Article",
    "notes": null,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  "message": "Bookmark toggled successfully"
}
```

---

### 2. Get User Bookmarks
Retrieve all bookmarks for the authenticated user, optionally filtered by folder.

- **URL:** `/`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**
  - `folder_id` (optional): Filter by folder ID. Use `null` for bookmarks without folder.

**Example Request:**
```bash
# All bookmarkscurl -X GET /v1/bookmarks \
  -H "Authorization: Bearer <your_token>"

# Bookmarks in specific folder
curl -X GET /v1/bookmarks?folder_id=550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>"

# Bookmarks without folder
curl -X GET /v1/bookmarks?folder_id=null \
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
      "user_id": "550e8400-e29b-41d4-a716-446655440002",
      "folder_id": "550e8400-e29b-41d4-a716-446655440003",
      "name": "Custom Bookmark Name",
      "notes": "My notes about this post",
      "post": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "title": "Getting Started with TypeScript",
        "slug": "getting-started-typescript",
        "body": "Learn how to get started with TypeScript...",
        "photo_url": "/images/posts/typescript-guide.jpg",
        "user": {
          "id": "550e8400-e29b-41d4-a716-446655440004",
          "username": "johndoe",
          "first_name": "John",
          "last_name": "Doe",
          "image": "/avatars/john.jpg"
        }
      },
      "folder": {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "name": "Nonton Nanti",
        "description": "Articles to read later"
      },
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ],
  "message": "Bookmarks fetched successfully"
}
```

---

### 3. Update Bookmark
Update bookmark name or notes.

- **URL:** `/:bookmark_id`
- **Method:** `PATCH`
- **Authentication:** Required
- **Body:**
```json
{
  "name": "Updated Name",
  "notes": "Updated notes"
}
```

**Example Request:**
```bash
curl -X PATCH /v1/bookmarks/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name", "notes": "New notes"}'
```

---

### 4. Move Bookmark to Folder
Move a bookmark to a different folder.

- **URL:** `/:bookmark_id/move`
- **Method:** `PATCH`
- **Authentication:** Required
- **Body:**
```json
{
  "folder_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Example Request:**
```bash
# Move to folder
curl -X PATCH /v1/bookmarks/550e8400-e29b-41d4-a716-446655440000/move \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"folder_id": "550e8400-e29b-41d4-a716-446655440001"}'

# Remove from folder (set to null)
curl -X PATCH /v1/bookmarks/550e8400-e29b-41d4-a716-446655440000/move \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"folder_id": null}'
```

---

## Folder Endpoints

### 5. Create Folder
Create a new bookmark folder.

- **URL:** `/folders`
- **Method:** `POST`
- **Authentication:** Required
- **Body:**
```json
{
  "name": "Nonton Nanti",
  "description": "Articles to read later"
}
```

**Example Request:**
```bash
curl -X POST /v1/bookmarks/folders \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Important", "description": "Must read"}'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Important",
    "description": "Must read",
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  "message": "Folder created successfully"
}
```

---

### 6. Get User Folders
Retrieve all folders for the authenticated user with bookmark counts.

- **URL:** `/folders`
- **Method:** `GET`
- **Authentication:** Required

**Example Request:**
```bash
curl -X GET /v1/bookmarks/folders \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Nonton Nanti",
      "description": "Articles to read later",
      "bookmark_count": 5,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "user_id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Important",
      "description": "Must read articles",
      "bookmark_count": 3,
      "created_at": "2026-01-02T00:00:00Z",
      "updated_at": "2026-01-02T00:00:00Z"
    }
  ],
  "message": "Folders fetched successfully"
}
```

---

### 7. Update Folder
Update folder name or description.

- **URL:** `/folders/:folder_id`
- **Method:** `PATCH`
- **Authentication:** Required
- **Body:**
```json
{
  "name": "Updated Folder Name",
  "description": "Updated description"
}
```

**Example Request:**
```bash
curl -X PATCH /v1/bookmarks/folders/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Watch Later"}'
```

---

### 8. Delete Folder
Delete a folder. Bookmarks in the folder will remain but become ungrouped (folder_id set to null).

- **URL:** `/folders/:folder_id`
- **Method:** `DELETE`
- **Authentication:** Required

**Example Request:**
```bash
curl -X DELETE /v1/bookmarks/folders/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Important"
  },
  "message": "Folder deleted successfully"
}
```

---

## Data Models

### Bookmark Object

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique bookmark identifier |
| post_id | UUID | ID of the bookmarked post |
| user_id | UUID | ID of the bookmark owner |
| folder_id | UUID | ID of the folder (nullable) |
| name | string | Custom name for the bookmark (optional) |
| notes | string | Personal notes about the bookmark |
| post | object | Full post data with author |
| folder | object | Folder info (if in a folder) |
| created_at | ISO 8601 | When the bookmark was created |
| updated_at | ISO 8601 | When the bookmark was last updated |

### Folder Object

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique folder identifier |
| user_id | UUID | ID of the folder owner |
| name | string | Folder name (max 100 chars) |
| description | string | Folder description (optional) |
| bookmark_count | number | Number of bookmarks in folder |
| created_at | ISO 8601 | When the folder was created |
| updated_at | ISO 8601 | When the folder was last updated |

---

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [{ "field": "name", "message": "Required" }]
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
  "error": "Folder not found"
}
```

---

## Implementation Examples

### Create Folder and Add Bookmark

```typescript
// Create a folder
const createFolder = async (name: string, description?: string) => {
  const response = await fetch('/v1/bookmarks/folders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, description })
  });
  return response.json();
};

// Add bookmark to folder
const addBookmark = async (
  postId: string,
  folderId: string,
  name?: string
) => {
  const response = await fetch(`/v1/bookmarks/${postId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ folder_id: folderId, name })
  });
  return response.json();
};

// Get bookmarks by folder
const getBookmarksByFolder = async (folderId?: string) => {
  const url = folderId
    ? `/v1/bookmarks?folder_id=${folderId}`
    : '/v1/bookmarks';
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

---

## Security Notes

- All endpoints require authentication
- Users can only access their own bookmarks and folders
- Folder names must be unique per user
- Deleting a folder does not delete the bookmarks (they become ungrouped)
