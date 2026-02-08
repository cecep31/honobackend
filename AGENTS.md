# AGENTS.md

Guidelines for agentic coding tools working with this Hono/TypeScript backend.

## Build/Lint/Test Commands

```bash
bun run typecheck          # TypeScript type checking
bun run format             # Format with Prettier
bun test                   # Run all tests
bun test <file>            # Run single test file
bun test --watch           # Watch mode
bun test --coverage        # Coverage report
bun run dev                # Dev server with hot reload
bun run build              # Build to dist/
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
- Avoid wildcards

### Formatting
- 2-space indentation, single quotes, semicolons
- Max 100 chars per line
- Run `bun run format` before committing

### Naming
- `camelCase`: variables, functions (`getUserById`)
- `PascalCase`: types, classes (`UserService`)
- `UPPER_CASE`: constants (`JWT_SECRET`)
- Boolean prefix: `is`, `has`, `can` (`isActive`)
- Private members: underscore prefix (`_userService`)

### Types
- Use `interface` for complex objects, `type` for simple aliases
- Use Zod for request validation
- Prefer inference where possible

## Error Handling

### Error Codes
- `1xxx`: Auth errors (`AUTH_001`)
- `2xxx`: Validation errors (`VALID_001`)
- `3xxx`: Database errors (`DB_001`)
- `4xxx`: External service errors (`EXT_001`)
- `5xxx`: Business logic errors (`BIZ_001`)
- `6xxx`: System errors (`SYS_001`)

Use the `Errors` utility from `src/utils/error.ts`:
```typescript
import { Errors } from '../../../utils/error';
throw Errors.NotFound('User');
throw Errors.ValidationFailed({ field: 'email' });
```

## Architecture Patterns

### Module Structure
```
src/modules/<feature>/
  controllers/     # Route handlers
  services/        # Business logic
  validation/      # Zod schemas (body.ts, query.ts, param.ts)
```

### Hono Patterns
```typescript
// Register routes
app.get('/users', handler);
app.post('/users', validator, handler);

// Access context
c.var.user          // Request-scoped variables
c.req.parseBody()   // Parse body
c.req.query()       // Query params
c.json(data, 200)   // JSON response
```

### Database (Drizzle)
```typescript
import { db } from '../../../database/drizzle';
import { users } from '../../../database/schemas/postgre/schema';
import { eq } from 'drizzle-orm';

// Query API (preferred)
const user = await db.query.users.findFirst({
  where: eq(users.id, userId)
});

// CRUD operations
await db.insert(users).values(data).returning();
await db.update(users).set(data).where(eq(users.id, id)).returning();
await db.delete(users).where(eq(users.id, id)).returning();
```

## JWT Tokens

Payload includes: `user_id`, `email`, `is_super_admin`, `exp`
Expiration: 5 hours (`5 * 60 * 60`)
Use `hono/jwt` for operations.

## Testing

Use Bun's test runner with mocks:
```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createDrizzleMocks } from './helpers/drizzleMock';

const mocks = createDrizzleMocks();

mock.module('../database/drizzle', () => ({
  db: {
    insert: mocks.mockInsert,
    query: { users: { findFirst: mocks.mockFindFirst } }
  }
}));

describe('Service', () => {
  beforeEach(() => mocks.reset());
  
  it('should work', async () => {
    mocks.mockReturning.mockResolvedValue([{ id: '1' }]);
    // test code
  });
});
```

See `docs/TESTING.md` for detailed patterns.

## Security & Best Practices

- Validate all input with Zod
- Never log sensitive data
- Use transactions for multi-step operations
- Return consistent error responses with `requestId`
- Use development-only data pattern:
  ```typescript
  ...(process.env.NODE_ENV === 'development' && { debugInfo })
  ```

## Git

- Use feature branches
- Keep commits small and focused
- Run `bun run typecheck` and `bun test` before committing
- Rebase before merging to main
