# Hono Backend Project Context

## Project Overview
This is a high-performance backend API built with **Hono** running on the **Bun** runtime. It uses **PostgreSQL** as the database, managed by **Drizzle ORM**. The architecture follows a Service-Controller pattern where business logic and data access are encapsulated within the service layer (no separate repository layer).

## Tech Stack
- **Runtime:** [Bun](https://bun.sh/)
- **Framework:** [Hono](https://hono.dev/)
- **Database:** PostgreSQL
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Validation:** [Zod](https://zod.dev/) & `@hono/zod-validator`
- **Testing:** Bun Test

## Architecture & Patterns
The project strictly integrates data access within the Service layer.

1.  **Entry Point (`index.ts` & `src/server/app.ts`)**: Initializes the Hono app, configures middleware (timeout, error handling, logging), and sets up routes.
2.  **Router (`src/router/`)**: Defines API endpoints and delegates to controllers.
3.  **Controllers (`src/controllers/`)**: Handles HTTP parsing, validation (via Zod schemas), calls Services, and formats JSON responses.
4.  **Services (`src/pkg/services/`)**: Contains all business logic and performs direct database operations using Drizzle.
5.  **Database (`src/database/`)**:
    -   `drizzle.ts`: Database connection and Drizzle client initialization.
    -   `schemas/postgre/schema.ts`: Drizzle schema definitions.
6.  **Validations (`src/validations/`)**: Centralized Zod schemas for request payload validation.

## Key Files
- `index.ts`: Application entry point.
- `src/server/app.ts`: Hono app configuration, middleware setup.
- `drizzle.config.ts`: Configuration for Drizzle Kit (migrations).
- `src/pkg/services/`: Core logic resides here (e.g., `userService.ts`, `postService.ts`).
- `src/database/schemas/postgre/schema.ts`: Database schema definition.

## Development Workflow

### Prerequisites
- Bun runtime installed.
- PostgreSQL database running.
- `.env` file configured (see `.env.example`).

### Key Commands
| Command | Description |
| :--- | :--- |
| `bun install` | Install dependencies. |
| `bun run dev` | Start development server with hot reloading (http://localhost:3001). |
| `bun run typecheck` | Run TypeScript type checking (`tsc --noEmit`). |
| `bun run build` | Build for production (output to `dist/`). |
| `bun run start:prod` | Run the production build. |
| `bun test` | Run the test suite. |

### Database Management (Drizzle)
| Command | Description |
| :--- | :--- |
| `bun run db:generate` | Generate SQL migrations from schema changes. |
| `bun run db:migrate` | Apply pending migrations to the DB. |
| `bun run db:push` | Push schema changes directly to the DB (prototyping). |
| `bun run studio` | Open Drizzle Studio to manage data visually. |

### Adding a New Feature
1.  **Database:** Define/Update tables in `src/database/schemas/postgre/schema.ts`.
    -   Run `bun run db:generate` and `bun run db:migrate`.
2.  **Types:** Add or update types in `src/types/`.
3.  **Service:** Create or update a service in `src/pkg/services/` to handle logic and DB queries.
4.  **Validation:** Define Zod schemas in `src/validations/` for input validation.
5.  **Controller:** Create a controller in `src/controllers/` to handle the HTTP request/response.
6.  **Route:** Register the new route in `src/router/index.ts`.
