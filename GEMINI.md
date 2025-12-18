# Hono Backend Project Context

## Project Overview

This project is a high-performance backend API built with **Hono** running on the **Bun** runtime. It uses **PostgreSQL** as the primary database, accessed via **Drizzle ORM**. The architecture follows a clean, layered approach ensuring separation of concerns and maintainability.

### Key Technologies

*   **Runtime:** [Bun](https://bun.sh/)
*   **Framework:** [Hono](https://hono.dev/)
*   **Language:** TypeScript
*   **Database:** PostgreSQL
*   **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
*   **Validation:** Zod
*   **Package Manager:** Bun

## Architecture

The application is structured using a Layered Architecture pattern:

1.  **Interface Layer (`src/controllers` & `src/router`)**: Handles HTTP requests, input validation, and route definitions.
2.  **Service Layer (`src/pkg/services`)**: Contains the core business logic.
3.  **Data Access Layer (`src/pkg/repository`)**: Abstraction for database operations.
4.  **Domain Layer (`src/domain` & `src/types`)**: Defines core entities and types.
5.  **Infrastructure (`src/database`)**: Database connection and schema definitions.

### Directory Structure

*   `src/server/app.ts`: Main Hono application instance and global error handling.
*   `src/router/index.ts`: API route registration (versioned under `/v1`).
*   `src/middlewares/`: Custom middleware (Auth, Logger, Rate Limiter, Validation).
*   `src/database/drizzle.ts`: Database connection configuration.
*   `src/database/schemas/postgre/schema.ts`: Drizzle schema definitions.

## Development Workflow

### Prerequisites

*   Bun runtime installed.
*   PostgreSQL database running.
*   `.env` file configured (copy from `.env.example`).

### Key Commands

| Action | Command | Description |
| :--- | :--- | :--- |
| **Install** | `bun install` | Install project dependencies. |
| **Dev Server** | `bun run dev` | Start the server with hot-reloading (port 3001). |
| **Build** | `bun run build` | Compile and minify the project to `dist/`. |
| **Start Prod** | `bun run start:prod` | Run the compiled application. |
| **Typecheck** | `bun run typecheck` | Run TypeScript type checking. |
| **Test** | `bun test` | Run the test suite (using Bun's test runner). |

### Database Management (Drizzle)

| Action | Command | Description |
| :--- | :--- | :--- |
| **Generate** | `bun run db:generate` | Generate SQL migrations from schema changes. |
| **Migrate** | `bun run db:migrate` | Apply migrations to the database. |
| **Studio** | `bun run studio` | Open Drizzle Studio UI to manage data. |

## Coding Conventions

*   **Strict Typing:** Maintain strict TypeScript types. Use Zod for runtime validation of request data.
*   **Error Handling:** Use the custom `AppError` class and global error handler. Do not fail silently.
*   **Formatting:** Follow the existing code style (standard JS/TS conventions).
*   **Imports:** Use relative imports within the `src` directory.
*   **Environment:** Access environment variables via `process.env` or the configuration wrapper in `src/config`.

## Key Features

*   **Authentication:** Session-based auth with support for GitHub OAuth.
*   **Rate Limiting:** Configurable rate limiting middleware.
*   **API Versioning:** Routes are prefixed (e.g., `/v1`).
*   **Logging:** Structured logging middleware.
