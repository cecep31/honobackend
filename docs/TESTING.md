# Testing Guide

This guide provides best practices and utilities for testing services in this Hono/TypeScript backend application.

## Testing Stack

- **Test Runner**: Bun's built-in test runner
- **Mocking**: Bun's `mock()` function and `mock.module()`
- **ORM**: Drizzle ORM with PostgreSQL

## Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test src/test/authservice.test.ts

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

## Test Structure

Tests are organized in `src/test/` with the naming convention `*service.test.ts`:

```
src/test/
├── helpers/
│   └── drizzleMock.ts       # Drizzle mocking utilities
├── authservice.test.ts
├── userservice.test.ts
├── postservice.test.ts
└── ...
```

## Mocking Drizzle ORM

### Problem: Complex Mocking

Drizzle ORM uses method chaining which requires complex mock setup:

```typescript
// Without helpers (old way) - NOT RECOMMENDED
const mockReturning = mock();
const mockValues = mock(() => ({ returning: mockReturning }));
const mockInsert = mock(() => ({ values: mockValues }));
const mockWhereDelete = mock(() => ({ returning: mockReturning }));
const mockDelete = mock(() => ({ where: mockWhereDelete }));
// ... 20+ more lines of boilerplate
```

### Solution: Helper Utilities

Use the helper utilities from `src/test/helpers/drizzleMock.ts`:

```typescript
import { createDrizzleMocks, createMockDb } from './helpers/drizzleMock';

// Create mocks once
const mocks = createDrizzleMocks();

mock.module('../database/drizzle', () => ({
  db: {
    insert: mocks.mockInsert,
    update: mocks.mockUpdate,
    delete: mocks.mockDelete,
    select: mocks.mockSelect,
    query: {
      users: {
        findFirst: mocks.mockFindFirst,
        findMany: mocks.mockFindMany,
      },
    },
  },
}));

describe('UserService', () => {
  beforeEach(() => {
    mocks.reset(); // Reset all mocks
  });

  it('should create a user', async () => {
    mocks.mockReturning.mockResolvedValue([{ id: 'user1' }]);
    // ... test implementation
  });
});
```

## Common Testing Patterns

### 1. Testing Simple Queries

For services using `db.query.table.findFirst()`:

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { createDrizzleMocks } from './helpers/drizzleMock';

const mocks = createDrizzleMocks();

mock.module('../database/drizzle', () => ({
  db: {
    query: {
      posts: {
        findFirst: mocks.mockFindFirst,
      },
    },
  },
}));

describe('PostService', () => {
  beforeEach(() => {
    mocks.reset();
  });

  it('should get post by id', async () => {
    const mockPost = { id: 'post1', title: 'Test' };
    mocks.mockFindFirst.mockResolvedValue(mockPost);

    const result = await postService.getPost('post1');

    expect(result).toEqual(mockPost);
    expect(mocks.mockFindFirst).toHaveBeenCalled();
  });
});
```

### 2. Testing Insert Operations

For services using `db.insert().values().returning()`:

```typescript
it('should create a new record', async () => {
  const newRecord = { id: 'new-id', name: 'Test' };
  mocks.mockReturning.mockResolvedValue([newRecord]);

  const result = await service.create({ name: 'Test' });

  expect(result).toEqual(newRecord);
  expect(mocks.mockInsert).toHaveBeenCalled();
});
```

### 3. Testing Update Operations

For services using `db.update().set().where().returning()`:

```typescript
it('should update a record', async () => {
  const updated = { id: 'id1', name: 'Updated' };
  mocks.mockReturning.mockResolvedValue([updated]);

  const result = await service.update('id1', { name: 'Updated' });

  expect(result).toEqual(updated);
  expect(mocks.mockUpdate).toHaveBeenCalled();
});
```

### 4. Testing Delete Operations

For services using `db.delete().where().returning()`:

```typescript
it('should delete a record', async () => {
  mocks.mockReturning.mockResolvedValue([{ id: 'deleted-id' }]);

  const result = await service.delete('deleted-id');

  expect(result).toHaveProperty('id', 'deleted-id');
  expect(mocks.mockDelete).toHaveBeenCalled();
});
```

### 5. Testing Complex Select Queries

For services using `db.select().from().join().where().orderBy()`:

```typescript
import { createChainableMock } from './helpers/drizzleMock';

it('should get posts with joins', async () => {
  const mockPosts = [{ id: '1', title: 'Test' }];
  
  // Create a chainable mock that resolves to mockPosts
  const chainMock = createChainableMock(mockPosts);
  mocks.mockSelect.mockReturnValue(chainMock);

  const result = await postService.getPostsWithAuthors();

  expect(result).toEqual(mockPosts);
});
```

### 6. Testing Transactions

For services using `db.transaction()`:

```typescript
import { setupTransactionMock } from './helpers/drizzleMock';

const mocks = createDrizzleMocks();

// Setup transaction mock with available tables
const txMocks = setupTransactionMock(mocks, {
  posts: { findFirst: mock() },
  tags: { findMany: mock() },
});

mock.module('../database/drizzle', () => ({
  db: {
    transaction: mocks.mockTransaction,
  },
}));

it('should handle transaction', async () => {
  mocks.mockReturning.mockResolvedValue([{ id: 'result' }]);

  const result = await service.createPostWithTags(data);

  expect(mocks.mockTransaction).toHaveBeenCalled();
  expect(result).toHaveProperty('id');
});
```

### 7. Testing with Multiple Query Tables

When your service queries multiple tables:

```typescript
const mocks = createDrizzleMocks();

mock.module('../database/drizzle', () => ({
  db: {
    insert: mocks.mockInsert,
    query: {
      users: {
        findFirst: mock(),
        findMany: mock(),
      },
      posts: {
        findFirst: mock(),
        findMany: mock(),
      },
    },
  },
}));
```

## Testing Services with Dependencies

### Testing Service Injection

For services that depend on other services (like `AuthService` depends on `UserService`):

```typescript
// Import from services/index.ts to use lazy-loaded singletons
import { authService } from '../services';

// Or create a new instance with mock dependencies
const mockUserService = {
  getUserByEmail: mock(),
  createUser: mock(),
};

const authService = new AuthService(mockUserService as any);
```

### Mocking External Dependencies

For services that use external APIs:

```typescript
// Mock axios
mock.module('axios', () => ({
  default: {
    post: mock(),
    get: mock(),
  },
}));

// Mock fetch
const mockFetch = mock();
globalThis.fetch = mockFetch as any;

// Restore in afterEach
afterEach(() => {
  globalThis.fetch = originalFetch;
});
```

## Testing Best Practices

### 1. Arrange-Act-Assert Pattern

```typescript
it('should do something', async () => {
  // Arrange: Setup mocks and data
  const testData = { id: '1', name: 'Test' };
  mocks.mockFindFirst.mockResolvedValue(testData);

  // Act: Execute the function
  const result = await service.doSomething('1');

  // Assert: Verify results and mock calls
  expect(result).toEqual(testData);
  expect(mocks.mockFindFirst).toHaveBeenCalledWith(/* expected args */);
});
```

### 2. Test Both Success and Error Cases

```typescript
describe('getUser', () => {
  it('should return user when found', async () => {
    mocks.mockFindFirst.mockResolvedValue({ id: '1' });
    const result = await service.getUser('1');
    expect(result).toBeDefined();
  });

  it('should return null when not found', async () => {
    mocks.mockFindFirst.mockResolvedValue(null);
    const result = await service.getUser('nonexistent');
    expect(result).toBeNull();
  });

  it('should throw on database error', async () => {
    mocks.mockFindFirst.mockRejectedValue(new Error('DB Error'));
    await expect(service.getUser('1')).rejects.toThrow();
  });
});
```

### 3. Reset Mocks in beforeEach

Always reset mocks to prevent test pollution:

```typescript
describe('ServiceTest', () => {
  beforeEach(() => {
    mocks.reset();
    // Or manually reset specific mocks
    mockSpecific.mockReset();
  });
});
```

### 4. Mock Configuration

Mock config module before importing services:

```typescript
mock.module('../config', () => ({
  default: {
    jwt: { secret: 'test-secret' },
    database: { url: 'test-db-url' },
  },
}));

import { authService } from '../services';
```

### 5. Test Service Methods, Not Implementation

Focus on testing behavior, not internal implementation:

```typescript
// Good: Test behavior
it('should create user and return id', async () => {
  const result = await service.createUser(userData);
  expect(result).toHaveProperty('id');
});

// Avoid: Testing internal details
it('should call db.insert with exact parameters', async () => {
  await service.createUser(userData);
  expect(mockInsert).toHaveBeenCalledWith(exactInternalParams);
});
```

## Common Issues and Solutions

### Issue: Mock Chain Not Working

**Problem**: Query chain returns undefined

```typescript
// This might fail
const result = await db.select().from(table).where(condition);
```

**Solution**: Ensure mock chains return the next mock in sequence

```typescript
const mockWhere = mock(() => Promise.resolve(mockData));
const mockFrom = mock(() => ({ where: mockWhere }));
mocks.mockSelect.mockReturnValue({ from: mockFrom });
```

Or use `createChainableMock()`:

```typescript
const chainMock = createChainableMock(mockData);
mocks.mockSelect.mockReturnValue(chainMock);
```

### Issue: Transaction Not Mocking Correctly

**Problem**: Transaction callback doesn't receive proper tx object

**Solution**: Use `setupTransactionMock()` helper:

```typescript
const txMocks = setupTransactionMock(mocks, {
  posts: { findFirst: mock() },
});

mocks.mockReturning.mockResolvedValue([{ id: 'result' }]);
await service.methodWithTransaction(data);
```

### Issue: Multiple Mock Calls

**Problem**: Mock is called multiple times with different expectations

**Solution**: Use `mockResolvedValueOnce()` for sequential calls:

```typescript
mocks.mockFindFirst
  .mockResolvedValueOnce({ id: 'user1' })
  .mockResolvedValueOnce({ id: 'user2' })
  .mockResolvedValueOnce(null);
```

## Example: Complete Test File

Here's a complete example using the helper utilities:

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createDrizzleMocks } from './helpers/drizzleMock';
import { LikeService } from '../modules/likes/services/likeService';

// Create mocks
const mocks = createDrizzleMocks();

// Mock database module
mock.module('../database/drizzle', () => ({
  db: {
    insert: mocks.mockInsert,
    delete: mocks.mockDelete,
    select: mocks.mockSelect,
  },
}));

describe('LikeService', () => {
  let likeService: LikeService;

  beforeEach(() => {
    likeService = new LikeService();
    mocks.reset();
  });

  describe('updateLike', () => {
    it('should add a like if it does not exist', async () => {
      const postId = 'post-1';
      const userId = 'user-1';

      // Mock: check if like exists (returns empty)
      const mockWhere = mock(() => Promise.resolve([]));
      const mockFrom = mock(() => ({ where: mockWhere }));
      mocks.mockSelect.mockReturnValue({ from: mockFrom });

      // Mock: insert new like
      mocks.mockReturning.mockResolvedValue([{ id: 'new-like-id' }]);

      const result = await likeService.updateLike(postId, userId);

      expect(result.id).toBe('new-like-id');
      expect(mocks.mockInsert).toHaveBeenCalled();
    });

    it('should remove a like if it exists', async () => {
      const postId = 'post-1';
      const userId = 'user-1';

      // Mock: check if like exists (returns existing)
      const mockWhere = mock(() => Promise.resolve([{ id: 'existing-id' }]));
      const mockFrom = mock(() => ({ where: mockWhere }));
      mocks.mockSelect.mockReturnValue({ from: mockFrom });

      // Mock: delete like
      mocks.mockReturning.mockResolvedValue([{ id: 'existing-id' }]);

      const result = await likeService.updateLike(postId, userId);

      expect(result.id).toBe('existing-id');
      expect(mocks.mockDelete).toHaveBeenCalled();
    });
  });
});
```

## Testing Service Dependencies

### Services with Constructor Injection

For services like `AuthService` that receive dependencies:

```typescript
import { AuthService } from '../modules/auth/services/authService';

describe('AuthService', () => {
  // Create mock UserService
  const mockUserService = {
    getUserByEmail: mock(),
    getUserByUsername: mock(),
    createUser: mock(),
  };

  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(mockUserService as any);
    mockUserService.getUserByEmail.mockReset();
  });

  it('should sign in with email', async () => {
    mockUserService.getUserByEmail.mockResolvedValue({
      id: 'user1',
      email: 'test@example.com',
      password: 'hashedpassword',
    });

    // ... rest of test
  });
});
```

### Services Using Lazy-Loaded Singletons

For services imported from `src/services/index.ts`:

```typescript
// Option 1: Use the singleton directly (simpler)
import { authService } from '../services';

// The database mock will affect the singleton

// Option 2: Create new instance (more control)
import { AuthService } from '../modules/auth/services/authService';
const authService = new AuthService(mockUserService);
```

## Mocking External Services

### Mocking Config

Always mock config before importing services:

```typescript
mock.module('../config', () => ({
  default: {
    jwt: {
      secret: 'test-secret',
      expiresIn: '1d',
    },
    github: {
      CLIENT_ID: 'test-id',
      CLIENT_SECRET: 'test-secret',
    },
  },
}));

// Import services AFTER mocking config
import { authService } from '../services';
```

### Mocking S3

```typescript
const mockUploadFile = mock();
const mockDeleteFile = mock();

mock.module('../utils/s3', () => ({
  getS3Helper: mock(() => ({
    uploadFile: mockUploadFile,
    deleteFile: mockDeleteFile,
  })),
}));
```

### Mocking HTTP Libraries

```typescript
// Mock axios
mock.module('axios', () => ({
  default: {
    post: mock(),
    get: mock(),
  },
}));

// Mock native fetch
const originalFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = mock();
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});
```

## Testing Tips

### 1. Mock Only What You Need

Don't mock the entire database if you only need `findFirst`:

```typescript
// Minimal mock
mock.module('../database/drizzle', () => ({
  db: {
    query: {
      users: {
        findFirst: mock(),
      },
    },
  },
}));
```

### 2. Use Type Assertions for Mocks

When passing mocks to constructors:

```typescript
const mockService = {
  method1: mock(),
  method2: mock(),
} as any; // or use proper typing

new ServiceUnderTest(mockService);
```

### 3. Test Error Handling

Always test error scenarios:

```typescript
it('should handle database errors gracefully', async () => {
  mocks.mockFindFirst.mockRejectedValue(new Error('Connection lost'));

  await expect(service.getUser('id')).rejects.toThrow();
});
```

### 4. Verify Mock Call Arguments

Check that services call mocks with correct parameters:

```typescript
it('should call database with correct data', async () => {
  mocks.mockReturning.mockResolvedValue([{ id: 'new-id' }]);

  await service.create({ name: 'Test' });

  expect(mocks.mockInsert).toHaveBeenCalled();
  // Can also check call arguments if needed
  expect(mocks.mockValues).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Test' })
  );
});
```

### 5. Use describe Blocks for Organization

Group related tests together:

```typescript
describe('UserService', () => {
  describe('getUser', () => {
    it('should return user when found', async () => {});
    it('should return null when not found', async () => {});
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {});
    it('should throw on duplicate email', async () => {});
  });
});
```

## Advanced Patterns

### Testing Pagination

```typescript
it('should return paginated results', async () => {
  const mockData = [{ id: '1' }, { id: '2' }];
  mocks.mockFindMany.mockResolvedValue(mockData);

  // Mock count query
  const mockWhere = mock(() => Promise.resolve([{ count: 10 }]));
  const mockFrom = mock(() => ({ where: mockWhere }));
  mocks.mockSelect.mockReturnValue({ from: mockFrom });

  const result = await service.getUsers({ limit: 10, offset: 0 });

  expect(result.data).toHaveLength(2);
  expect(result.meta.total_items).toBe(10);
});
```

### Testing with Time-Dependent Logic

```typescript
it('should check token expiration', async () => {
  const futureDate = new Date(Date.now() + 86400000);
  mocks.mockFindFirst.mockResolvedValue({
    token: 'valid-token',
    expires_at: futureDate.toISOString(),
  });

  const result = await service.validateToken('valid-token');

  expect(result).toBe(true);
});
```

## Running and Debugging Tests

### Run Single Test

```bash
bun test src/test/authservice.test.ts
```

### Run with Verbose Output

```bash
bun test --verbose
```

### Debug Test

Use `console.log()` in tests or add debugging in service code during testing.

### Watch Mode

```bash
bun test --watch
```

This will re-run tests when files change.

## FAQ

### Q: Why not use repository pattern?

**A**: Repository pattern adds another abstraction layer. Current structure works well with proper mocking utilities.

### Q: Should I mock the entire database?

**A**: No, only mock what your service uses. This makes tests faster and more focused.

### Q: How do I test methods that use `sql` template literals?

**A**: Mock the final result, not the SQL generation. Focus on testing behavior.

```typescript
// Service uses: sql`COALESCE(SUM(${field}), 0)`
// Test the result, not the SQL
mocks.mockWhere.mockResolvedValue([{ sum: 100 }]);
```

### Q: Can I use real database for testing?

**A**: Yes, but it's slower. For unit tests, use mocks. For integration tests, consider using a test database.

## References

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- Current test examples in `src/test/` directory
