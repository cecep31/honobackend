# GEMINI.md - Hono Backend

## Project Overview

This is a high-performance backend API built with **Hono** running on the **Bun** runtime. It uses **PostgreSQL** as the primary database, with **Drizzle ORM** for type-safe database access and migrations.

The project follows a **Service-Oriented Architecture**, where business logic and data access are encapsulated in the service layer, separated from controllers and routing.

**Key Technologies:**
- **Framework:** Hono
- **Runtime:** Bun
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Validation:** Zod (via `@hono/zod-validator`)
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
- **Run migrations:** `bun run db:migrate` (via `README.md` reference)
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

### Routing
Routes are defined modularly within each controller and aggregated in `src/router/index.ts`. The API is versioned under `/v1`.

### Request Validation
Use the `validateRequest` middleware (in `src/middlewares/validateRequest.ts`) to validate incoming requests against Zod schemas.

### Error Handling
A centralized error handling system is used:
- `src/utils/error.ts`: Defines `ApiError`, `Errors` utility, and error codes.
- `src/middlewares/errorHandler.ts`: Global middleware to catch and format errors consistently.

### Database Patterns
- Schemas are defined in `src/database/schemas/postgre/schema.ts`.
- Database instance is exported from `src/database/drizzle.ts`.
- Prefer using Drizzle's `tx` (transaction) for multi-step operations in services.

### Coding Style
- **Naming:** CamelCase for files/classes, camelCase for variables/functions.
- **Formatting:** Prettier is enforced (`bun run format`).
- **BigInt:** Custom JSON serialization for BigInt is handled in `src/server/app.ts`.

## Key Files
- `index.ts`: Entry point.
- `src/server/app.ts`: Hono app initialization and global middleware.
- `src/router/index.ts`: Centralized route registration.
- `src/database/schemas/postgre/schema.ts`: Single source of truth for DB schema.
- `src/utils/error.ts`: Standardized error responses.
