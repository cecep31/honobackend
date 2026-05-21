# AGENTS.md

Guidelines for agentic coding tools working with this Hono/TypeScript backend.

## Build/Lint/Test Commands

```bash
bun run typecheck          # tsc --noEmit
bun run lint               # ESLint (ignores dist/, bin/, drizzle/, node_modules/, *.config.js, *.config.ts)
bun run lint:fix           # ESLint with auto-fix
bun run format             # Prettier — ONLY src/**/*.ts (does not format root/config/tests)
bun test                   # Run all tests
bun test <file>            # Run single test
bun test --watch           # Watch mode
bun test --coverage        # Coverage report
bun run dev                # Dev server with hot reload (localhost:3001 via bun --hot)
bun run build              # Typecheck + bundle to dist/ (--target bun, minified)
bun run build:compile      # Typecheck + compile native binary to bin/honobackend
bun run start:prod         # Run from dist/index.js
bun run db:generate        # Generate Drizzle migrations
bun run db:migrate         # Apply migrations (uses drizzle/my-migrations-table)
bun run db:push            # Push schema changes directly (no migration files)
bun run db:pull            # Pull schema from database
bun run db:studio          # Open Drizzle Studio
bun run clean              # Remove dist/ and bin/
```

Pre-commit verification order: `bun run typecheck && bun run lint && bun test`. CI runs the same order on push to `main`.

**`bunfig.toml`** sets `minimumReleaseAge = 86400` — `bun install` will reject packages published < 24h ago. If you need a brand-new version, temporarily comment this out.

## Code Style

- Prettier: 2-space, single quotes, semicolons, trailingComma `es5`, 100 char max, LF endings
- TypeScript strict mode, Zod v4 for validation, `@hono/zod-validator` for route validation
- `verbatimModuleSyntax: true` in tsconfig — use `import type` for type-only imports
- Naming: `camelCase` vars/functions, `PascalCase` types/classes, `UPPER_CASE` constants, `_` prefix for private/unused vars
- ESLint: `@typescript-eslint/no-explicit-any` is **off**, `@typescript-eslint/no-unsafe-function-type` is **off**, unused vars with `_` prefix are ignored

## Error Handling

Use `Errors` from `src/utils/error.ts`:

```typescript
import { Errors } from '../../../utils/error';
throw Errors.NotFound('User');
throw Errors.ValidationFailed([{ field: 'email', message: 'Required' }]);
throw Errors.InvalidInput('email', 'Invalid email format');
throw Errors.Unauthorized();
throw Errors.Forbidden();
throw Errors.InvalidCredentials();
throw Errors.DatabaseError(details);
throw Errors.ExternalServiceError('OpenRouter');
throw Errors.BusinessRuleViolation('rule');
throw Errors.TooManyRequests(60);
throw Errors.InternalServerError();
throw Errors.ServiceUnavailable();
```

Error codes: `AUTH_001`-`003`, `VALID_001`-`002`, `DB_001`-`003`, `EXT_001`-`002`, `BIZ_001`-`002`, `SYS_001`-`002`, `RATE_001`.

For raw HTTP errors use `errorHttp(message, statusCode, errorCode?, details?)` which throws `ApiError`.

## API Responses

Use `sendSuccess` from `src/utils/response.ts`:
```typescript
import { sendSuccess } from '../../../utils/response';
return sendSuccess(c, { user }, 'User created', 201);
// With pagination:
return sendSuccess(c, items, 'OK', 200, { total, limit, offset, hasMore });
```

Response shape: `{ success, data, message, timestamp, meta? }`.
Error shape: `{ success: false, message, timestamp }` with optional flat fields: `error` (classification code string), `details`, and `errors` (validation issues when `VALID_001`).

## Architecture

### Entry point
- `index.ts` — exports default server config for `bun.serve()` (port from `PORT` env, default 3001). Runs `runStartupChecks()` before serving. Handles graceful shutdown: `shutdownMiddlewares() → shutdownServices() → shutdownDatabase()`.
- `src/server/app.ts` — creates Hono app, applies timeout (30s), compression, error handler, middlewares, routes. Exposes `/health` and `/ready` endpoints (both probe the database).

### Routing
- All API routes under `/api`, wired in `src/router/index.ts` via `setupRouter(app)`.
- 12 controllers (12 feature modules): auth, users, posts, tags, likes, chat, holding-types, holdings, bookmarks, comments, notifications, reports.
- `holdingTypeController` and `holdingController` both use `HoldingService` (no separate HoldingTypeService).

### Module structure
```
src/modules/<feature>/
  controllers/     # Factory functions returning Hono apps
  services/        # Business logic classes
  validation/      # Zod schemas exported from index.ts (body.ts, query.ts, param.ts)
```

### Service layer (`src/services/index.ts`)
Services use **lazy-loading proxy** via `createLazyService()`. Import pre-created singletons:
```typescript
import { authService, userService } from '../services';
```
Services receive dependencies via constructor. Dependency graph is wired in `createServices()`:
- `userService → notificationService`
- `authService → userService` (authController also receives `activityService`)
- `postService → cacheService` (Redis/Valkey)
- `chatService → openrouterService`
- `commentService → notificationService`
- `cacheService` — standalone `RedisCacheService` (backed by `VALKEY_URL` or `REDIS_URL` env)

### Controllers
Factory functions that receive services and return Hono route apps:
```typescript
export function createPostController(postService: PostService, userService: UserService) {
  const app = new Hono<{ Variables: Variables }>();
  app.get('/', handler);
  return app;
}
```

### Request validation
```typescript
import { validateRequest } from '../../middlewares/validateRequest';
app.post('/', validateRequest('json', bodySchema), handler);
// Supports: 'json' | 'query' | 'param' | 'cookie' | 'header' | 'form'
```

### Authentication
Protected routes use `auth` middleware from `src/middlewares/auth.ts`:
```typescript
import { auth } from '../../middlewares/auth';
app.get('/', auth, handler);
```
The middleware validates Bearer JWT (HS256) and sets `c.set('user', userPayload)`.

### Database (Drizzle ORM)
```typescript
import { db } from '../../../database/drizzle';
import { users } from '../../../database/schemas/postgres/schema';
import { eq } from 'drizzle-orm';

const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
await db.insert(users).values(data).returning();
await db.update(users).set(data).where(eq(users.id, id)).returning();
```
Schema source of truth: `src/database/schemas/postgres/schema.ts`. Tables use `deleted_at` for soft deletes.
Migrations table is custom: `my-migrations-table` (see `drizzle.config.ts`). Relations defined in `drizzle/relations.ts`.

### Context variables (`src/types/context.ts`)
```typescript
type Variables = { user: jwtPayload };
```
JWT payload: `user_id`, `email`, `is_super_admin` (TypeScript type in `src/types/auth.ts`). JWT `exp` is handled by the library but not included in the app-level type.

## Middlewares (`src/middlewares/index.ts`)
Applied in order: logging → bodyLimit (default 10MB) → CORS → optional global rate limiter (`RATE_LIMIT_MAX` requests/min per IP; default **0** = off, set **> 0** to enable). Rate limiter uses `CleanupStore` with automatic cleanup — call `shutdownMiddlewares()` on graceful shutdown.

## Startup Checks
`index.ts` calls `runStartupChecks()` (from `src/server/startupCheck.ts`) before serving. It probes database, Valkey/Redis cache, S3, OpenRouter, and Resend email — logging pass/fail/skip. Missing optional services are logged as skipped (not fatal); database failure will surface at request time.

## Testing

Bun test runner, files in `src/test/`. **tsconfig excludes `**/*.test.ts`.**

Use helpers from `src/test/helpers/drizzleMock.ts`, and **mock dependencies BEFORE importing services that use them**:

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createDrizzleMocks, setupTransactionMock } from './helpers/drizzleMock';

// Mock config and db BEFORE service imports
mock.module('../config', () => ({ default: { jwt: { secret: 'test', expiresIn: '1d' } } }));
const mocks = createDrizzleMocks();
mock.module('../database/drizzle', () => ({ db: { insert: mocks.mockInsert, ... } }));

import { authService } from '../services';

describe('Service', () => {
  beforeEach(() => mocks.reset());
  it('should work', async () => {
    mocks.mockReturning.mockResolvedValue([{ id: '1' }]);
  });
});
```

For complex queries use `createChainableMock(result)`. For transactions use `setupTransactionMock(mocks, tables)`.

## Environment

Copy `.env.example` to `.env`. Required: `DATABASE_URL`, `JWT_SECRET` (min 32 chars). Config validated at startup in `src/config/index.ts`.

Key optional integrations: GitHub OAuth (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`), S3 storage, OpenRouter AI (`OPENROUTER_API_KEY`, code default model `google/gemma-2-9b-it:free`), Resend email for password resets, Valkey/Redis cache (`VALKEY_URL`; falls back to `REDIS_URL`).

DB pool defaults (code): `DB_MAX_CONNECTIONS=10`, `DB_IDLE_TIMEOUT=30`, `DB_CONNECT_TIMEOUT=10`, `DB_MAX_LIFETIME=1800`.

Note: `.env.example` shows `PORT=3000` but code default is 3001. Similarly `.env.example` shows `DB_MAX_CONNECTIONS=50` but code default is 10. The code defaults win when env vars are unset.

## Deploy

- Docker image: `cecep31/honobackend` (built from `Dockerfile`, multi-stage, compiles native binary)
- CI: push to `main` triggers quality gate (typecheck → lint → test) then Docker Hub build/push (`.github/workflows/build_deploy.yml`); Fly.io deploy step is currently commented out
- Runtime config: Fly.io (`fly.toml`), region `sin`, 256MB RAM + 128MB swap, port 3001
- `MAIN_DOMAIN` env defaults to `pilput.net`

## Repo Quirks

- BigInt serialization patched in `src/server/app.ts` (adds `toJSON` to prototype).
- Server errors return generic message; never send stack traces to clients.
- `bun --hot` used for dev (not nodemon or similar).
- `sanitize-html` dependency used for HTML sanitization (posts, comments).
- `resend` package for transactional email (password reset flows).
- `redis` package used for Valkey/Redis caching (`RedisCacheService` in `src/services/cacheService.ts`).
