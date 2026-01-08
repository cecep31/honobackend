# Comments Module

## Overview
The Comments module provides functionality for creating, reading, updating, and deleting comments on posts. It supports nested/threaded comments through parent-child relationships.

## Structure

```
src/modules/comments/
├── commentController.ts    # HTTP request handlers
├── commentService.ts       # Business logic
├── validation/
│   └── comment.ts         # Zod validation schemas
└── README.md              # This file
```

## Features

- ✅ Create comments on posts
- ✅ Create nested replies to comments
- ✅ Get comments by post (paginated)
- ✅ Get replies to a comment
- ✅ Get single comment by ID
- ✅ Update own comments
- ✅ Delete own comments (soft delete)
- ✅ Get all comments by user (paginated)
- ✅ Authorization checks (ownership validation)
- ✅ Comprehensive error handling
- ✅ Full test coverage

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/v1/comments` | ✓ | Create a new comment |
| GET | `/v1/comments/post/:post_id` | ✗ | Get comments for a post |
| GET | `/v1/comments/:comment_id/replies` | ✗ | Get replies to a comment |
| GET | `/v1/comments/:comment_id` | ✗ | Get single comment |
| PUT | `/v1/comments/:comment_id` | ✓ | Update comment (owner only) |
| DELETE | `/v1/comments/:comment_id` | ✓ | Delete comment (owner only) |
| GET | `/v1/comments/user/:user_id` | ✗ | Get user's comments |

## Database Schema

The module uses the `post_comments` table:

```typescript
{
  id: uuid (primary key)
  created_at: timestamp
  updated_at: timestamp
  deleted_at: timestamp (for soft delete)
  text: text
  post_id: uuid (foreign key to posts)
  parent_comment_id: bigint (for nested comments)
  created_by: uuid (foreign key to users)
}
```

### Indexes
- `idx_post_comments_post_id` - Fast lookup by post
- `idx_post_comments_created_by` - Fast lookup by user
- `idx_post_comments_parent_id` - Fast lookup of replies
- `idx_post_comments_deleted_at` - Efficient soft delete filtering

## Usage Examples

### Creating a Comment

```typescript
// POST /v1/comments
{
  "text": "Great article!",
  "post_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Creating a Reply

```typescript
// POST /v1/comments
{
  "text": "I agree!",
  "post_id": "550e8400-e29b-41d4-a716-446655440000",
  "parent_comment_id": 123
}
```

### Getting Comments

```typescript
// GET /v1/comments/post/550e8400-e29b-41d4-a716-446655440000?page=1&limit=20
```

## Service Methods

### `createComment(data, user_id)`
Creates a new comment or reply.
- Validates post exists
- Validates parent comment exists (if replying)
- Returns comment with user details

### `getCommentsByPost(post_id, page, limit)`
Gets top-level comments for a post (paginated).
- Only returns comments with no parent
- Includes user details
- Returns pagination metadata

### `getCommentReplies(parent_comment_id)`
Gets all replies to a specific comment.
- Returns nested comments
- Includes user details

### `getCommentById(comment_id)`
Gets a single comment by ID.
- Returns comment with user details
- Throws 404 if not found

### `updateComment(comment_id, data, user_id)`
Updates a comment.
- Validates ownership
- Updates text and timestamp
- Returns updated comment with user details

### `deleteComment(comment_id, user_id)`
Soft deletes a comment.
- Validates ownership
- Sets deleted_at timestamp
- Returns deleted comment

### `getCommentsByUser(user_id, page, limit)`
Gets all comments by a user (paginated).
- Includes post details
- Returns pagination metadata

## Validation

### Create Comment Schema
```typescript
{
  text: string (1-5000 chars, required)
  post_id: uuid (required)
  parent_comment_id: number (optional, positive integer)
}
```

### Update Comment Schema
```typescript
{
  text: string (1-5000 chars, required)
}
```

## Error Handling

The module uses standardized error responses:

- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Not authorized (not comment owner)
- `404 Not Found` - Comment or post not found
- `500 Internal Server Error` - Server errors

## Testing

Run tests with:
```bash
bun test src/test/commentservice.test.ts
```

Test coverage includes:
- ✅ Creating comments
- ✅ Creating replies
- ✅ Getting comments by post
- ✅ Getting comment by ID
- ✅ Updating comments
- ✅ Deleting comments
- ✅ Authorization checks
- ✅ Error scenarios

## Dependencies

- `drizzle-orm` - Database ORM
- `zod` - Schema validation
- `hono` - Web framework
- `bun` - Runtime and UUID generation

## Integration

The module is integrated into the main application through:

1. **Service Registration** - [`src/services/index.ts`](../../services/index.ts)
2. **Route Registration** - [`src/router/index.ts`](../../router/index.ts)
3. **Middleware** - Uses `auth` and `validateRequest` middlewares

## Future Enhancements

Potential improvements:
- [ ] Comment reactions/likes
- [ ] Comment moderation features
- [ ] Comment notifications
- [ ] Rich text/markdown support
- [ ] Comment edit history
- [ ] Comment reporting
- [ ] Pagination for nested replies
- [ ] Comment search functionality
