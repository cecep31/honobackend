# AGENTS.md

Guidelines for agentic coding tools working with this Hono/TypeScript backend.

## Build/Lint/Test Commands

```bash
bun run typecheck          # TypeScript type checking (tsc --noEmit)
bun run lint               # ESLint
bun run lint:fix           # ESLint with auto-fix
bun run format             # Format with Prettier
bun test                   # Run all tests
bun test <file>            # Run single test
bun test --coverage        # Coverage report
bun run dev                # Dev server with hot reload (localhost:3001)
bun run build              # Typecheck + bundle to dist/
bun run build:compile      # Typecheck + compile native binary to bin/
bun run start:prod         # Run from dist/
bun run db:generate        # Generate Drizzle migrations
bun run db:push            # Push schema changes directly (no migration files)
bun run db:pull            # Pull schema from database
bun run db:studio          # Open Drizzle Studio
bun run clean              # Remove dist/ and bin/
```

Pre-commit order: `bun run typecheck && bun run lint && bun test`.

## Code Style

- ES modules (`import/export`), `"type": "module"` in package.json
- Prettier: 2-space, single quotes, semicolons, trailingComma `es5`, 100 char max, LF endings
- TypeScript strict mode, Zod v4 for validation
- Naming: `camelCase` vars/functions, `PascalCase` types/classes, `UPPER_CASE` constants, `_` prefix for private members

## Error Handling

Use `Errors` from `src/utils/error.ts`:

```typescript
import { Errors } from '../../../utils/error';
throw Errors.NotFound('User');
throw Errors.ValidationFailed([{ field: 'email', message: 'Required' }]);
throw Errors.Unauthorized();
throw Errors.Forbidden();
throw Errors.InvalidCredentials();
throw Errors.TooManyRequests(60);
throw Errors.BusinessRuleViolation('rule');
throw Errors.InternalServerError();
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

Response shape: `{ success, data, message, request_id, timestamp, meta? }`.
Error shape: `{ success: false, message, error: { code?, details? }, request_id, timestamp }`.

## Architecture

### Entry point
- `index.ts` — exports default server config for `bun.serve()` (port from `PORT` env, default 3001). Handles graceful shutdown, uncaught exceptions.
- `src/server/app.ts` — creates Hono app, applies timeout (30s), compression, error handler, middlewares, routes. Exposes `/health` and `/ready` endpoints.

### Routing
- All API routes under `/v1`, wired in `src/router/index.ts` via `setupRouter(app)`.
- 13 feature modules: auth, users, posts, tags, likes, writers, chat, holdings, bookmarks, comments, notifications, reports.

### Module structure
```
src/modules/<feature>/
  controllers/     # Factory functions returning Hono apps
  services/        # Business logic classes
  validation/      # Zod schemas (body.ts, query.ts, param.ts)
```

### Service layer (`src/services/index.ts`)
Services use **lazy-loading proxy** via `createLazyService()`. Import pre-created singletons:
```typescript
import { authService, userService } from '../services';
```
Services receive dependencies via constructor. Dependency graph is wired in `createServices()`.

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

### Context variables (`src/types/context.ts`)
```typescript
type Variables = { user: jwtPayload; requestId: string };
```
JWT payload: `user_id`, `email`, `is_super_admin`, `exp`. Expiration from `JWT_EXPIRES_IN` env (default `1d`).

## Middlewares (`src/middlewares/index.ts`)
Applied in order: requestId → logging → bodyLimit (default 10MB) → CORS → rateLimiter (150 req/min, toggleable via `RATE_LIMITER` env). Rate limiter uses `CleanupStore` with automatic cleanup — call `shutdownMiddlewares()` on graceful shutdown.

## Testing

Bun test runner, files in `src/test/`. Use helpers from `src/test/helpers/drizzleMock.ts`:

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createDrizzleMocks, createMockDb, createChainableMock } from './helpers/drizzleMock';

const { mocks, db: mockDb } = createMockDb({ users: { findFirst: mockFindFirst } });

mock.module('../database/drizzle', () => ({ db: mockDb }));

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

## Security & Best Practices

- Validate all input with Zod
- Never log sensitive data
- Use transactions for multi-step operations
- BigInt serialization patched in `src/server/app.ts`
- Server errors return generic message (no stack traces to clients)
- `MAIN_DOMAIN` env defaults to `pilput.net`
