# Testing

Tests menggunakan Bun test runner dengan mocking.

## Run Tests

```bash
bun test                    # Run all tests
bun test <file>             # Run single test
bun test --watch            # Watch mode
bun test --coverage         # Coverage report
```

## Test Helpers

Gunakan `createDrizzleMocks()` dari `src/test/helpers/drizzleMock.ts`:

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
    // test implementation
  });
});
```

Lihat contoh test di `src/test/`.
