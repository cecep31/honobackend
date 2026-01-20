# Comments API Documentation

## Overview
The Comments API allows users to create, read, update, and delete comments on posts. It supports nested/threaded comments through the `parent_comment_id` field.

## Base URL
```
/v1/comments
```

## Endpoints

### 1. Create Comment
Create a new comment on a post.

**Endpoint:** `POST /v1/comments`

**Authentication:** Required

**Request Body:**
```json
{
  "text": "This is a comment",
  "post_id": "uuid-of-post",
  "parent_comment_id": 123  // Optional, for replies
}
```

**Validation:**
- `text`: Required, 1-5000 characters
- `post_id`: Required, valid UUID
- `parent_comment_id`: Optional, positive integer

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Comment created successfully",
  "data": {
    "id": "comment-uuid",
    "text": "This is a comment",
    "post_id": "post-uuid",
    "parent_comment_id": null,
    "created_by": "user-uuid",
    "created_at": "2026-01-08T08:00:00Z",
    "updated_at": "2026-01-08T08:00:00Z",
    "deleted_at": null,
    "user": {
      "id": "user-uuid",
      "username": "johndoe",
      "first_name": "John",
      "last_name": "Doe",
      "image": "https://example.com/avatar.jpg"
    }
  },
  "request_id": "req-uuid",
  "timestamp": "2026-01-08T08:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Post or parent comment not found

---

### 2. Get Comments by Post
Retrieve all top-level comments for a specific post (paginated).

**Endpoint:** `GET /v1/comments/post/:post_id`

**Authentication:** Not required

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Comments fetched successfully",
  "data": [
    {
      "id": "comment-uuid",
      "text": "Great post!",
      "post_id": "post-uuid",
      "parent_comment_id": null,
      "created_by": "user-uuid",
      "created_at": "2026-01-08T08:00:00Z",
      "updated_at": "2026-01-08T08:00:00Z",
      "deleted_at": null,
      "user": {
        "id": "user-uuid",
        "username": "johndoe",
        "first_name": "John",
        "last_name": "Doe",
        "image": "https://example.com/avatar.jpg"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  },
  "request_id": "req-uuid",
  "timestamp": "2026-01-08T08:00:00.000Z"
}
```

---

### 3. Get Comment Replies
Retrieve all replies to a specific comment.

**Endpoint:** `GET /v1/comments/:comment_id/replies`

**Authentication:** Not required

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Comment replies fetched successfully",
  "data": [
    {
      "id": "reply-uuid",
      "text": "I agree!",
      "post_id": "post-uuid",
      "parent_comment_id": 123,
      "created_by": "user-uuid",
      "created_at": "2026-01-08T08:05:00Z",
      "updated_at": "2026-01-08T08:05:00Z",
      "deleted_at": null,
      "user": {
        "id": "user-uuid",
        "username": "janedoe",
        "first_name": "Jane",
        "last_name": "Doe",
        "image": "https://example.com/avatar2.jpg"
      }
    }
  ],
  "request_id": "req-uuid",
  "timestamp": "2026-01-08T08:05:00.000Z"
}
```

---

### 4. Get Single Comment
Retrieve a specific comment by ID.

**Endpoint:** `GET /v1/comments/:comment_id`

**Authentication:** Not required

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Comment fetched successfully",
  "data": {
    "id": "comment-uuid",
    "text": "This is a comment",
    "post_id": "post-uuid",
    "parent_comment_id": null,
    "created_by": "user-uuid",
    "created_at": "2026-01-08T08:00:00Z",
    "updated_at": "2026-01-08T08:00:00Z",
    "deleted_at": null,
    "user": {
      "id": "user-uuid",
      "username": "johndoe",
      "first_name": "John",
      "last_name": "Doe",
      "image": "https://example.com/avatar.jpg"
    }
  },
  "request_id": "req-uuid",
  "timestamp": "2026-01-08T08:00:00.000Z"
}
```

**Error Responses:**
- `404 Not Found`: Comment not found

---

### 5. Update Comment
Update an existing comment (only by the comment owner).

**Endpoint:** `PUT /v1/comments/:comment_id`

**Authentication:** Required

**Request Body:**
```json
{
  "text": "Updated comment text"
}
```

**Validation:**
- `text`: Required, 1-5000 characters

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Comment updated successfully",
  "data": {
    "id": "comment-uuid",
    "text": "Updated comment text",
    "post_id": "post-uuid",
    "parent_comment_id": null,
    "created_by": "user-uuid",
    "created_at": "2026-01-08T08:00:00Z",
    "updated_at": "2026-01-08T08:10:00Z",
    "deleted_at": null,
    "user": {
      "id": "user-uuid",
      "username": "johndoe",
      "first_name": "John",
      "last_name": "Doe",
      "image": "https://example.com/avatar.jpg"
    }
  },
  "request_id": "req-uuid",
  "timestamp": "2026-01-08T08:10:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not the comment owner
- `404 Not Found`: Comment not found

---

### 6. Delete Comment
Soft delete a comment (only by the comment owner).

**Endpoint:** `DELETE /v1/comments/:comment_id`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Comment deleted successfully",
  "data": {
    "id": "comment-uuid",
    "text": "This is a comment",
    "post_id": "post-uuid",
    "parent_comment_id": null,
    "created_by": "user-uuid",
    "created_at": "2026-01-08T08:00:00Z",
    "updated_at": "2026-01-08T08:00:00Z",
    "deleted_at": "2026-01-08T08:15:00Z"
  },
  "request_id": "req-uuid",
  "timestamp": "2026-01-08T08:15:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not the comment owner
- `404 Not Found`: Comment not found

---

### 7. Get Comments by User
Retrieve all comments made by a specific user (paginated).

**Endpoint:** `GET /v1/comments/user/:user_id`

**Authentication:** Not required

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User comments fetched successfully",
  "data": [
    {
      "id": "comment-uuid",
      "text": "Great post!",
      "post_id": "post-uuid",
      "parent_comment_id": null,
      "created_by": "user-uuid",
      "created_at": "2026-01-08T08:00:00Z",
      "updated_at": "2026-01-08T08:00:00Z",
      "deleted_at": null,
      "user": {
        "id": "user-uuid",
        "username": "johndoe",
        "first_name": "John",
        "last_name": "Doe",
        "image": "https://example.com/avatar.jpg"
      },
      "post": {
        "id": "post-uuid",
        "title": "Post Title",
        "slug": "post-title"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  },
  "request_id": "req-uuid",
  "timestamp": "2026-01-08T08:00:00.000Z"
}
```

---

## Features

### Nested Comments
Comments support threading through the `parent_comment_id` field:
- Top-level comments have `parent_comment_id: null`
- Replies have `parent_comment_id` set to the parent comment's ID
- Use the `/replies` endpoint to fetch nested comments

### Soft Deletion
Comments are soft-deleted (marked with `deleted_at` timestamp) rather than permanently removed from the database.

### Pagination
List endpoints support pagination with `page` and `limit` query parameters.

### Authorization
- Creating comments requires authentication
- Updating/deleting comments requires ownership (user must be the comment creator)
- Reading comments is public (no authentication required)

## Database Schema

```sql
CREATE TABLE post_comments (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  text TEXT,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  parent_comment_id BIGINT,
  created_by UUID REFERENCES users(id),
  -- Indexes for performance
  INDEX idx_post_comments_post_id (post_id),
  INDEX idx_post_comments_created_by (created_by),
  INDEX idx_post_comments_parent_id (parent_comment_id),
  INDEX idx_post_comments_deleted_at (deleted_at)
);
```

## Example Usage

### Creating a Top-Level Comment
```bash
curl -X POST http://localhost:3000/v1/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is an insightful post!",
    "post_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Creating a Reply
```bash
curl -X POST http://localhost:3000/v1/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I agree with your point!",
    "post_id": "550e8400-e29b-41d4-a716-446655440000",
    "parent_comment_id": 123
  }'
```

### Getting Comments for a Post
```bash
curl http://localhost:3000/v1/comments/post/550e8400-e29b-41d4-a716-446655440000?page=1&limit=20
```

### Updating a Comment
```bash
curl -X PUT http://localhost:3000/v1/comments/comment-uuid \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Updated comment text"
  }'
```

### Deleting a Comment
```bash
curl -X DELETE http://localhost:3000/v1/comments/comment-uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```
