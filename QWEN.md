# Hono Backend - Project Context

## Project Overview

This is a high-performance backend API built with **Hono** running on the **Bun** runtime, featuring **PostgreSQL** with **Drizzle ORM**. The application provides a comprehensive social media platform with features including authentication, content management, social features, and financial portfolio tracking.

### Key Technologies
- **Runtime**: Bun (v1.x)
- **Framework**: Hono (v4.11.4)
- **Database**: PostgreSQL with Drizzle ORM
- **Language**: TypeScript
- **Validation**: Zod
- **Authentication**: JWT-based with OAuth support
- **Deployment**: Docker, Fly.io

### Architecture
- **Service-oriented**: Business logic and data access integrated in the service layer
- **Modular structure**: Organized by feature modules (auth, posts, users, chat, holdings, etc.)
- **Type-safe**: Request validation with Zod
- **Database**: PostgreSQL with Drizzle ORM for schema management

## Features

### Core Features
- **Authentication**: Secure user auth flows with JWT tokens, refresh tokens, and GitHub OAuth
- **Content Management**: Posts, Tags, and Likes with rich text support
- **Social Features**: Comments, Bookmarks, Follow system, and Chat (via OpenRouter)
- **Financial Tracking**: Holdings management with portfolio tracking capabilities
- **User Profiles**: Complete user profile management with followers/following system
- **Notifications**: Real-time notification system

### Advanced Features
- **Rate Limiting**: Built-in rate limiting middleware
- **File Uploads**: S3-compatible file storage
- **Analytics**: Post engagement metrics and charts
- **Search**: Tag-based and user-based content discovery
- **API Documentation**: Comprehensive REST API endpoints

## Database Schema

The application uses PostgreSQL with the following major entities:
- **Users**: Core user accounts with authentication and profile data
- **Posts**: Content management with titles, bodies, slugs, and publishing controls
- **Tags**: Categorization system for posts
- **Likes**: Social engagement tracking
- **Comments**: Post discussion system
- **Chat**: Conversation and message history
- **Holdings**: Financial portfolio tracking
- **Files**: File upload management
- **Notifications**: User notification system
- **Sessions**: Authentication session management

## Project Structure

```
src/
├── config/           # Configuration files
├── database/         # Database schemas and connection
├── middlewares/      # Application middleware
├── modules/          # Feature modules (auth, posts, users, etc.)
├── router/           # Main route definitions
├── server/           # Server initialization
├── services/         # Business logic services
├── test/             # Test files
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## Building and Running

### Development
```sh
# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Fill in your database credentials and other secrets

# Run development server
bun run dev
# Access at: http://localhost:3001
```

### Database Management
```sh
# Generate migrations
bun run db:generate

# Apply migrations
bun run db:migrate

# Push schema changes directly
bun run db:push

# Database Studio (visual interface)
bun run studio
```

### Production
```sh
# Type checking
bun run typecheck

# Build application
bun run build

# Start production server
bun run start:prod
```

### Testing
```sh
# Run test suite
bun test

# Watch mode
bun test --watch

# Coverage report
bun test --coverage
```

## Deployment

### Docker
The project includes a multi-stage Dockerfile for optimized builds:
```dockerfile
# Builds a compiled binary in the first stage
# Runs the binary in the second stage for minimal footprint
```

### Fly.io
Deployed on Fly.io with the following configuration:
- Region: Singapore (cost-effective)
- VM: 256MB memory, 1 shared CPU
- Auto-scaling: Stops when idle, starts on request
- HTTPS enforcement

## Development Conventions

### Coding Standards
- **Type Safety**: Extensive use of TypeScript with strict mode
- **Validation**: All API requests validated with Zod schemas
- **Error Handling**: Centralized error handling with custom error types
- **Logging**: Structured logging with context information
- **Async/Await**: Proper error handling for asynchronous operations

### API Design
- **RESTful**: Follows REST principles with consistent endpoints
- **Authentication**: JWT-based with refresh token rotation
- **Rate Limiting**: Configurable rate limits per IP/user
- **Pagination**: Standard pagination for list endpoints
- **Response Format**: Consistent JSON response structure

### Security
- **Input Validation**: All inputs validated using Zod
- **SQL Injection Prevention**: Drizzle ORM parameterized queries
- **Authentication**: Secure JWT implementation with proper expiration
- **Rate Limiting**: Protection against abuse
- **File Uploads**: Strict validation of file types and sizes

## Environment Variables

Key configuration variables include:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT signing
- `S3_*`: S3-compatible storage configuration
- `GITHUB_*`: OAuth integration
- `OPENROUTER_*`: AI chat integration
- `EMAIL_*`: Email service configuration

## Key Dependencies

### Runtime Dependencies
- `hono`: Web framework
- `drizzle-orm`: Database ORM
- `zod`: Validation library
- `@hono/zod-validator`: Hono-Zod integration
- `postgres`: PostgreSQL driver
- `hono-rate-limiter`: Rate limiting middleware

### Dev Dependencies
- `@types/bun`: Bun type definitions
- `drizzle-kit`: Database toolkit
- `typescript`: Type checker

## Special Notes

1. **BigInt Serialization**: Custom BigInt serialization fix for JSON responses
2. **Graceful Shutdown**: Proper cleanup on process termination
3. **Memory Management**: Configurable database connection pool settings
4. **Monitoring**: Structured logging for operational insights
5. **Performance**: Optimized for high throughput with proper timeout configurations