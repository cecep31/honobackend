# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `bun install` - Install dependencies
- `bun run dev` - Start development server with hot reload
- `bun run build` - Build the application (typecheck + minify)
- `bun run start` - Start production server
- `bun run typecheck` - Run TypeScript type checking without emitting
- `bun run lint` - Alias for typecheck
- `bun run format` - Format code with Prettier

### Testing
- `bun test` - Run all tests
- `bun run test:watch` - Run tests in watch mode
- `bun run test:coverage` - Run tests with coverage report

### Database Commands
- `bun run db:generate` - Generate Drizzle migration files
- `bun run db:migrate` - Run database migrations
- `bun run db:push` - Push schema changes to database
- `bun run db:pull` - Pull schema from database
- `bun run db:studio` - Open Drizzle Studio

### Build Variants
- `bun run build:compile` - Build to a single executable binary
- `bun run start:prod` - Run the built production version
- `bun run clean` - Clean build artifacts

## Architecture Overview

This is a **Hono-based TypeScript backend** using **PostgreSQL** with **Drizzle ORM**.

### Project Structure
```
src/
├── server/app.ts          # Main Hono app with error handling
├── router/index.ts        # API router setup (v1 endpoints)
├── middlewares/           # Custom middleware (auth, logging, validation)
├── modules/               # Feature modules (controller + service per domain)
│   ├── auth/              # Authentication & GitHub OAuth
│   ├── users/             # User profiles, follow/unfollow
│   ├── posts/             # Blog posts with tags, comments, likes
│   ├── tags/              # Post categorization
│   ├── likes/             # User reactions
│   ├── writers/           # Writer profiles
│   ├── chat/              # AI chat via OpenRouter
│   ├── holdings/          # Portfolio holdings tracking
│   ├── bookmarks/         # Post bookmarks
│   └── comments/          # Post comments
├── services/index.ts      # Lazy-loaded service instances
├── database/
│   ├── drizzle.ts         # Database connection setup
│   └── schemas/postgre/   # Drizzle schema definitions
├── types/                 # TypeScript type definitions
├── config/                # Configuration (secrets, GitHub, etc.)
└── utils/                 # Utility functions
```

### Key Architectural Patterns

**Module Structure (Controller + Service):**
- Each domain in `modules/` has a `*Controller.ts` (HTTP handlers) and `*Service.ts` (business logic)
- Controllers import services from `services/index.ts` using lazy-loaded singletons
- Services access the database via `db` from `database/drizzle.ts`

**Lazy Service Pattern:**
- Services are instantiated lazily using a Proxy pattern to prevent circular dependencies
- `src/services/index.ts` exports: `authService`, `userService`, `postService`, `tagService`, `likeService`, `bookmarkService`, `commentService`, `chatService`, `holdingService`, `writerService`, `openrouterService`

**Database Design:**
- Schema defined in `src/database/schemas/postgre/schema.ts` with Drizzle ORM
- Uses `drizzle.config.ts` for Drizzle Kit configuration
- Connection pooling configured (default max: 20 connections)
- Supports soft deletes via `deleted_at` timestamps
- All tables use `uuid_generate_v4()` for IDs (via `randomUUIDv7()` in services)

**API Structure:**
- Versioned API under `/v1` prefix
- Organized by domain: `/auth`, `/users`, `/posts`, `/tags`, `/likes`, `/writers`, `/chat`, `/holdings`, `/bookmarks`, `/comments`
- Consistent error handling with request IDs via `errorHandler` middleware
- Rate limiting configurable via `RATE_LIMITER` environment variable

**Validation & Error Handling:**
- Request validation using Zod schemas with `@hono/zod-validator`
- Standardized errors via `Errors` utility in `src/utils/error.ts` with ApiError class
- Error codes: AUTH_xxx, VALID_xxx, DB_xxx, EXT_xxx, BIZ_xxx, SYS_xxx

### Core Domains
- **Auth**: Login, register, refresh tokens, GitHub OAuth, password reset
- **Users**: Profiles, follow/unfollow users
- **Posts**: Blog posts with tags, comments, likes, views, bookmarks
- **Chat**: AI conversations via OpenRouter with message history
- **Holdings**: Portfolio holdings tracker (stocks, crypto, etc.)
- **Writers**: Writer profiles and post aggregation

### Environment & Configuration
- Main config in `src/config/index.ts` with `getConfig` export
- Database URL via `DATABASE_URL` environment variable
- `RATE_LIMITER=true` enables global rate limiting
- GitHub OAuth, S3, OpenRouter, and email configured via environment variables
- CORS origins defined in `src/config/index.ts` (`originList`)