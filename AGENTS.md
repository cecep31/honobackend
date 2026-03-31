# AGENTS.md

Guidelines for agentic coding tools working with this Hono/TypeScript backend.

## Build/Lint/Test Commands

```bash
bun run typecheck          # TypeScript type checking
bun run format             # Format with Prettier
bun test                   # Run all tests
bun test <file>            # Run single test (e.g., bun test src/test/authservice.test.ts)
bun test --watch           # Watch mode
bun test --coverage        # Coverage report
bun run dev                # Dev server with hot reload (localhost:3001)
bun run build              # Build to dist/
bun run build:compile      # Build compiled binary to bin/
bun run start:prod         # Start from dist/
bun run db:generate        # Generate Drizzle migrations
bun run db:push            # Push schema to database
bun run db:studio          # Open Drizzle Studio
bun run clean              # Remove build artifacts
```

## Code Style

### Imports
- Use ES modules (`import/export`)
- Group: framework → local → types
- Avoid wildcards; use named imports

### Formatting (.prettierrc)
- 2-space indentation, single quotes, semicolons
- Trailing commas (es5), max 100 chars per line
- LF line endings
- Run `bun run format` before committing

### Naming
- `camelCase`: variables, functions (`getUserById`)
- `PascalCase`: types, classes, interfaces (`UserService`)
- `UPPER_CASE`: constants (`JWT_SECRET`)
- Boolean prefix: `is`, `has`, `can` (`isActive`)
- Private members: underscore prefix (`_userService`)

### Types
- Use `interface` for complex objects, `type` for simple aliases
- Use Zod for request validation schemas
- Prefer type inference where possible
- TypeScript strict mode enabled

## Error Handling

### Error Codes (src/utils/error.ts)
- `1xxx`: Auth errors (`AUTH_001` Unauthorized, `AUTH_002` Forbidden)
- `2xxx`: Validation errors (`VALID_001`, `VALID_002`)
- `3xxx`: Database errors (`DB_001` NotFound, `DB_002` DatabaseError)
- `4xxx`: External service errors (`EXT_001`)
- `5xxx`: Business logic errors (`BIZ_001`)
- `6xxx`: System errors (`SYS_001`, `SYS_002`)
- `RATE_001`: Rate limiting

Use the `Errors` utility from `src/utils/error.ts`:
```typescript
import { Errors } from '../../../utils/error';
throw Errors.NotFound('User');
throw Errors.ValidationFailed({ field: 'email' });
throw Errors.Unauthorized();
throw Errors.Forbidden();
throw Errors.TooManyRequests(60);
```

## API Responses

Use `sendSuccess` from `src/utils/response.ts`:
```typescript
import { sendSuccess } from '../../../utils/response';
return sendSuccess(c, { user }, 'User created', 201);
```

Response format:
```json
{ "success": true, "data": {}, "message": "Success", "request_id": "abc", "timestamp": "..." }
```

For paginated responses, pass `meta` with `total`, `limit`, `offset`, `totalPages`, `hasMore`.

## Architecture Patterns

### Module Structure
```
src/modules/<feature>/
  controllers/     # Route handlers (factory functions)
  services/        # Business logic (classes)
  validation/      # Zod schemas (body.ts, query.ts, param.ts)
```

### Service Layer (src/services/index.ts)
Services use a **lazy-loading proxy pattern** via `createLazyService()`. Import singletons:
```typescript
import { authService, userService } from '../services';
```
Services receive dependencies via constructor:
```typescript
const authService = createLazyService(() => new AuthService(userService));
```

### Controllers
Controllers are factory functions that receive services and return Hono routes:
```typescript
export function createPostController(postService: PostService, userService: UserService) {
  const app = new Hono<{ Variables: Variables }>();
  app.get('/', handler);
  return app;
}
```

### Routing
Routes are versioned under `/v1`. Aggregated in `src/router/index.ts`.

### Request Validation
Use `validateRequest` from `src/middlewares/validateRequest.ts`:
```typescript
import { validateRequest } from '../../middlewares/validateRequest';
app.post('/', validateRequest('json', bodySchema), handler);
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

Schema source of truth: `src/database/schemas/postgres/schema.ts`

## JWT Tokens

Payload: `user_id`, `email`, `is_super_admin`, `exp`
Expiration: 5 hours (`5 * 60 * 60`)
Use `hono/jwt` for operations. Context variables typed in `src/types/context.ts`.

## Testing

Use Bun's test runner. Test files: `src/test/*.test.ts`.
Use `createDrizzleMocks()` and `setupTransactionMock()` from `src/test/helpers/drizzleMock.ts`:

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createDrizzleMocks, setupTransactionMock } from './helpers/drizzleMock';

const mocks = createDrizzleMocks();
setupTransactionMock(mocks, { users: { findFirst: mockUserFindFirst } });

mock.module('../database/drizzle', () => ({
  db: { insert: mocks.mockInsert, query: { users: { findFirst: mocks.mockFindFirst } } }
}));

describe('Service', () => {
  beforeEach(() => mocks.reset());
  it('should work', async () => {
    mocks.mockReturning.mockResolvedValue([{ id: '1' }]);
  });
});
```

## Security & Best Practices

- Validate all input with Zod
- Never log sensitive data (passwords, tokens, keys)
- Use transactions for multi-step operations
- Return consistent error responses with `requestId`
- Server errors return generic message to clients (no stack traces)
- BigInt serialization handled in `src/server/app.ts`
- Environment variables: see `.env.example`

## Git

- Use feature branches
- Keep commits small and focused
- Run `bun run typecheck` and `bun test` before committing
- Rebase before merging to main
