# Hono Backend Project Context

## Project Overview

This project is a high-performance backend API built with **Hono** running on the **Bun** runtime. It uses **PostgreSQL** as the primary database, accessed via **Drizzle ORM**. The architecture is service-oriented, merging business logic and data access within the service layer for simplicity and efficiency.

### Key Technologies

*   **Runtime:** [Bun](https://bun.sh/)
*   **Framework:** [Hono](https://hono.dev/)
*   **Language:** TypeScript
*   **Database:** PostgreSQL
*   **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
*   **Validation:** Zod
*   **Package Manager:** Bun

## Architecture

The application is structured as follows:

1.  **Interface Layer (`src/controllers` & `src/router`)**: Handles HTTP requests, input validation (Zod), route definitions, and middleware integration. Controllers route requests to the appropriate services.
2.  **Service Layer (`src/pkg/services`)**: Contains both core business logic and direct database interactions using Drizzle ORM. Note: There is no separate Repository layer; data access is handled within services.
3.  **Domain Layer (`src/types`)**: Defines core entities and types, often mirroring the database schema or API contracts.
4.  **Infrastructure (`src/database`)**: Database connection (`drizzle.ts`) and schema definitions (`schemas/postgre/schema.ts`).

### Directory Structure

*   `src/server/app.ts`: Main Hono application instance and global error handling.
*   `src/router/index.ts`: API route registration (versioned under `/v1`).
*   `src/controllers/`: Route handlers grouped by domain (e.g., `userController.ts`).
*   `src/pkg/services/`: Business logic and data access (e.g., `userService.ts`).
*   `src/middlewares/`: Custom middleware (Auth, Logger, Validation, SuperAdmin).
*   `src/database/drizzle.ts`: Database connection configuration.
*   `src/database/schemas/postgre/schema.ts`: Drizzle schema definitions.
*   `index.ts`: Application entry point.

## Development Workflow

### Prerequisites

*   Bun runtime installed.
*   PostgreSQL database running.
*   `.env` file configured.

### Key Commands

| Action | Command | Description |
| :--- | :--- | :--- |
| **Install** | `bun install` | Install project dependencies. |
| **Dev Server** | `bun run dev` | Start the server with hot-reloading (port 3001). |
| **Build** | `bun run build` | Compile and minify the project to `dist/`. |
| **Start Prod** | `bun run start:prod` | Run the compiled application. |
| **Typecheck** | `bun run typecheck` | Run TypeScript type checking (`tsc --noEmit`). |
| **Test** | `bun test` | Run the test suite (using Bun's test runner). |

### Database Management (Drizzle)

| Action | Command | Description |
| :--- | :--- | :--- |
| **Generate** | `bun run db:generate` | Generate SQL migrations from schema changes. |
| **Migrate** | `bun run db:migrate` | Apply migrations to the database. |
| **Studio** | `bun run studio` | Open Drizzle Studio UI to manage data. |

## Coding Conventions

*   **Strict Typing:** Maintain strict TypeScript types. Use Zod for runtime validation of request data in controllers.
*   **Error Handling:** Use the custom `AppError` (or similar) and global error handler. Controllers should handle successful responses, while errors are often thrown from services or validated in middleware.
*   **Service Pattern:** Services handle data access directly. Do not create separate repository files unless strictly necessary for abstraction.
*   **Formatting:** Follow existing patterns (Prettier/ESLint if configured, otherwise standard Bun/TS style).
*   **Imports:** Use relative imports within the `src` directory.
