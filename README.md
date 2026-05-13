# 🚀 Hono Backend

A high-performance, type-safe REST API built with [Hono](https://hono.dev/) running on the [Bun](https://bun.sh/) runtime. This project follows a modular, service-oriented architecture (SOA) and uses [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL for robust data management.

## ✨ Key Features

- **🛡️ Comprehensive Authentication:** JWT-based flows, session management, password resets via Resend, and GitHub OAuth integration.
- **📝 Content Ecosystem:** Full CRUD for Posts (with snippets, publication states, and slugs), Comments, Likes, and Tags.
- **💬 Real-time Interaction:** Chat system with multi-conversation support and AI integration via OpenRouter.
- **📊 Advanced Analytics:** Dedicated report service for user growth, post performance, and engagement metrics.
- **🏷️ Specialized Modules:** Holding management (financial/asset tracking), Bookmarks with folder organization, and a robust Notification system.
- **⚡ Performance Optimized:** Redis/Valkey caching for trending content and frequently accessed feeds.
- **✅ Type-safe & Validated:** Global request validation using Zod and strict TypeScript configuration.
- **🔍 SEO Ready:** Built-in support for sitemap data and search-friendly URL structures.

## 🛠️ Tech Stack

- **Runtime:** [Bun](https://bun.sh/)
- **Framework:** [Hono](https://hono.dev/)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Cache:** [Redis](https://redis.io/) / [Valkey](https://valkey.io/)
- **Validation:** [Zod](https://zod.dev/)
- **Email:** [Resend](https://resend.com/)
- **AI:** [OpenRouter](https://openrouter.ai/)

## 🏗️ Architecture

The project is organized into domain-driven modules under `src/modules/`:

```text
src/modules/<feature>/
  ├── controllers/     # Hono route handlers & entry points
  ├── services/        # Business logic & DB interactions
  └── validation/      # Zod schemas for request validation
```

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- PostgreSQL
- Redis/Valkey (optional, but recommended for caching)

### Installation

1. **Clone the repository:**
   ```sh
   git clone <repository-url>
   cd honobackend
   ```

2. **Install dependencies:**
   ```sh
   bun install
   ```

3. **Environment Setup:**
   Copy the example environment file and fill in your credentials:
   ```sh
   cp .env.example .env
   ```

4. **Database Migration:**
   ```sh
   bun run db:push
   # OR for formal migrations:
   bun run db:generate
   bun run db:migrate
   ```

5. **Start Development Server:**
   ```sh
   bun run dev
   ```
   The API will be available at `http://localhost:3001/api`.

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `bun run dev` | Starts the development server with hot reload |
| `bun test` | Runs the test suite |
| `bun run typecheck` | Runs TypeScript type checking |
| `bun run lint` | Lints the codebase |
| `bun run format` | Formats code using Prettier |
| `bun run build` | Builds the project for production (dist/) |
| `bun run build:compile` | Compiles a native binary for production (bin/) |
| `bun run db:studio` | Opens Drizzle Studio UI |
| `bun run clean` | Removes build artifacts |

## 🐳 Docker & Deployment

The project includes a multi-stage `Dockerfile` that compiles a native binary for maximum performance and minimal image size.

**Build Image:**
```sh
docker build -t cecep31/honobackend:latest .
```

**Run Container:**
```sh
docker run -p 3001:3001 --env-file .env cecep31/honobackend:latest
```

Deployment is configured for [Fly.io](https://fly.io/) via `fly.toml`.

## 📖 Documentation

- API routes and endpoints are wired in `src/router/index.ts`.
- Detailed module documentation can be found in the respective `src/modules/*/README.md` files (if available).
- Project guidelines and agent-specific notes are in `AGENTS.md` and `GEMINI.md`.

## 📄 License

This project is licensed under the MIT License.