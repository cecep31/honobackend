# Hono Backend

A high-performance backend API built with **Hono** running on the **Bun** runtime, featuring **PostgreSQL** with **Drizzle ORM**.

## Features

- **Authentication:** Secure user auth flows.
- **Content Management:** Posts, Tags, and Likes.
- **Social Features:** Bookmarks and Chat (via OpenRouter).
- **Service-Oriented Architecture:** Business logic and data access integrated in the service layer.
- **Validation:** Type-safe request validation with Zod.

## Requirements

- [Bun](https://bun.sh/) runtime
- PostgreSQL database

## Setup

1. **Install dependencies:**
   ```sh
   bun install
   ```

2. **Configure environment:**
   Copy `.env.example` to `.env` and fill in your database credentials and other secrets.

3. **Run development server:**
   ```sh
   bun run dev
   ```
   Access at: http://localhost:3001

## Database Management

This project uses Drizzle ORM for database migrations and management.

- **Generate migrations:** `bun run db:generate`
- **Apply migrations:** `bun run db:migrate`
- **Push schema changes:** `bun run db:push`
- **Database Studio:** `bun run studio` (Visualizes your data)

## Testing

Run the test suite using Bun's built-in test runner:

```sh
bun test
```

## Build & Production

- **Typecheck:** `bun run typecheck`
- **Build:** `bun run build`
- **Start Production:** `bun run start:prod`