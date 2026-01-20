# Users API Documentation

The Users API provides endpoints for managing user profiles and accounts.

**Base URL:** `/v1/users`

---

## Authentication

Most endpoints require authentication. Super admin endpoints require the Super Admin role.

Protected endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Get All Users
Retrieve a paginated list of all users. Super admin only.

- **URL:** `/`
- **Method:** `GET`
- **Authentication:** Required
- **Requires:** Super Admin role
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 10 | Items per page |

**Example Request:**
```bash
curl -X GET "/v1/users?page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "johndoe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "avatar_url": "https://example.com/avatars/johndoe.jpg",
      "role": "user",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  },
  "message": "Users fetched successfully"
}
```

---

### 2. Get Current User Profile
Retrieve the authenticated user's profile.

- **URL:** `/me`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| profile | boolean | No | false | Return extended profile data |

**Example Request:**
```bash
curl -X GET /v1/users/me \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "avatar_url": "https://example.com/avatars/johndoe.jpg",
    "bio": "Full stack developer",
    "website": "https://johndoe.com",
    "role": "user",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  "message": "User profile fetched successfully"
}
```

**Response (with profile=true):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name.doe",
    "avatar_url": "https://example.com/avatars/johndoe.jpg",
    "bio": "Full stack developer",
    "website": "https://johndoe.com",
    "role": "user",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
    "stats": {
      "total_posts": 25,
      "total_views": 15000,
      "total_likes": 500,
      "total_bookmarks": 10
    },
    "posts": [...]
  },
  "message": "User profile fetched successfully"
}
```

---

### 3. Get User by ID
Retrieve a user by their ID.

- **URL:** `/:id`
- **Method:** `GET`
- **Authentication:** Required

**Example Request:**
```bash
curl -X GET /v1/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>"
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
    "bio": "Full stack developer",
    "created_at": "2025-01-01T00:00:00Z"
  },
  "message": "User fetched successfully"
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

### 4. Create User (Admin)
Create a new user. Super admin only.

- **URL:** `/`
- **Method:** `POST`
- **Authentication:** Required
- **Requires:** Super Admin role
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123",
  "first_name": "New",
  "last_name": "User"
}
```

**Validation Rules:**
| Field | Type | Required | Rules |
|-------|------|----------|-------|
| username | string | Yes | 3-20 chars, alphanumeric + underscore |
| email | string | Yes | Valid email format |
| password | string | Yes | Min 6 chars |
| first_name | string | No | - |
| last_name | string | No | - |

**Example Request:**
```bash
curl -X POST /v1/users \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser", "email": "newuser@example.com", "password": "password123"}'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "username": "newuser",
    "email": "newuser@example.com",
    "first_name": "",
    "last_name": "",
    "role": "user",
    "created_at": "2026-01-08T00:00:00Z"
  },
  "message": "User created successfully"
}
```

---

### 5. Delete User (Admin)
Delete a user. Super admin only.

- **URL:** `/:id`
- **Method:** `DELETE`
- **Authentication:** Required
- **Requires:** Super Admin role

**Example Request:**
```bash
curl -X DELETE /v1/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <admin_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "User deleted successfully"
}
```

---

### 6. Follow User
Follow another user.

- **URL:** `/:id/follow`
- **Method:** `POST`
- **Authentication:** Required

**Example Request:**
```bash
curl -X POST /v1/users/550e8400-e29b-41d4-a716-446655440000/follow \
  -H "Authorization: Bearer <your_token>"
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "follow-id",
    "follower_id": "your-user-id",
    "following_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2026-01-08T00:00:00Z"
  },
  "message": "User followed successfully"
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "Cannot follow yourself"
}
```

**Response (409):**
```json
{
  "success": false,
  "error": "Already following this user"
}
```

---

### 7. Unfollow User
Unfollow a user.

- **URL:** `/:id/follow`
- **Method:** `DELETE`
- **Authentication:** Required

**Example Request:**
```bash
curl -X DELETE /v1/users/550e8400-e29b-41d4-a716-446655440000/follow \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "follow-id",
    "follower_id": "your-user-id",
    "following_id": "550e8400-e29b-41d4-a716-446655440000",
    "deleted_at": "2026-01-08T00:00:00Z"
  },
  "message": "User unfollowed successfully"
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "Follow relationship not found"
}
```

---

### 8. Get User Followers
Get a paginated list of users following to specified user.

- **URL:** `/:id/followers`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 10 | Items per page |

**Example Request:**
```bash
curl -X GET "/v1/users/550e8400-e29b-41d4-a716-446655440000/followers?page=1&limit=10" \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "follower-user-id",
      "username": "follower1",
      "first_name": "John",
      "last_name": "Doe",
      "email": "follower@example.com",
      "image": "https://example.com/avatar.jpg",
      "followers_count": 50,
      "following_count": 100,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total_items": 50,
    "current_page": 1,
    "total_pages": 5,
    "items_per_page": 10
  },
  "message": "Followers fetched successfully"
}
```

---

### 9. Get User Following
Get a paginated list of users that specified user is following.

- **URL:** `/:id/following`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 10 | Items per page |

**Example Request:**
```bash
curl -X GET "/v1/users/550e8400-e29b-41d4-a716-446655440000/following?page=1&limit=10" \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "following-user-id",
      "username": "follwing1",
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "following@example.com",
      "image": "https://example.com/avatar2.jpg",
      "followers_count": 200,
      "following_count": 150,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total_items": 100,
    "current_page": 1,
    "total_pages": 10,
    "items_per_page": 10
  },
  "message": "Following fetched successfully"
}
```

---

### 10. Check Follow Status
Check if the authenticated user is following another user.

- **URL:** `/:id/is-following`
- **Method:** `GET`
- **Authentication:** Required

**Example Request:**
```bash
curl -X GET /v1/users/550e8400-e29b-41d4-a716-446655440000/is-following \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "isFollowing": true
  },
  "message": "Follow status checked successfully"
}
```

---

## Data Models

### User Object

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique user identifier |
| username | string | Unique username |
| email | string | User's email address |
| first_name | string | User's first name |
| last_name | string | User's last name |
| avatar_url | string | URL to user's avatar |
| bio | string | User's biography |
| website | string | User's website URL |
| role | string | User role (user, admin, super_admin) |
| created_at | ISO 8601 | Account creation timestamp |
| updated_at | ISO 8601 | Last profile update timestamp |

### Extended Profile Object

| Field | Type | Description |
|-------|------|-------------|
| stats | object | User activity statistics |
| stats.total_posts | number | Total posts created |
| stats.total_views | number | Total views on user's posts |
| stats.total_likes | number | Total likes on user's posts |
| stats.total_bookmarks | number | Posts bookmarked by user |
| posts | array | User's recent posts (when profile=true) |

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
  "error": "Super admin access required"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

## Implementation Example

### JavaScript/TypeScript

```typescript
// Get current user profile
async function getMyProfile(extended = false): Promise<UserProfile> {
  const response = await fetch(`/v1/users/me?profile=${extended}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  return result.data;
}

// Get user by ID
async function getUser(userId: string): Promise<User> {
  const response = await fetch(`/v1/users/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  return result.data;
}

// Admin: Get all users
async function getAllUsers(page = 1, limit = 10): Promise<{ data: User[]; meta: PaginationMeta }> {
  const response = await fetch(`/v1/users?page=${page}&limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const result = await response.json();
  return result;
}

// Admin: Create user
async function createUser(data: UserCreateBody): Promise<User> {
  const response = await fetch('/v1/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  const result = await response.json();
  return result.data;
}

// Follow a user
async function followUser(userId: string): Promise<FollowRelationship> {
  const response = await fetch(`/v1/users/${userId}/follow`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  return result.data;
}

// Unfollow a user
async function unfollowUser(userId: string): Promise<FollowRelationship> {
  const response = await fetch(`/v1/users/${userId}/follow`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  return result.data;
}

// Get user's followers
async function getFollowers(userId: string, page = 1, limit = 10): Promise<{ data: User[]; meta: PaginationMeta }> {
  const response = await fetch(`/v1/users/${userId}/followers?page=${page}&limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  return result;
}

// Get users that a user is following
async function getFollowing(userId: string, page = 1, limit = 10): Promise<{ data: User[]; meta: PaginationMeta }> {
  const response = await fetch(`/v1/users/${userId}/following?page=${page}&limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  return result;
}

// Check if following a user
async function isFollowing(userId: string): Promise<boolean> {
  const response = await fetch(`/v1/users/${userId}/is-following`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  return result.data.isFollowing;
}
```

---

## User Roles

| Role | Description |
|------|-------------|
| `user` | Regular authenticated user |
| `admin` | Administrator with elevated permissions |
| `super_admin` | Super administrator with full access |

---

## Security Notes

- User email is only visible to the authenticated user and super admins
- Passwords are never returned in responses
- User deletion is permanent and irreversible
- Super admin actions are logged for auditing
