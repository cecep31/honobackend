# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `bun install` - Install dependencies
- `bun run dev` - Start development server with hot reload
- `bun run build` - Build the application (typecheck + minify)
- `bun run start` - Start production server
- `bun run typecheck` - Run TypeScript type checking without emitting

### Database Commands
- `bun run db:generate` - Generate Drizzle migration files
- `bun run db:migrate` - Run database migrations
- `bun run studio` - Open Drizzle Studio for database management

### Build Variants
- `bun run build:compile` - Build to a single executable binary
- `bun run start:prod` - Run the built production version

## Architecture Overview

This is a **Hono-based TypeScript backend** using **PostgreSQL** with **Drizzle ORM**.

### Project Structure
```
src/
├── server/app.ts          # Main Hono app with error handling
├── router/index.ts        # API router setup (v1 endpoints)
├── middlewares/           # Custom middleware (auth, logging, validation)
├── controllers/           # Route handlers for each domain
├── pkg/
│   ├── services/          # Business logic layer
│   └── repository/        # Data access layer
├── domain/                # Domain models/types
├── database/
│   ├── drizzle.ts         # Database connection setup
│   └── schemas/postgre/   # Drizzle schema definitions
├── types/                 # TypeScript type definitions
├── config/                # Configuration (secrets, GitHub, etc.)
└── utils/                 # Utility functions
```

### Key Architectural Patterns

**Layered Architecture:**
- Controllers handle HTTP requests/responses
- Services contain business logic
- Repositories handle database operations
- Clear separation of concerns

**Database Design:**
- Uses PostgreSQL with Drizzle ORM
- Schema defined in `src/database/schemas/postgre/schema.ts`
- Connection pooling configured (max: 50 connections)
- Supports soft deletes via `deleted_at` timestamps

**API Structure:**
- Versioned API under `/v1` prefix
- Organized by domain: `/auth`, `/users`, `/posts`, `/tags`, `/likes`, `/writers`
- Consistent error handling with request IDs
- Rate limiting configurable via `RATE_LIMITER` environment variable

**Authentication & Security:**
- Session-based authentication with UUID tokens
- GitHub OAuth integration
- CORS configuration with allowed origins
- Request timeout: 30 seconds
- Comprehensive middleware stack (logging, rate limiting, validation)

### Core Domains
- **Users**: Authentication, profiles, session management
- **Posts**: Blog posts with tags, comments, likes
- **Tags**: Post categorization system
- **Likes**: User reactions to posts
- **Files**: File upload/management system

### Environment & Configuration
- Database URL via `DATABASE_URL` environment variable
- Port defaults to 3001, configurable via `PORT`
- GitHub integration requires configuration in `src/config/github.ts`
- Secrets managed through `src/config/secret.ts`

### Testing
- Test files located in `src/test/`
- Uses Bun's built-in test runner
- Service layer tests included (auth, user services)