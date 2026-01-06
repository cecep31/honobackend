import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { HoldingService } from '../modules/holdings/holdingService';

// Mock DB
const mockReturning = mock();
const mockValues = mock(() => ({ returning: mockReturning }));
const mockInsert = mock(() => ({ values: mockValues }));
const mockSetWhere = mock(() => ({ returning: mockReturning }));
const mockSet = mock(() => ({ where: mockSetWhere }));
const mockUpdate = mock(() => ({ set: mockSet }));
const mockDeleteWhere = mock(() => ({ returning: mockReturning }));
const mockDelete = mock(() => ({ where: mockDeleteWhere }));

const mockOrderBy = mock(() => []);
const mockGroupBy = mock(() => ({ orderBy: mockOrderBy }));
// Allow groupBy to be awaitable (returning array) if it's the end of chain
const mockGroupByEnd = mock(() => Promise.resolve([])); 

const mockLeftJoinWhere = mock(() => ({ groupBy: mockGroupByEnd, orderBy: mockOrderBy }));
const mockLeftJoin = mock(() => ({ where: mockLeftJoinWhere }));

const mockSelectWhere = mock(() => ({ groupBy: mockGroupBy, orderBy: mockOrderBy }));
// Make select(...).from(...).where(...) awaitable directly for cases without groupBy
const mockSelectWhereAwaitable = mock(() => Promise.resolve([]));

const mockSelectFrom = mock(() => ({ leftJoin: mockLeftJoin, where: mockSelectWhere }));
const mockSelect = mock(() => ({ from: mockSelectFrom }));

const mockHoldingsFindFirst = mock();
const mockHoldingsFindMany = mock();
const mockHoldingTypesFindFirst = mock();
const mockHoldingTypesFindMany = mock();

const mockTxDelete = mock(() => ({ where: mock(() => Promise.resolve()) }));
const mockTxInsert = mock(() => ({ values: mock(() => ({ returning: mockReturning })) }));
const mockTransaction = mock(async (callback: any) => {
    return await callback({
        delete: mockTxDelete,
        insert: mockTxInsert,
    });
});

mock.module('../database/drizzle', () => {
    return {
        db: {
            insert: mockInsert,
            update: mockUpdate,
            delete: mockDelete,
            select: mockSelect,
            transaction: mockTransaction,
            query: {
                holdings: {
                    findFirst: mockHoldingsFindFirst,
                    findMany: mockHoldingsFindMany,
                },
                holding_types: {
                    findFirst: mockHoldingTypesFindFirst,
                    findMany: mockHoldingTypesFindMany,
                }
            }
        }
    }
});

// Update mock chain for getSummary/getTrends
// The chain is: db.select().from().where().groupBy()...
// For getSummary 1: select.from.where -> awaitable
// For getSummary 2: select.from.leftJoin.where.groupBy -> awaitable
// For getSummary 3: select.from.where.groupBy -> awaitable

// We need a more flexible mock structure or just update specific tests to override the chain
const mockChain = {
    groupBy: mock(() => Promise.resolve([])),
    orderBy: mock(() => Promise.resolve([])),
    then: (resolve: any) => resolve([]) // Make it awaitable
};
const mockWhere = mock(() => mockChain);
const mockLeftJoinChain = mock(() => ({ where: mockWhere }));
const mockFrom = mock(() => ({ where: mockWhere, leftJoin: mockLeftJoinChain }));
const mockSelectChain = mock(() => ({ from: mockFrom }));

// Re-apply mocks with the new chain
mock.module('../database/drizzle', () => {
    return {
        db: {
            insert: mockInsert,
            update: mockUpdate,
            delete: mockDelete,
            select: mockSelectChain,
            transaction: mockTransaction,
            query: {
                holdings: {
                    findFirst: mockHoldingsFindFirst,
                    findMany: mockHoldingsFindMany,
                },
                holding_types: {
                    findFirst: mockHoldingTypesFindFirst,
                    findMany: mockHoldingTypesFindMany,
                }
            }
        }
    }
});

describe('HoldingService', () => {
    let holdingService: HoldingService;

    beforeEach(() => {
        holdingService = new HoldingService();
        mockReturning.mockReset();
        mockInsert.mockClear();
        mockUpdate.mockClear();
        mockDelete.mockClear();
        mockSelectChain.mockClear();
        mockHoldingsFindFirst.mockReset();
        mockHoldingsFindMany.mockReset();
        mockHoldingTypesFindFirst.mockReset();
        mockHoldingTypesFindMany.mockReset();
        mockTransaction.mockClear();
        
        // Reset chain mocks
        mockWhere.mockClear();
        mockChain.groupBy.mockClear();
        mockChain.orderBy.mockClear();
        mockWhere.mockImplementation(() => mockChain);
        mockChain.groupBy.mockImplementation(() => Promise.resolve([]));
    });
    
    // ... createHolding, getHoldingById ... (keep existing)

    describe('createHolding', () => {
        it('should create a new holding', async () => {
            const userId = 'user-1';
            const data = {
                name: 'Bitcoin',
                platform: 'Binance',
                holding_type_id: 1,
                currency: 'USD',
                invested_amount: '10000',
                current_value: '12000',
                month: 1,
                year: 2024
            };

            mockReturning.mockResolvedValue([{ id: BigInt(1), ...data, user_id: userId }]);

            const result = await holdingService.createHolding(userId, data);

            expect(result[0]).toHaveProperty('name', 'Bitcoin');
            expect(result[0]).toHaveProperty('user_id', userId);
            expect(mockInsert).toHaveBeenCalled();
        });
    });

    describe('getHoldingById', () => {
        it('should return a holding by id', async () => {
            const holdingId = 1;
            const mockHolding = {
                id: BigInt(holdingId),
                name: 'Bitcoin',
                holding_type: { id: 1, name: 'Crypto' }
            };

            mockHoldingsFindFirst.mockResolvedValue(mockHolding);

            const result = await holdingService.getHoldingById(holdingId);

            expect(result).toHaveProperty('name', 'Bitcoin');
            expect(result).toHaveProperty('holding_type');
            expect(mockHoldingsFindFirst).toHaveBeenCalled();
        });

        it('should throw NotFound if holding does not exist', async () => {
            mockHoldingsFindFirst.mockResolvedValue(null);

            await expect(holdingService.getHoldingById(999)).rejects.toThrow();
        });
    });

    describe('getHoldingsByUserId', () => {
        it('should return holdings for a user', async () => {
            const userId = 'user-1';
            const mockHoldings = [
                { holding: { id: BigInt(1), name: 'Bitcoin' }, holding_type: { name: 'Crypto' } },
                { holding: { id: BigInt(2), name: 'Gold' }, holding_type: { name: 'Commodity' } }
            ];

            // For getHoldingsByUserId: select().from().leftJoin().where().orderBy()
            // Our new chain: select -> from -> leftJoin -> where -> [groupBy/orderBy/then]
            // We need orderBy to return the holdings
            
            const mockOrderByChain = mock(() => Promise.resolve(mockHoldings));
            mockWhere.mockImplementation(() => ({
                orderBy: mockOrderByChain,
                groupBy: mock(() => ({ orderBy: mockOrderByChain })) // Handle case where groupBy might be called
            }));

            const result = await holdingService.getHoldingsByUserId(userId);

            expect(result).toBeInstanceOf(Array);
            expect(mockSelectChain).toHaveBeenCalled();
        });

        it('should filter by month and year', async () => {
            const userId = 'user-1';
            const month = 1;
            const year = 2024;
            const mockHoldings = [
                { holding: { id: BigInt(1), name: 'Bitcoin', month, year }, holding_type: { name: 'Crypto' } }
            ];

            const mockOrderByChain = mock(() => Promise.resolve(mockHoldings));
            mockWhere.mockImplementation(() => ({ orderBy: mockOrderByChain }));

            const result = await holdingService.getHoldingsByUserId(userId, month, year);

            expect(result).toBeInstanceOf(Array);
            expect(mockSelectChain).toHaveBeenCalled();
        });
        
        // ... sort tests ...
         it('should sort by different fields', async () => {
            const userId = 'user-1';
             const mockOrderByChain = mock(() => Promise.resolve([]));
            mockWhere.mockImplementation(() => ({ orderBy: mockOrderByChain }));

            // Test sorting by name ascending
            await holdingService.getHoldingsByUserId(userId, undefined, undefined, 'name', 'asc');
            expect(mockSelectChain).toHaveBeenCalled();

            // Test sorting by invested_amount descending
            await holdingService.getHoldingsByUserId(userId, undefined, undefined, 'invested_amount', 'desc');
            expect(mockSelectChain).toHaveBeenCalled();

            // Test sorting by current_value
            await holdingService.getHoldingsByUserId(userId, undefined, undefined, 'current_value', 'asc');
            expect(mockSelectChain).toHaveBeenCalled();

            // Test sorting by platform
            await holdingService.getHoldingsByUserId(userId, undefined, undefined, 'platform', 'desc');
            expect(mockSelectChain).toHaveBeenCalled();
        });
    });

    // ... update, delete, getTypes ... (keep existing)
     describe('updateHolding', () => {
        it('should update an existing holding', async () => {
            const holdingId = 1;
            const data = { name: 'Bitcoin Updated', current_value: '15000' };

            mockHoldingsFindFirst.mockResolvedValue({ id: BigInt(holdingId), name: 'Bitcoin' });
            mockReturning.mockResolvedValue([{ id: BigInt(holdingId), ...data }]);

            const result = await holdingService.updateHolding(holdingId, data);

            expect(result[0]).toHaveProperty('name', 'Bitcoin Updated');
            expect(mockUpdate).toHaveBeenCalled();
        });

        it('should throw NotFound if holding does not exist', async () => {
            mockHoldingsFindFirst.mockResolvedValue(null);

            await expect(holdingService.updateHolding(999, { name: 'Test' })).rejects.toThrow();
        });
    });

    describe('deleteHolding', () => {
        it('should delete a holding', async () => {
            const holdingId = 1;

            mockHoldingsFindFirst.mockResolvedValue({ id: BigInt(holdingId), name: 'Bitcoin' });
            mockReturning.mockResolvedValue([{ id: BigInt(holdingId) }]);

            const result = await holdingService.deleteHolding(holdingId);

            expect(result[0]).toHaveProperty('id');
            expect(mockDelete).toHaveBeenCalled();
        });

        it('should throw NotFound if holding does not exist', async () => {
            mockHoldingsFindFirst.mockResolvedValue(null);

            await expect(holdingService.deleteHolding(999)).rejects.toThrow();
        });
    });

    describe('getHoldingTypes', () => {
        it('should return all holding types', async () => {
            const mockTypes = [
                { id: 1, name: 'Crypto' },
                { id: 2, name: 'Stocks' },
                { id: 3, name: 'Bonds' }
            ];

            mockHoldingTypesFindMany.mockResolvedValue(mockTypes);

            const result = await holdingService.getHoldingTypes();

            expect(result).toHaveLength(3);
            expect(result[0]).toHaveProperty('name', 'Crypto');
            expect(mockHoldingTypesFindMany).toHaveBeenCalled();
        });
    });

    describe('getHoldingTypeById', () => {
        it('should return a holding type by id', async () => {
            const mockType = { id: 1, name: 'Crypto' };

            mockHoldingTypesFindFirst.mockResolvedValue(mockType);

            const result = await holdingService.getHoldingTypeById(1);

            expect(result).toHaveProperty('name', 'Crypto');
            expect(mockHoldingTypesFindFirst).toHaveBeenCalled();
        });

        it('should throw NotFound if holding type does not exist', async () => {
            mockHoldingTypesFindFirst.mockResolvedValue(null);

            await expect(holdingService.getHoldingTypeById(999)).rejects.toThrow();
        });
    });

    describe('getSummary', () => {
        it('should return portfolio summary with breakdowns', async () => {
            const userId = 'user-1';
            
            // Mock returns for the 3 queries
            const totals = [{ totalInvested: 10000, totalCurrentValue: 12000, holdingsCount: 2 }];
            const typeResults = [{ name: 'Crypto', invested: 10000, current: 12000 }];
            const platformResults = [{ name: 'Binance', invested: 10000, current: 12000 }];

            // Mock implementation to return different values based on calls
            let callCount = 0;
            mockWhere.mockImplementation(() => {
                callCount++;
                return {
                     groupBy: mock(() => Promise.resolve(
                        callCount === 2 ? typeResults : platformResults
                     )),
                     then: (resolve: any) => resolve(totals)
                };
            });

            const result = await holdingService.getSummary(userId);

            expect(result).toHaveProperty('totalInvested', 10000);
            expect(result).toHaveProperty('totalCurrentValue', 12000);
            expect(result).toHaveProperty('typeBreakdown');
            expect(result.typeBreakdown[0]).toHaveProperty('name', 'Crypto');
        });

        it('should filter summary by month and year', async () => {
            const userId = 'user-1';
            const month = 1;
            const year = 2024;

             mockWhere.mockImplementation(() => ({
                groupBy: mock(() => Promise.resolve([])),
                then: (resolve: any) => resolve([{ totalInvested: 0, totalCurrentValue: 0 }])
            }));

            const result = await holdingService.getSummary(userId, month, year);

            expect(result).toHaveProperty('totalInvested', 0);
            expect(result).toHaveProperty('totalCurrentValue', 0);
        });

        it('should handle zero invested amount', async () => {
            const userId = 'user-1';
             mockWhere.mockImplementation(() => ({
                groupBy: mock(() => Promise.resolve([])),
                then: (resolve: any) => resolve([])
            }));

            const result = await holdingService.getSummary(userId);

            expect(result.totalProfitLossPercentage).toBe(0);
        });
    });

    describe('getTrends', () => {
        it('should return trends data', async () => {
            const userId = 'user-1';
            const mockData = [
                { month: 1, year: 2024, invested: 10000, current: 11000 },
                { month: 2, year: 2024, invested: 10000, current: 12000 }
            ];
            
            // getTrends: select().from().where().groupBy().orderBy()
             mockWhere.mockImplementation(() => ({
                 groupBy: mock(() => ({
                     orderBy: mock(() => Promise.resolve(mockData))
                 }))
             }));

            const result = await holdingService.getTrends(userId);

            expect(result).toBeInstanceOf(Array);
            expect(result).toHaveLength(2);
            expect(mockSelectChain).toHaveBeenCalled();
        });

        it('should filter trends by years', async () => {
            const userId = 'user-1';
            const years = [2023, 2024];

            mockWhere.mockImplementation(() => ({
                 groupBy: mock(() => ({
                     orderBy: mock(() => Promise.resolve([]))
                 }))
             }));

            const result = await holdingService.getTrends(userId, years);

            expect(result).toBeInstanceOf(Array);
        });
    });

    describe('duplicateHoldingsByMonth', () => {
        it('should duplicate holdings from one month to another', async () => {
            const userId = 'user-1';
            const data = {
                fromMonth: 1,
                fromYear: 2024,
                toMonth: 2,
                toYear: 2024,
                overwrite: false
            };

            const sourceHoldings = [
                { user_id: userId, name: 'Bitcoin', platform: 'Binance', invested_amount: '10000', current_value: '12000' }
            ];

            mockHoldingsFindMany.mockResolvedValue(sourceHoldings);
            mockReturning.mockResolvedValue(sourceHoldings.map(h => ({ ...h, month: 2, year: 2024 })));

            const result = await holdingService.duplicateHoldingsByMonth(userId, data);

            expect(result).toBeInstanceOf(Array);
            expect(mockTransaction).toHaveBeenCalled();
        });

        it('should overwrite existing holdings if overwrite is true', async () => {
            const userId = 'user-1';
            const data = {
                fromMonth: 1,
                fromYear: 2024,
                toMonth: 2,
                toYear: 2024,
                overwrite: true
            };

            const sourceHoldings = [
                { user_id: userId, name: 'Bitcoin', platform: 'Binance' }
            ];

            mockHoldingsFindMany.mockResolvedValue(sourceHoldings);
            mockReturning.mockResolvedValue(sourceHoldings);

            const result = await holdingService.duplicateHoldingsByMonth(userId, data);

            expect(mockTransaction).toHaveBeenCalled();
        });

        it('should throw error if no source holdings found', async () => {
            const userId = 'user-1';
            const data = {
                fromMonth: 1,
                fromYear: 2024,
                toMonth: 2,
                toYear: 2024,
                overwrite: false
            };

            mockHoldingsFindMany.mockResolvedValue([]);

            await expect(holdingService.duplicateHoldingsByMonth(userId, data)).rejects.toThrow();
        });
    });
});

