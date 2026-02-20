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
Authenticate user with email/username and password.

- **URL:** `/login`
- **Method:** `POST`
- **Rate Limit:** 7 requests per 15 minutes per IP
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "identifier": "user@example.com",
  "password": "your_password"
}
```

**Validation Rules:**
| Field | Type | Rules |
|-------|------|-------|
| identifier | string | Min 3 chars, max 254 chars, can be email or username |
| password | string | Min 6 chars, max 25 chars |

**Example Request:**
```bash
curl -X POST /v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "user@example.com", "password": "password123"}'
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

### 10. Forgot Password
Request a password reset link.

- **URL:** `/forgot-password`
- **Method:** `POST`
- **Rate Limit:** 3 requests per 15 minutes per IP
- **Content-Type:** `application/json`
- **Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Validation Rules:**
| Field | Type | Rules |
|-------|------|-------|
| email | string | Valid email format |

**Example Request:**
```bash
curl -X POST /v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "If the email exists, a password reset link has been sent"
  },
  "message": "If the email exists, a password reset link has been sent"
}
```

**Development Mode Response (includes token):**
```json
{
  "success": true,
  "data": {
    "message": "If the email exists, a password reset link has been sent",
    "token": "01942f3e-8b7a-7890-b123-456789abcdef",
    "resetLink": "http://localhost:3000/reset-password?token=01942f3e-8b7a-7890-b123-456789abcdef"
  },
  "message": "If the email exists, a password reset link has been sent"
}
```

**Notes:**
- For security, the response is the same whether the email exists or not
- Reset tokens expire after 1 hour
- Only one active reset token per user (previous tokens are invalidated)
- In development mode, the token and reset link are included in the response
- In production, the token should be sent via email

---

### 11. Reset Password
Reset password using a valid reset token.

- **URL:** `/reset-password`
- **Method:** `POST`
- **Rate Limit:** 5 requests per 15 minutes per IP
- **Content-Type:** `application/json`
- **Authentication:** Not required

**Request Body:**
```json
{
  "token": "01942f3e-8b7a-7890-b123-456789abcdef",
  "new_password": "newPassword123",
  "confirm_password": "newPassword123"
}
```

**Validation Rules:**
| Field | Type | Rules |
|-------|------|-------|
| token | string | Required, non-empty |
| new_password | string | Min 6 chars |
| confirm_password | string | Must match new_password |

**Example Request:**
```bash
curl -X POST /v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "01942f3e-8b7a-7890-b123-456789abcdef",
    "new_password": "newPassword123",
    "confirm_password": "newPassword123"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Password has been reset successfully"
  },
  "message": "Password has been reset successfully"
}
```

**Error Response (400 - Invalid Token):**
```json
{
  "success": false,
  "error": "Invalid or expired reset token"
}
```

**Error Response (400 - Expired Token):**
```json
{
  "success": false,
  "error": "Reset token has expired"
}
```

**Notes:**
- Reset tokens can only be used once
- After successful password reset, all existing user sessions are invalidated
- Tokens expire after 1 hour
- Used tokens cannot be reused

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

- Passwords are hashed using bcrypt (cost factor 12) before storage
- JWT tokens expire after 5 hours (set in cookie)
- GitHub OAuth uses strict same-site cookie policy
- Login attempts are rate-limited (7 per 15 minutes)
- Password reset requests are rate-limited (3 per 15 minutes)
- Password reset tokens expire after 1 hour
- Reset tokens can only be used once
- All user sessions are invalidated after password reset
- Never expose tokens in client-side code or URLs
- Password reset responses don't reveal if email exists (security best practice)
