# Authentication API Documentation

The Auth API provides endpoints for user authentication, registration, and token management.

**Base URL:** `/v1/auth`

---

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. GitHub OAuth Login
Initiate GitHub OAuth authentication flow.

- **URL:** `/oauth/github`
- **Method:** `GET`
- **Response:** Redirects to GitHub authorization page

**Response (After Authorization):**
- Redirects to `https://pilput.me` with JWT cookie set

---

### 2. GitHub OAuth Callback
Handle the OAuth callback from GitHub.

- **URL:** `/oauth/github/callback`
- **Method:** `GET`
- **Query Parameters:**
  - `code` (required) - Authorization code from GitHub

**Example Request:**
```
GET /oauth/github/callback?code=your_authorization_code
```

---

### 3. Login
Authenticate user with email and password.

- **URL:** `/login`
- **Method:** `POST`
- **Rate Limit:** 7 requests per 15 minutes per IP
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Validation Rules:**
| Field | Type | Rules |
|-------|------|-------|
| email | string | Min 5 chars, max 254 chars, valid email format |
| password | string | Min 6 chars, max 25 chars |

**Example Request:**
```bash
curl -X POST /v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "your_refresh_token",
    "token_type": "Bearer",
    "expires_in": 3600
  },
  "message": "Login successful"
}
```

---

### 4. Register
Create a new user account.

- **URL:** `/register`
- **Method:** `POST`
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "user@example.com",
  "password": "password123"
}
```

**Validation Rules:**
| Field | Type | Rules |
|-------|------|-------|
| username | string | 3-20 chars, letters/numbers/underscores only |
| email | string | Valid email format |
| password | string | Min 6 chars |

**Example Request:**
```bash
curl -X POST /v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "johndoe", "email": "user@example.com", "password": "password123"}'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "your_refresh_token",
    "token_type": "Bearer"
  },
  "message": "User created successfully"
}
```

---

### 5. Check Username Availability
Check if a username is already taken.

- **URL:** `/username/:username`
- **Method:** `GET`
- **Authentication:** Not required

**Example Request:**
```
GET /v1/auth/username/johndoe
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "exists": false
  },
  "message": "Username check completed"
}
```

---

### 6. Check Email Availability
Check if an email is already registered.

- **URL:** `/email/:email`
- **Method:** `GET`
- **Authentication:** Not required

**Example Request:**
```
GET /v1/auth/email/user@example.com
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "exists": true
  },
  "message": "Email check completed"
}
```

---

### 7. Refresh Token
Refresh an expired access token using a refresh token.

- **URL:** `/refresh-token`
- **Method:** `POST`
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "refresh_token": "your_refresh_token"
}
```

**Example Request:**
```bash
curl -X POST /v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "your_refresh_token"}'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "access_token": "new_access_token",
    "refresh_token": "new_refresh_token",
    "token_type": "Bearer"
  },
  "message": "Token refreshed successfully"
}
```

---

### 8. Logout
Log out the current user and invalidate the token.

- **URL:** `/logout`
- **Method:** `POST`
- **Authentication:** Required

**Example Request:**
```bash
curl -X POST /v1/auth/logout \
  -H "Authorization: Bearer <your_token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully"
}
```

---

### 9. Update Password
Update the user's password.

- **URL:** `/password`
- **Method:** `PATCH`
- **Authentication:** Required
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "old_password": "current_password",
  "new_password": "new_password123",
  "confirm_password": "new_password123"
}
```

**Validation Rules:**
- `new_password` must match `confirm_password`
- `new_password` must be at least 6 characters

**Example Request:**
```bash
curl -X PATCH /v1/auth/password \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"old_password": "old123", "new_password": "new123", "confirm_password": "new123"}'
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Password updated successfully"
}
```

---

## Error Responses

All endpoints return consistent error responses:

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
  "error": "Invalid or expired token"
}
```

**429 Too Many Requests:**
```json
{
  "success": false,
  "error": "Rate limit exceeded"
}
```

---

## Security Notes

- Passwords are hashed using bcrypt before storage
- JWT tokens expire after 5 hours (set in cookie)
- GitHub OAuth uses strict same-site cookie policy
- Login attempts are rate-limited (7 per 15 minutes)
- Never expose tokens in client-side code or URLs
