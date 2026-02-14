# Project Overview

This is a high-performance backend API built with **Hono** on the **Bun** runtime, using **PostgreSQL** with **Drizzle ORM**. It features a service-oriented architecture, where business logic and data access are integrated in the service layer.

**Key Technologies:**

*   **Framework:** Hono
*   **Runtime:** Bun
*   **Database:** PostgreSQL
*   **ORM:** Drizzle
*   **Language:** TypeScript

**Features:**

*   Authentication and user management
*   Content management (posts, tags, comments, likes)
*   Social features (bookmarks, follows)
*   Chat functionality (via OpenRouter)
*   Request validation with Zod

# Building and Running

**Installation:**

```bash
bun install
```

**Development:**

To run the development server with hot-reloading:

```bash
bun run dev
```

The application will be available at `http://localhost:3001`.

**Building for Production:**

To build the project for production:

```bash
bun run build
```

This will create a production-ready build in the `dist/` directory.

**Running in Production:**

To start the production server:

```bash
bun run start:prod
```

# Testing

To run the test suite:

```bash
bun test
```

To run tests in watch mode:

```bash
bun test:watch
```

To generate a test coverage report:

```bash
bun test:coverage
```

# Database Management

This project uses Drizzle ORM for database migrations and management.

*   **Generate migrations:** `bun run db:generate`
*   **Apply migrations:** `bun run db:push`
*   **Drizzle Studio:** `bun run db:studio` (launches a GUI for the database)

# Development Conventions

*   **Code Style:** The project uses Prettier for code formatting. To format the code, run:
    ```bash
    bun run format
    ```
*   **Architecture:** The project follows a service-oriented architecture. Business logic is handled in service files (e.g., `userService.ts`), which are then used by controllers.
*   **Validation:** Request validation is done using Zod. Validation schemas are defined in the `validation` directory of each module.
*   **Routing:** Routes are defined in controller files within each module (e.g., `src/modules/users/controllers/userController.ts`) and then aggregated in `src/router/index.ts`.
*   **Error Handling:** A custom error handler is used to manage errors. See `src/middlewares/errorHandler.ts`.
