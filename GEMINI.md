# Hono Backend Project Context

## Project Overview
This is a high-performance backend API built with **Hono** running on the **Bun** runtime. It uses **PostgreSQL** as the database, managed by **Drizzle ORM**. The architecture follows a Service-Controller pattern where business logic and data access are encapsulated within the service layer.

## Tech Stack
- **Runtime:** [Bun](https://bun.sh/)
- **Framework:** [Hono](https://hono.dev/)
- **Database:** PostgreSQL
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Validation:** [Zod](https://zod.dev/)
- **Testing:** Bun Test

## Architecture & patterns
The project does **not** use a separate repository layer. Data access is handled directly within the Service layer.

1.  **Router (`src/router/`)**: Defines API endpoints and maps them to controllers.
2.  **Controllers (`src/controllers/`)**: Handles HTTP requests, parses input (using Zod schemas), calls Services, and formats HTTP responses.
3.  **Services (`src/pkg/services/`)**: Contains business logic and performs direct database operations using Drizzle.
4.  **Database (`src/database/`)**:
    -   `drizzle.ts`: Database connection and client initialization.
    -   `schemas/postgre/schema.ts`: Drizzle schema definitions.
5.  **Types (`src/types/`)**: TypeScript interfaces and types shared across the application.
6.  **Validations (`src/validations/`)**: Zod schemas used for request validation.

## Key Files & Directories
- `index.ts`: Application entry point.
- `src/server/app.ts`: Hono app initialization, middleware setup, and error handling.
- `drizzle.config.ts`: Drizzle Kit configuration.
- `src/pkg/services/*.ts`: Core business logic (e.g., `userService.ts` handles user data and DB queries).

## Development Workflow

### Prerequisites
- Bun runtime installed.
- PostgreSQL database running (local or remote).
- `.env` file configured (copy from `.env.example`).

### Commands
| Command | Description |
| :--- | :--- |
| `bun install` | Install dependencies. |
| `bun run dev` | Start development server with hot reloading. |
| `bun run build` | Typecheck and build the application for production. |
| `bun run start:prod` | Run the built production application. |
| `bun test` | Run the test suite. |
| `bun run typecheck` | Run TypeScript type checking. |

### Database Management
| Command | Description |
| :--- | :--- |
| `bun run db:generate` | Generate migration files from schema changes. |
| `bun run db:migrate` | Apply pending migrations to the database. |
| `bun run studio` | Open Drizzle Studio to visualize and edit data. |

### Adding a New Feature
1.  **Database:** Define new tables in `src/database/schemas/postgre/schema.ts` if needed. Run `bun run db:generate` and `bun run db:migrate`.
2.  **Types:** Add necessary types in `src/types/`.
3.  **Service:** Create a service in `src/pkg/services/` to handle business logic and DB operations.
4.  **Validation:** Create Zod schemas in `src/validations/`.
5.  **Controller:** Create a controller in `src/controllers/` to handle the request.
6.  **Route:** Register the new route in `src/router/index.ts`.
