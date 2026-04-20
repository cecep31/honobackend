# Gemini CLI Project Context: Hono Backend

This document provides foundational context and instructions for AI agents working on the `honobackend` project.

## Project Overview

- **Core Framework:** [Hono](https://hono.dev/)
- **Runtime:** [Bun](https://bun.sh/)
- **Database:** PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Architecture:** Service-Oriented Architecture (SOA) with a domain-driven modular structure.
- **Validation:** Type-safe schema validation using [Zod](https://zod.dev/) via `@hono/zod-validator`.
- **Key Modules:** Authentication (JWT & GitHub OAuth), Users, Posts, Tags, Likes, Bookmarks, Chat (via OpenRouter), Notifications, and Reports.

## Project Structure

- `index.ts`: Application entry point for Bun.
- `src/server/app.ts`: Hono app initialization, global middlewares, and health checks.
- `src/router/index.ts`: Main router that mounts all module-specific routes under `/v1`.
- `src/modules/`: Contains business logic divided into domain modules.
  - `<module>/controllers/`: Hono routers that handle HTTP requests and call services.
  - `<module>/services/`: Core business logic and database interactions.
  - `<module>/validation/`: Zod schemas for request validation.
- `src/database/`: Drizzle ORM configuration and schemas.
- `src/services/`: Centralized service registry and dependency injection.
- `src/middlewares/`: Custom middlewares (auth, error handling, validation, etc.).
- `src/utils/`: Shared utilities for responses, errors, pagination, and HTTP clients.
- `src/test/`: Comprehensive test suite using Bun's native test runner.

## Key Commands

- **Development:** `bun run dev` (starts server with hot reload)
- **Testing:** `bun test`
- **Linting:** `bun run lint` / `bun run lint:fix`
- **Formatting:** `bun run format` (Prettier)
- **Database Management:**
  - `bun run db:generate`: Generate migrations from schema.
  - `bun run db:migrate`: Apply migrations to database.
  - `bun run db:push`: Sync schema to database (for development).
  - `bun run db:studio`: Launch Drizzle Studio UI.
- **Production Build:** `bun run build`

## Development Conventions

### 1. Controllers and Routing
- Controllers are implemented as factory functions (e.g., `createAuthController`) that take services as arguments and return a Hono instance.
- Always use `validateRequest` middleware with a Zod schema for input validation.
- Use `sendSuccess` utility for consistent JSON responses.

### 2. Service Layer
- Business logic MUST reside in the service layer, not in controllers.
- Services are typically classes that interact with the database via Drizzle.
- Use `createLazyService` in `src/services/index.ts` for service instantiation.

### 3. Error Handling
- Use the `Errors` utility class in `src/utils/error.ts` to throw standard HTTP errors (e.g., `Errors.NotFound()`, `Errors.Unauthorized()`).
- Global error handling is managed by `src/middlewares/errorHandler.ts`.

### 4. Database
- Define schemas in `src/database/schemas/postgres/schema.ts`.
- Use Drizzle's relational API where appropriate (defined in `drizzle/relations.ts`).

### 5. Authentication
- Protected routes should use the `auth` middleware from `src/middlewares/auth.ts`.
- The `auth` middleware populates `c.get('user')` with the authenticated user's information.

## Testing Strategy
- Add tests for every new feature or bug fix in `src/test/`.
- Prefer Bun's native test runner (`bun test`).
- Mock dependencies (like database calls) using `src/test/helpers/drizzleMock.ts` when unit testing services.

## Security
- Never log sensitive information or credentials.
- Use `process.env` through the centralized config in `src/config/index.ts`.
- Ensure all incoming data is validated using Zod.
