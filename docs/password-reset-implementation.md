# Password Reset Implementation

This document describes the forgot/reset password feature implementation for the Hono backend.

## Overview

The password reset feature allows users to securely reset their password via email. The implementation follows security best practices and includes rate limiting to prevent abuse.

## Features

- **Forgot Password**: Request a password reset link via email
- **Reset Password**: Reset password using a secure token
- **Security**: Tokens expire after 1 hour and can only be used once
- **Rate Limiting**: Prevents brute force attacks
- **Session Invalidation**: All user sessions are cleared after password reset

## Database Schema

A new table `password_reset_tokens` has been added with the following structure:

```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  INDEX idx_password_reset_tokens_token (token),
  INDEX idx_password_reset_tokens_user_id (user_id)
);
```

## API Endpoints

### 1. POST `/v1/auth/forgot-password`

Request a password reset link.

**Rate Limit**: 3 requests per 15 minutes per IP

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "If the email exists, a password reset link has been sent"
  },
  "message": "If the email exists, a password reset link has been sent"
}
```

**Development Mode**: Includes `token` and `resetLink` in response for testing.

### 2. POST `/v1/auth/reset-password`

Reset password using a valid token.

**Rate Limit**: 5 requests per 15 minutes per IP

**Request Body**:
```json
{
  "token": "01942f3e-8b7a-7890-b123-456789abcdef",
  "new_password": "newPassword123",
  "confirm_password": "newPassword123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Password has been reset successfully"
  },
  "message": "Password has been reset successfully"
}
```

## Configuration

Add the following environment variables to your `.env` file:

```env
# Email Configuration (for password reset)
EMAIL_HOST=""
EMAIL_PORT=587
EMAIL_SECURE="false"
EMAIL_USER=""
EMAIL_PASSWORD=""
EMAIL_FROM="noreply@pilput.me"

# Frontend Configuration
FRONTEND_URL="http://localhost:3000"
FRONTEND_RESET_PASSWORD_URL="http://localhost:3000/reset-password"
```

## Security Features

1. **Token Expiration**: Reset tokens expire after 1 hour
2. **Single Use**: Tokens can only be used once
3. **Rate Limiting**: Prevents brute force attacks
4. **Session Invalidation**: All user sessions are cleared after password reset
5. **No Email Disclosure**: Response doesn't reveal if email exists
6. **Secure Token Generation**: Uses UUIDv7 for cryptographically secure tokens
7. **Password Hashing**: Passwords are hashed using bcrypt with cost factor 12

## Implementation Details

### Files Modified/Created

1. **Database Schema** (`src/database/schemas/postgre/schema.ts`)
   - Added `password_reset_tokens` table
   - Added relations to users table

2. **Validation** (`src/modules/auth/validation/auth.ts`)
   - Added `forgotPasswordSchema`
   - Added `resetPasswordSchema`

3. **Service** (`src/modules/auth/authService.ts`)
   - Added `requestPasswordReset()` method
   - Added `resetPassword()` method
   - Added `cleanupExpiredTokens()` method (for cron jobs)

4. **Controller** (`src/modules/auth/authController.ts`)
   - Added `/forgot-password` endpoint
   - Added `/reset-password` endpoint

5. **Configuration** (`src/config/index.ts`, `.env.example`)
   - Added email configuration
   - Added frontend URL configuration

6. **Documentation** (`docs/auth.md`)
   - Added endpoint documentation
   - Updated security notes

7. **Migration** (`drizzle/0001_conscious_veda.sql`)
   - Database migration for password_reset_tokens table

## Usage Flow

1. **User Requests Password Reset**
   - User submits email via `/forgot-password` endpoint
   - System generates a secure token and stores it in database
   - Token is logged to console (in development) or sent via email (in production)

2. **User Receives Reset Link**
   - Email contains link: `http://localhost:3000/reset-password?token=<token>`
   - Link is valid for 1 hour

3. **User Resets Password**
   - User clicks link and enters new password
   - Frontend submits token and new password to `/reset-password` endpoint
   - System validates token, updates password, and invalidates all sessions

## Testing

In development mode, the token is included in the API response for easy testing:

```bash
# Request password reset
curl -X POST http://localhost:3000/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Response includes token in development
{
  "success": true,
  "data": {
    "message": "If the email exists, a password reset link has been sent",
    "token": "01942f3e-8b7a-7890-b123-456789abcdef",
    "resetLink": "http://localhost:3000/reset-password?token=01942f3e-8b7a-7890-b123-456789abcdef"
  }
}

# Reset password with token
curl -X POST http://localhost:3000/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "01942f3e-8b7a-7890-b123-456789abcdef",
    "new_password": "newPassword123",
    "confirm_password": "newPassword123"
  }'
```

## Migration

To apply the database migration:

```bash
# Generate migration (already done)
bunx drizzle-kit generate

# Push to database
bunx drizzle-kit push
```

## Future Enhancements

1. **Email Integration**: Integrate with email service (SendGrid, AWS SES, etc.)
2. **Token Cleanup**: Add cron job to clean up expired tokens using `cleanupExpiredTokens()`
3. **Email Templates**: Create HTML email templates for password reset
4. **Multi-language Support**: Add i18n for email content
5. **Audit Logging**: Log password reset attempts for security monitoring

## Notes

- In production, remove the token from the API response and send it via email only
- Consider implementing additional security measures like CAPTCHA for public endpoints
- Monitor rate limit violations and adjust limits as needed
- Regularly clean up expired tokens to maintain database performance
