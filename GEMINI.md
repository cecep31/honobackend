# Hono Backend Project Context

## Project Overview
This is a high-performance backend API built with **Hono** running on the **Bun** runtime. It uses **PostgreSQL** as the database, managed by **Drizzle ORM**. The architecture is **modular**, where features (auth, users, posts, etc.) are organized into self-contained modules within `src/modules/`.

## Tech Stack
- **Runtime:** [Bun](https://bun.sh/)
- **Framework:** [Hono](https://hono.dev/)
- **Database:** PostgreSQL
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Validation:** [Zod](https://zod.dev/) & `@hono/zod-validator`
- **Testing:** Bun Test

## Architecture & Patterns
The project uses a **Feature-Based Module** architecture. Each module in `src/modules/` contains its own controller, service, and validation logic.

1.  **Entry Point (`index.ts` & `src/server/app.ts`)**: Initializes the Hono app, configures middleware (timeout, error handling, logging), and sets up the main router.
2.  **Router (`src/router/index.ts`)**: Aggregates routes from various modules and mounts them (e.g., `/v1/users`, `/v1/auth`).
3.  **Modules (`src/modules/<feature>/`)**:
    -   **Controller (`*Controller.ts`)**: Handles HTTP requests, validation, and responses.
    -   **Service (`*Service.ts`)**: Encapsulates business logic and performs database operations via Drizzle.
    -   **Validation (`validation/*.ts`)**: Zod schemas for request validation.
4.  **Database (`src/database/`)**:
    -   `drizzle.ts`: Database connection setup.
    -   `schemas/postgre/schema.ts`: Centralized Drizzle schema definitions.

## Key Files & Directories
- `index.ts`: Application entry point.
- `src/server/app.ts`: App configuration and middleware setup.
- `src/router/index.ts`: Main route definitions.
- `src/modules/`: Feature modules (e.g., `auth`, `users`, `posts`).
- `src/database/schemas/postgre/schema.ts`: Database schema definition.
- `drizzle.config.ts`: Configuration for Drizzle Kit.

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
2.  **Module:** Create a new directory in `src/modules/<feature_name>`.
3.  **Service:** Create `<feature>Service.ts` for logic and DB queries.
4.  **Validation:** Create `validation/<feature>.ts` with Zod schemas.
5.  **Controller:** Create `<feature>Controller.ts` to handle HTTP requests.
6.  **Route:** Register the new controller in `src/router/index.ts`.