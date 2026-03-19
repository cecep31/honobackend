# GEMINI.md - Hono Backend

## Project Overview

This is a high-performance backend API built with **Hono** running on the **Bun** runtime. It uses **PostgreSQL** as the primary database, with **Drizzle ORM** for type-safe database access and migrations.

The project follows a **Service-Oriented Architecture (SOA)**, where business logic and data access are encapsulated in the service layer, separated from controllers and routing.

**Key Technologies:**
- **Framework:** Hono
- **Runtime:** Bun
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Validation:** Zod (via `@hono/zod-validator` and custom middleware)
- **Language:** TypeScript

## Building and Running

### Prerequisites
- [Bun](https://bun.sh/) runtime installed.
- PostgreSQL database instance.

### Commands
- **Install dependencies:** `bun install`
- **Development:** `bun run dev` (hot-reloading at `http://localhost:3001`)
- **Build:** `bun run build` (outputs to `dist/`)
- **Production Start:** `bun run start:prod`
- **Type Checking:** `bun run typecheck`
- **Formatting:** `bun run format` (Prettier)

### Database Management
- **Generate migrations:** `bun run db:generate`
- **Push schema to DB:** `bun run db:push`
- **Pull from DB:** `bun run db:pull`
- **Drizzle Studio:** `bun run db:studio`

### Testing
- **Run tests:** `bun test`
- **Watch mode:** `bun test:watch`
- **Coverage:** `bun test:coverage`

## Development Conventions

### Architecture: Service-Oriented
The codebase is organized into modules under `src/modules/`. Each module typically contains:
- `controllers/`: Hono route handlers.
- `services/`: Business logic and database operations (using Drizzle).
- `validation/`: Zod schemas for request validation (body, query, params).

### Service Instantiation
Services are centrally managed in `src/services/index.ts` using a **lazy-loading proxy pattern**. This ensures services are only instantiated when needed and provides a single point of access for all cross-module service dependencies.

### Routing
Routes are defined modularly within each controller and aggregated in `src/router/index.ts`. All API routes are versioned under `/v1`.

### Request Validation
Use the `validateRequest` middleware (in `src/middlewares/validateRequest.ts`) to validate incoming requests against Zod schemas. It handles `json`, `query`, and `param` validation consistently.

### Error Handling
A centralized error handling system is used:
- `src/utils/error.ts`: Defines `ApiError`, `Errors` utility, and standardized error codes (e.g., `AUTH_001`, `DB_001`).
- `src/middlewares/errorHandler.ts`: Global middleware to catch and format errors into a consistent JSON response.

### Database Patterns
- **Schema:** The single source of truth for the DB schema is `src/database/schemas/postgres/schema.ts`.
- **Instance:** The database instance is exported from `src/database/drizzle.ts`.
- **BigInt:** Custom JSON serialization for BigInt is handled in `src/server/app.ts` to prevent serialization errors.
- **Transactions:** Prefer using Drizzle's `tx` (transaction) for multi-step operations to ensure data integrity.

### Coding Style
- **Naming:** CamelCase for files and classes, camelCase for variables and functions.
- **Formatting:** Prettier is used for code formatting (`bun run format`).
- **Standardized Responses:** Use `sendSuccess` and `sendError` utilities (found in `src/utils/response.ts` and `src/utils/error.ts`) for consistent API responses.

## Key Files & Directories
- `index.ts`: Application entry point.
- `src/server/app.ts`: Hono app initialization, global middleware, and health checks.
- `src/router/index.ts`: Centralized route registration.
- `src/database/schemas/postgres/schema.ts`: Drizzle schema definitions.
- `src/services/index.ts`: Central service registry.
- `src/utils/error.ts`: Standardized error response utilities.
- `src/middlewares/`: Shared middlewares (auth, logger, validation, etc.).
