# Hono Backend - Project Context

## Project Overview

This is a high-performance backend API built with **Hono** running on the **Bun** runtime, featuring **PostgreSQL** with **Drizzle ORM**. The application serves as a comprehensive social media and content platform with features including authentication, content management, social interactions, financial portfolio tracking, and AI-powered chat.

### Key Technologies
- **Runtime**: Bun (v1.x)
- **Framework**: Hono (v4.12.9)
- **Database**: PostgreSQL with Drizzle ORM (v0.45.2)
- **Language**: TypeScript (v6.0.2)
- **Validation**: Zod (v4.3.6)
- **Authentication**: JWT-based with OAuth (GitHub) support
- **Deployment**: Docker, Fly.io, Docker Hub

### Architecture
- **Service-oriented**: Business logic and data access integrated in the service layer
- **Modular structure**: Organized by feature modules (auth, posts, users, chat, holdings, etc.)
- **Type-safe**: Request validation with Zod schemas
- **Database**: PostgreSQL with Drizzle ORM for schema management and migrations
- **API Versioning**: Routes prefixed with `/v1`

## Features

### Core Features
- **Authentication**: Secure user auth flows with JWT tokens, refresh tokens, and GitHub OAuth
- **Content Management**: Posts, Tags, and Likes with rich text support and image uploads
- **Social Features**: Comments (nested), Bookmarks, Follow system, and Chat (via OpenRouter AI)
- **Financial Tracking**: Holdings management with portfolio tracking, trends, and comparisons
- **User Profiles**: Complete user profile management with followers/following system
- **Notifications**: Real-time notification system

### Advanced Features
- **Rate Limiting**: Built-in rate limiting middleware (configurable per endpoint)
- **File Uploads**: S3-compatible file storage for images
- **Analytics**: Post engagement metrics (views, likes) and trending content
- **Search**: Tag-based and user-based content discovery
- **Health Checks**: `/health` and `/ready` endpoints for monitoring
- **AI Chat**: Integration with OpenRouter for AI-powered conversations (SSE streaming support)

## Database Schema

The application uses PostgreSQL with the following major entities:

| Table | Description |
|-------|-------------|
| `users` | User accounts with authentication and profile data |
| `profiles` | Extended user profile information |
| `posts` | Content with titles, bodies, slugs, and publishing controls |
| `tags` | Categorization system for posts |
| `posts_to_tags` | Many-to-many relationship between posts and tags |
| `post_likes` | Social engagement tracking (unique user-post pairs) |
| `post_bookmarks` | User bookmarked posts |
| `bookmark_folders` | Organized bookmark collections |
| `post_comments` | Nested comment system for posts |
| `post_views` | View tracking with unique user-post tracking |
| `user_follows` | Follower/following relationships |
| `user_tag_follows` | User tag subscription tracking |
| `chat_conversations` | AI chat conversation history |
| `chat_messages` | Individual chat messages with token usage |
| `holdings` | Financial portfolio tracking with gains/losses |
| `holding_types` | Classification for holding types |
| `files` | File upload metadata |
| `sessions` | Authentication session management with refresh tokens |
| `password_reset_tokens` | Password reset token management |

## Project Structure

```
src/
├── config/           # Configuration files (database, server settings)
├── database/         # Database schemas and connection setup
│   ├── schemas/
│   │   └── postgres/
│   │       └── schema.ts    # Drizzle ORM schema definitions
│   └── drizzle.ts           # Database connection initialization
├── email/            # Email service configuration (Resend)
├── middlewares/      # Application middleware
│   ├── auth.ts              # JWT authentication middleware
│   ├── errorHandler.ts      # Global error handling
│   ├── logger.ts            # Request logging
│   ├── optionalAuth.ts      # Optional authentication
│   ├── superAdmin.ts        # Super admin authorization
│   └── validateRequest.ts   # Zod validation middleware
├── modules/          # Feature modules (business logic)
│   ├── auth/         # Authentication & authorization
│   ├── bookmarks/    # Post bookmarking
│   ├── chat/         # AI chat conversations
│   ├── comments/     # Post comments
│   ├── holdings/     # Financial portfolio tracking
│   ├── likes/        # Post likes
│   ├── notifications/# User notifications
│   ├── posts/        # Blog post management
│   ├── reports/      # Content reporting system
│   ├── tags/         # Tag management
│   ├── users/        # User profile management
│   └── writers/      # Public writer profiles
├── router/           # Main route definitions
│   └── index.ts      # v1 API router setup
├── server/           # Server initialization
│   └── app.ts        # Hono app instance and health checks
├── services/         # Shared service layer
│   └── index.ts      # Service factory and dependency injection
├── test/             # Test files and helpers
│   └── helpers/
│       └── drizzleMock.ts   # Drizzle ORM mocking utilities
├── types/            # TypeScript type definitions
│   └── context.ts    # Hono context variable types
└── utils/            # Utility functions
    ├── auth.ts       # JWT and token utilities
    ├── error.ts      # Error handling utilities and ApiError class
    └── response.ts   # Standardized response helpers
```

## Building and Running

### Development
```sh
# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Fill in your database credentials and other secrets

# Run development server (with hot reload)
bun run dev
# Access at: http://localhost:3001
```

### Database Management
```sh
# Generate migrations from schema changes
bun run db:generate

# Apply migrations to database
bun run db:migrate

# Push schema changes directly (development only)
bun run db:push

# Open Database Studio (visual interface)
bun run db:studio
```

### Testing
```sh
# Run test suite
bun test

# Run single test file
bun test src/test/authservice.test.ts

# Watch mode
bun test --watch

# Coverage report
bun test --coverage
```

### Production Build
```sh
# Type checking
bun run typecheck

# Build application (outputs to dist/)
bun run build

# Build compiled binary (outputs to bin/)
bun run build:compile

# Start production server
bun run start:prod
```

### Code Formatting
```sh
# Format all source files
bun run format
```

### Cleanup
```sh
# Remove build artifacts
bun run clean
```

## Deployment

### Docker
The project uses a multi-stage Dockerfile for optimized builds:
- **Stage 1 (Builder)**: Compiles the application to a binary
- **Stage 2 (Runner)**: Minimal Alpine image with the compiled binary

```sh
# Build Docker image
docker build -t honobackend .

# Run with Docker Compose
docker-compose up
```

### Fly.io
Deployed on Fly.io with the following configuration:
- **Region**: Singapore (`sin`) - cost-effective
- **VM**: 256MB memory, 1 shared CPU
- **Auto-scaling**: Stops when idle, starts on request
- **HTTPS**: Enforced via `force_https = true`

```sh
# Deploy to Fly.io
fly deploy

# View logs
fly logs

# Monitor health
fly status
```

### Docker Hub
Images are published to Docker Hub: `cecep31/honobackend:latest`

## Development Conventions

### Coding Standards
- **Type Safety**: Extensive use of TypeScript with strict mode enabled
- **Validation**: All API requests validated using Zod schemas
- **Error Handling**: Centralized error handling with custom `ApiError` class
- **Logging**: Structured logging with request context
- **Async/Await**: Proper error handling for asynchronous operations

### Import Conventions
- Use ES modules (`import/export`)
- Group imports: framework → local → types
- Avoid wildcards; use named imports

### Naming Conventions
- `camelCase`: variables, functions (`getUserById`)
- `PascalCase`: types, classes, interfaces (`UserService`)
- `UPPER_CASE`: constants (`JWT_SECRET`)
- Boolean prefix: `is`, `has`, `can` (`isActive`, `hasPermission`)
- Private members: underscore prefix (`_userService`)

### Formatting (Prettier)
- 2-space indentation
- Single quotes
- Semicolons required
- Max 100 characters per line
- Trailing commas (ES5)
- Run `bun run format` before committing

### API Design
- **RESTful**: Follows REST principles with consistent endpoints
- **Versioning**: All routes under `/v1` prefix
- **Authentication**: JWT-based with refresh token rotation
- **Rate Limiting**: Configurable rate limits per IP/user
- **Pagination**: Standard pagination for list endpoints
- **Response Format**: Consistent JSON response structure

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "request_id": "abc123",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "meta": {
    "total": 100,
    "limit": 10,
    "offset": 0,
    "totalPages": 10,
    "hasMore": true
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": "VALID_001",
    "details": { ... }
  },
  "request_id": "abc123",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Handling

Use the `Errors` utility from `src/utils/error.ts`:

```typescript
import { Errors } from '../../../utils/error';

// Throw standardized errors
throw Errors.NotFound('User');
throw Errors.ValidationFailed({ field: 'email', message: 'Invalid email' });
throw Errors.Unauthorized();
throw Errors.Forbidden();
throw Errors.TooManyRequests(60); // retry after 60 seconds
```

**Error Code Classification:**
- `1xxx`: Authentication/Authorization errors (`AUTH_001`, `AUTH_002`, `AUTH_003`)
- `2xxx`: Validation errors (`VALID_001`, `VALID_002`)
- `3xxx`: Database errors (`DB_001`, `DB_002`, `DB_003`)
- `4xxx`: External service errors (`EXT_001`, `EXT_002`)
- `5xxx`: Business logic errors (`BIZ_001`, `BIZ_002`)
- `6xxx`: System errors (`SYS_001`, `SYS_002`)
- `RATE_001`: Rate limiting errors

### Database Operations (Drizzle ORM)

```typescript
import { db } from '../../../database/drizzle';
import { users } from '../../../database/schemas/postgres/schema';
import { eq, and } from 'drizzle-orm';

// Query single record
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: { profile: true }
});

// Insert with returning
const newUser = await db.insert(users)
  .values({ email, username })
  .returning();

// Update with returning
const updated = await db.update(users)
  .set({ updatedAt: new Date() })
  .where(eq(users.id, id))
  .returning();

// Delete with returning
const deleted = await db.delete(users)
  .where(eq(users.id, id))
  .returning();

// Complex queries
const results = await db.select()
  .from(posts)
  .where(and(eq(posts.published, true), eq(posts.deletedAt, null)))
  .orderBy(posts.createdAt);
```

### Testing Patterns

Use Bun's test runner with mocks:

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createDrizzleMocks } from './helpers/drizzleMock';

const mocks = createDrizzleMocks();

mock.module('../database/drizzle', () => ({
  db: {
    insert: mocks.mockInsert,
    query: {
      users: {
        findFirst: mocks.mockFindFirst,
        findMany: mocks.mockFindMany
      }
    }
  }
}));

describe('UserService', () => {
  beforeEach(() => mocks.reset());

  it('should find user by id', async () => {
    mocks.mockFindFirst.mockResolvedValue({ id: '1', email: 'test@example.com' });
    
    const result = await userService.findById('1');
    
    expect(result).toEqual({ id: '1', email: 'test@example.com' });
  });
});
```

See `docs/TESTING.md` and `src/test/` for detailed examples.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Secret for JWT signing | Required |
| `JWT_EXPIRES_IN` | JWT token expiration | `1d` |
| `RATE_LIMITER` | Enable rate limiting | `true` |
| `RATE_LIMIT_MAX` | Max requests per window | `150` |
| `BODY_LIMIT_MAX_SIZE_MB` | Max request body size | `10` |
| `DB_MAX_CONNECTIONS` | Max DB pool connections | `50` |
| `DB_IDLE_TIMEOUT` | DB idle timeout (seconds) | `30` |
| `DB_CONNECT_TIMEOUT` | DB connect timeout (seconds) | `5` |
| `DB_MAX_LIFETIME` | DB max connection lifetime | `1800` |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | Required for OAuth |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | Required for OAuth |
| `GITHUB_REDIRECT_URI` | OAuth callback URL | - |
| `S3_ENDPOINT` | S3-compatible storage endpoint | Required for uploads |
| `S3_REGION` | S3 region | - |
| `S3_ACCESS_KEY_ID` | S3 access key | - |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | - |
| `S3_BUCKET_NAME` | S3 bucket name | - |
| `OPENROUTER_API_KEY` | OpenRouter API key | Required for chat |
| `OPENROUTER_BASE_URL` | OpenRouter API URL | `https://openrouter.ai/api/v1` |
| `OPENROUTER_DEFAULT_MODEL` | Default AI model | `openai/gpt-oss-20b:free` |
| `RESEND_API_KEY` | Resend API key for emails | Required for password reset |
| `EMAIL_FROM` | From address for emails | `noreply@pilput.net` |
| `FRONTEND_URL` | Frontend application URL | `http://localhost:3000` |
| `FRONTEND_RESET_PASSWORD_URL` | Reset password page URL | `http://localhost:3000/reset-password` |
| `MAIN_DOMAIN` | Main domain | `pilput.net` |

## Key Dependencies

### Runtime Dependencies
- `hono`: Web framework (v4.12.9)
- `drizzle-orm`: Database ORM (v0.45.2)
- `zod`: Validation library (v4.3.6)
- `@hono/zod-validator`: Hono-Zod integration (v0.7.6)
- `postgres`: PostgreSQL driver (v3.4.8)
- `hono-rate-limiter`: Rate limiting middleware (v0.5.3)
- `axios`: HTTP client (v1.14.1)
- `sanitize-html`: HTML sanitization (v2.17.2)
- `resend`: Email service (v6.10.0)

### Dev Dependencies
- `@types/bun`: Bun type definitions (v1.3.11)
- `drizzle-kit`: Database toolkit (v0.31.10)
- `typescript`: Type checker (v6.0.2)
- `@types/sanitize-html`: Type definitions

## Special Notes

### BigInt Serialization Fix
Custom BigInt serialization for JSON responses:
```typescript
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
```

### Graceful Shutdown
Proper cleanup on process termination:
- Handles `SIGTERM` and `SIGINT` signals
- Cleans up rate limiter stores
- Closes database connections

### Memory Management
- Configurable database connection pool settings
- Connection limits for production environments
- Idle timeout and max lifetime configurations

### Security Best Practices
- Input validation with Zod for all requests
- SQL injection prevention via Drizzle ORM parameterized queries
- Secure JWT implementation with proper expiration
- Rate limiting protection against abuse
- File upload validation (type, size limits)
- Error messages sanitized for production (no stack traces to clients)

### Monitoring
- Health check endpoint: `GET /health`
- Readiness probe: `GET /ready`
- Structured logging with request IDs
- Database connection status monitoring

## API Documentation

Detailed API documentation is available in:
- `docs/README.md` - Main API documentation with endpoint reference
- `src/modules/*/README.md` - Module-specific API documentation
- `docs/TESTING.md` - Testing guidelines and patterns

## Related Documentation

- `README.md` - Quick start guide
- `AGENTS.md` - Guidelines for agentic coding tools
- `.env.example` - Environment variable template
