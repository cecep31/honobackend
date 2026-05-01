# Authentication API Documentation

The Auth API provides endpoints for user authentication, registration, and token management.

**Base URL:** `/api/auth`

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
- Redirects to `FRONTEND_URL` (default `https://pilput.net`; see `src/config/index.ts`) and sets `token` + `refresh_token` cookies on `MAIN_DOMAIN` (e.g. `.pilput.net`).

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

You may send **`email`** instead of `identifier` (same rules as identifier); at least one of `identifier` or `email` is required.

**Validation Rules:**
| Field | Type | Rules |
|-------|------|-------|
| identifier | string (optional) | Min 3 chars, max 254 chars, email or username |
| email | string (optional) | Min 5 chars, max 254 chars — use if you prefer this field name |
| password | string | Min 6 chars, max 25 chars |

**Example Request:**
```bash
curl -X POST /api/auth/login \
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
- **Rate Limit:** 5 requests per 15 minutes per IP
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "user@example.com",
  "password": "Str0ng!Pass"
}
```

**Validation Rules:**
| Field | Type | Rules |
|-------|------|-------|
| username | string | 3-20 chars, letters/numbers/underscores only |
| email | string | Valid email format |
| password | string | Min **8** chars; must include upper, lower, digit, and special char (see `validatePassword` in `src/utils/password.ts`) |

**Example Request:**
```bash
curl -X POST /api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "johndoe", "email": "user@example.com", "password": "Str0ng!Pass"}'
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
  "message": "User registered successfully"
}
```

---

### 5. Check Username Availability
Check if a username is already taken.

- **URL:** `/check-username`
- **Method:** `POST`
- **Content-Type:** `application/json`
- **Authentication:** Not required
- **Rate Limit:** 30 requests per 15 minutes per IP

**Request Body:**
```json
{
  "username": "johndoe"
}
```

**Example Request:**
```bash
curl -X POST /api/auth/check-username \
  -H "Content-Type: application/json" \
  -d '{"username": "johndoe"}'
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
GET /api/auth/email/user@example.com
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
curl -X POST /api/auth/refresh-token \
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
curl -X POST /api/auth/logout \
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
curl -X PATCH /api/auth/password \
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
curl -X POST /api/auth/forgot-password \
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
curl -X POST /api/auth/reset-password \
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

### 12. Get Profile (JWT user)
Return the full user profile for the authenticated JWT (distinct from `GET /api/users/me`).

- **URL:** `/profile`
- **Method:** `GET`
- **Authentication:** Required

**Response (200):** `message`: `"User profile retrieved successfully"`. `data` is the user profile from `userService.getUserProfile`.

---

### 13. Activity logs
Paginated security / auth activity for the current user.

- **URL:** `/activity-logs`
- **Method:** `GET`
- **Authentication:** Required
- **Query:** `offset`, `limit` (string query params, defaults **0** / **20**), optional `activity_type` (`login` \| `login_failed` \| `logout` \| `register` \| `password_change` \| `password_reset_request` \| `password_reset` \| `token_refresh` \| `oauth_login` \| `oauth_login_failed`), optional `status` (`success` \| `failure` \| `pending`).

**Response (200):** `data` is the log rows; `meta` uses `total_items`, `offset`, `limit`, `total_pages`.

---

### 14. Recent activity
- **URL:** `/activity-logs/recent`
- **Method:** `GET`
- **Authentication:** Required
- **Query:** `limit` (default **10**)

**Response (200):** `message`: `"Recent activity retrieved successfully"`.

---

### 15. Failed login attempts
- **URL:** `/activity-logs/failed-logins`
- **Method:** `GET`
- **Authentication:** Required
- **Query:** optional `since` (ISO date); default window **last 24 hours**

**Response (200):** `data`: `{ "logs": [...], "count": number }`.

---

## Error Responses

Errors use the API-wide envelope: `success`, `message`, optional `error` (code string such as `AUTH_001`, `VALID_001`), optional `errors` / `details`, plus `request_id` and `timestamp`. See `src/utils/error.ts` and `AGENTS.md`.

---

## Security Notes

- Passwords are hashed using bcrypt (cost factor 12) before storage
- Access token lifetime follows **`JWT_EXPIRES_IN`** (default **3h** in `src/config/index.ts`; also used for OAuth `token` cookie `maxAge`)
- GitHub OAuth uses strict same-site cookie policy
- Login attempts are rate-limited (7 per 15 minutes)
- Register is rate-limited (5 per 15 minutes)
- Password reset requests are rate-limited (3 per 15 minutes)
- Password reset tokens expire after 1 hour
- Reset tokens can only be used once
- All user sessions are invalidated after password reset
- Never expose tokens in client-side code or URLs
- Password reset responses don't reveal if email exists (security best practice)
