import { mock } from 'bun:test';

/**
 * Drizzle Mock Helpers
 * Provides reusable mock utilities for testing services with Drizzle ORM
 */

export interface DrizzleMocks {
  // Core CRUD operation mocks
  mockInsert: ReturnType<typeof mock>;
  mockUpdate: ReturnType<typeof mock>;
  mockDelete: ReturnType<typeof mock>;
  mockSelect: ReturnType<typeof mock>;
  mockTransaction: ReturnType<typeof mock>;

  // Chain method mocks
  mockReturning: ReturnType<typeof mock>;
  mockValues: ReturnType<typeof mock>;
  mockSet: ReturnType<typeof mock>;
  mockWhere: ReturnType<typeof mock>;
  mockFrom: ReturnType<typeof mock>;
  mockOrderBy: ReturnType<typeof mock>;
  mockLimit: ReturnType<typeof mock>;
  mockOffset: ReturnType<typeof mock>;
  mockInnerJoin: ReturnType<typeof mock>;
  mockLeftJoin: ReturnType<typeof mock>;
  mockGroupBy: ReturnType<typeof mock>;

  // Special chain mocks
  mockOnConflictDoNothing: ReturnType<typeof mock>;

  // Query API mocks
  mockFindFirst: ReturnType<typeof mock>;
  mockFindMany: ReturnType<typeof mock>;

  // Utility function to reset all mocks
  reset: () => void;
}

/**
 * Creates a complete set of Drizzle ORM mocks with proper chaining
 * @returns Object containing all mock functions and a reset utility
 */
export function createDrizzleMocks(): DrizzleMocks {
  // Terminal operation mock (returns results)
  const mockReturning = mock();

  // Insert chain: db.insert(table).values(data).returning()
  const mockValues = mock(() => ({ returning: mockReturning }));
  const mockInsert = mock(() => ({ values: mockValues }));

  // Update chain: db.update(table).set(data).where(condition).returning()
  const mockWhereUpdate = mock(() => ({ returning: mockReturning }));
  const mockSet = mock(() => ({ where: mockWhereUpdate }));
  const mockUpdate = mock(() => ({ set: mockSet }));

  // Delete chain: db.delete(table).where(condition).returning()
  const mockWhereDelete = mock(() => ({ returning: mockReturning }));
  const mockDelete = mock(() => ({ where: mockWhereDelete }));

  // Select chain: db.select().from(table).where(condition)
  const mockWhereSelect = mock();
  const mockOrderBy = mock();
  const mockLimit = mock();
  const mockOffset = mock();
  const mockInnerJoin = mock();
  const mockLeftJoin = mock();
  const mockGroupBy = mock();
  const mockFrom = mock(() => ({
    where: mockWhereSelect,
    orderBy: mockOrderBy,
    limit: mockLimit,
    offset: mockOffset,
    innerJoin: mockInnerJoin,
    leftJoin: mockLeftJoin,
    groupBy: mockGroupBy,
  }));
  const mockSelect = mock(() => ({ from: mockFrom }));

  // Special: Insert with conflict handling
  const mockOnConflictDoNothing = mock(() => ({ returning: mockReturning }));

  // Transaction mock
  const mockTransaction = mock();

  // Query API mocks
  const mockFindFirst = mock();
  const mockFindMany = mock();

  // Additional chain references
  const mockWhere = mockWhereUpdate;

  const reset = () => {
    // Reset all mocks
    mockReturning.mockReset();
    mockValues.mockClear();
    mockInsert.mockClear();
    mockSet.mockClear();
    mockWhere.mockClear();
    mockUpdate.mockClear();
    mockWhereDelete.mockClear();
    mockDelete.mockClear();
    mockWhereSelect.mockReset();
    mockFrom.mockClear();
    mockOrderBy.mockClear();
    mockLimit.mockClear();
    mockOffset.mockClear();
    mockInnerJoin.mockClear();
    mockLeftJoin.mockClear();
    mockGroupBy.mockClear();
    mockSelect.mockClear();
    mockOnConflictDoNothing.mockClear();
    mockTransaction.mockClear();
    mockFindFirst.mockReset();
    mockFindMany.mockReset();
  };

  return {
    mockInsert,
    mockUpdate,
    mockDelete,
    mockSelect,
    mockTransaction,
    mockReturning,
    mockValues,
    mockSet,
    mockWhere,
    mockFrom,
    mockOrderBy,
    mockLimit,
    mockOffset,
    mockInnerJoin,
    mockLeftJoin,
    mockGroupBy,
    mockOnConflictDoNothing,
    mockFindFirst,
    mockFindMany,
    reset,
  };
}

/**
 * Creates a chainable query builder mock for complex select queries
 * Useful for queries with multiple joins, groupBy, orderBy, etc.
 * @param finalResult The final result to return when the chain is awaited
 * @returns Chainable mock object
 */
export function createChainableMock(finalResult: any = []) {
  const chainMock: any = {};

  // Add all chainable methods
  const chainMethods = [
    'from',
    'where',
    'orderBy',
    'limit',
    'offset',
    'innerJoin',
    'leftJoin',
    'rightJoin',
    'groupBy',
  ];

  chainMethods.forEach((method) => {
    chainMock[method] = mock(() => chainMock);
  });

  // Make the chain awaitable (thenable)
  chainMock.then = (resolve: any) => resolve(finalResult);

  return chainMock;
}

/**
 * Creates a mock db instance with custom query tables
 * @param queryTables Object mapping table names to mock query methods
 * @param options Additional options for mock db
 * @returns Mock db object ready for use with mock.module()
 */
export function createMockDb(
  queryTables: Record<string, { findFirst?: any; findMany?: any }> = {},
  options: {
    includeInsert?: boolean;
    includeUpdate?: boolean;
    includeDelete?: boolean;
    includeSelect?: boolean;
    includeTransaction?: boolean;
  } = {}
) {
  const mocks = createDrizzleMocks();

  const {
    includeInsert = true,
    includeUpdate = true,
    includeDelete = true,
    includeSelect = true,
    includeTransaction = false,
  } = options;

  const dbMock: any = {};

  if (includeInsert) dbMock.insert = mocks.mockInsert;
  if (includeUpdate) dbMock.update = mocks.mockUpdate;
  if (includeDelete) dbMock.delete = mocks.mockDelete;
  if (includeSelect) dbMock.select = mocks.mockSelect;
  if (includeTransaction) dbMock.transaction = mocks.mockTransaction;

  // Add query API
  dbMock.query = {};
  Object.entries(queryTables).forEach(([tableName, methods]) => {
    dbMock.query[tableName] = {};
    if (methods.findFirst) dbMock.query[tableName].findFirst = methods.findFirst;
    if (methods.findMany) dbMock.query[tableName].findMany = methods.findMany;
  });

  return { db: dbMock, mocks };
}

/**
 * Helper to setup a transaction mock that passes through a transaction context
 * @param mocks The DrizzleMocks object
 * @param transactionTables Query tables available in transaction
 */
export function setupTransactionMock(
  mocks: DrizzleMocks,
  transactionTables: Record<string, { findFirst?: any; findMany?: any }> = {}
) {
  const mockTxDelete = mock(() => ({
    where: mock(() => ({ returning: mocks.mockReturning })),
  }));
  const mockTxInsert = mock(() => ({
    values: mock(() => ({
      returning: mocks.mockReturning,
      onConflictDoNothing: mocks.mockOnConflictDoNothing,
    })),
  }));
  const mockTxUpdate = mock(() => ({
    set: mock(() => ({
      where: mock(() => ({ returning: mocks.mockReturning })),
    })),
  }));

  mocks.mockTransaction.mockImplementation(async (callback: any) => {
    const tx = {
      insert: mockTxInsert,
      update: mockTxUpdate,
      delete: mockTxDelete,
      select: mocks.mockSelect,
      query: transactionTables,
    };
    return await callback(tx);
  });

  return { mockTxInsert, mockTxUpdate, mockTxDelete };
}
