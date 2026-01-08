# Project Overview

This is a high-performance backend API built with **Hono** running on the **Bun** runtime. It leverages **PostgreSQL** for data persistence, managed by **Drizzle ORM**.

The project is structured around a service-oriented architecture, where business logic is encapsulated in services and exposed via controllers grouped by feature modules.

## Tech Stack

*   **Runtime:** Bun
*   **Framework:** Hono
*   **Database:** PostgreSQL
*   **ORM:** Drizzle ORM
*   **Validation:** Zod
*   **Authentication:** JWT / Session-based (Custom implementation)
*   **Testing:** Bun Test

## Architecture

The codebase follows a **Modular Feature-based Architecture**:

*   **`src/modules/`**: Contains the core logic, organized by domain (e.g., `auth`, `users`, `posts`).
    *   `*Controller.ts`: Handles HTTP requests and responses.
    *   `*Service.ts`: Contains business logic and database interactions.
    *   `validation/`: Zod schemas for request validation.
*   **`src/services/`**: Instantiates and exports singleton service instances (lazy-loaded).
*   **`src/database/`**: Drizzle configuration and schema definitions.
    *   `schemas/postgre/schema.ts`: The main database schema definition.
*   **`src/middlewares/`**: Global and route-specific middleware (Auth, Error Handling, Validation).
*   **`src/router/`**: Centralized route registration.
*   **`src/server/`**: Application entry point (`app.ts`).

## Development Workflow

### Prerequisites
*   [Bun](https://bun.sh/) installed.
*   PostgreSQL database running.
*   `.env` file configured (see `.env.example`).

### Key Commands

| Action | Command | Description |
| :--- | :--- | :--- |
| **Install** | `bun install` | Install dependencies |
| **Dev Server** | `bun run dev` | Start server with hot-reload |
| **Build** | `bun run build` | Build for production (dist/index.js) |
| **Compile** | `bun run build:compile` | Compile to single executable binary |
| **Test** | `bun test` | Run unit/integration tests |
| **Typecheck** | `bun run typecheck` | Run TypeScript checks |

### Database Management (Drizzle)

| Action | Command | Description |
| :--- | :--- | :--- |
| **Generate** | `bun run db:generate` | Create SQL migrations from schema changes |
| **Migrate** | `bun run db:migrate` | Apply migrations to the database |
| **Push** | `bun run db:push` | Push schema changes directly (prototyping) |
| **Studio** | `bun run db:studio` | Open Drizzle Studio UI |

## Conventions & Standards

*   **Service Injection:** Services are instantiated in `src/services/index.ts` using a lazy-loading pattern. Always import services from there, not directly from the class files.
*   **Validation:** Use `zod` for all request validation (params, query, body) via the `validateRequest` middleware.
*   **Error Handling:** Throw custom errors using `Errors` from `src/utils/error.ts`. The global error handler will format them correctly.
*   **Pagination:** Use `getPaginationParams` and `getPaginationMetadata` helpers for list endpoints.
*   **Database Access:** Use the `db` instance from `src/database/drizzle.ts` within services.
*   **BigInt Handling:** A global patch is applied in `app.ts` to handle BigInt serialization in JSON.

## Documentation
Additional documentation can be found in the `docs/` directory, covering specific modules like Auth, Posts, and Users.
