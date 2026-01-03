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
const mockLeftJoinWhere = mock(() => ({ orderBy: mockOrderBy }));
const mockLeftJoin = mock(() => ({ where: mockLeftJoinWhere }));
const mockSelectWhere = mock(() => ({ orderBy: mockOrderBy }));
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

describe('HoldingService', () => {
    let holdingService: HoldingService;

    beforeEach(() => {
        holdingService = new HoldingService();
        mockReturning.mockReset();
        mockInsert.mockClear();
        mockUpdate.mockClear();
        mockDelete.mockClear();
        mockSelect.mockClear();
        mockHoldingsFindFirst.mockReset();
        mockHoldingsFindMany.mockReset();
        mockHoldingTypesFindFirst.mockReset();
        mockHoldingTypesFindMany.mockReset();
        mockTransaction.mockClear();
    });

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

            mockOrderBy.mockReturnValue(mockHoldings);

            const result = await holdingService.getHoldingsByUserId(userId);

            expect(result).toBeInstanceOf(Array);
            expect(mockSelect).toHaveBeenCalled();
        });

        it('should filter by month and year', async () => {
            const userId = 'user-1';
            const month = 1;
            const year = 2024;
            const mockHoldings = [
                { holding: { id: BigInt(1), name: 'Bitcoin', month, year }, holding_type: { name: 'Crypto' } }
            ];

            mockOrderBy.mockReturnValue(mockHoldings);

            const result = await holdingService.getHoldingsByUserId(userId, month, year);

            expect(result).toBeInstanceOf(Array);
            expect(mockSelect).toHaveBeenCalled();
        });

        it('should sort by different fields', async () => {
            const userId = 'user-1';
            mockOrderBy.mockReturnValue([]);

            // Test sorting by name ascending
            await holdingService.getHoldingsByUserId(userId, undefined, undefined, 'name', 'asc');
            expect(mockSelect).toHaveBeenCalled();

            // Test sorting by invested_amount descending
            await holdingService.getHoldingsByUserId(userId, undefined, undefined, 'invested_amount', 'desc');
            expect(mockSelect).toHaveBeenCalled();

            // Test sorting by current_value
            await holdingService.getHoldingsByUserId(userId, undefined, undefined, 'current_value', 'asc');
            expect(mockSelect).toHaveBeenCalled();

            // Test sorting by platform
            await holdingService.getHoldingsByUserId(userId, undefined, undefined, 'platform', 'desc');
            expect(mockSelect).toHaveBeenCalled();
        });
    });

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
            const mockHoldings = [
                { invested_amount: '10000', current_value: '12000', holding_type: 'Crypto', platform: 'Binance' },
                { invested_amount: '5000', current_value: '4500', holding_type: 'Stocks', platform: 'Robinhood' }
            ];

            mockLeftJoinWhere.mockReturnValue(mockHoldings);

            const result = await holdingService.getSummary(userId);

            expect(result).toHaveProperty('totalInvested');
            expect(result).toHaveProperty('totalCurrentValue');
            expect(result).toHaveProperty('totalProfitLoss');
            expect(result).toHaveProperty('totalProfitLossPercentage');
            expect(result).toHaveProperty('typeBreakdown');
            expect(result).toHaveProperty('platformBreakdown');
        });

        it('should filter summary by month and year', async () => {
            const userId = 'user-1';
            const month = 1;
            const year = 2024;

            mockLeftJoinWhere.mockReturnValue([]);

            const result = await holdingService.getSummary(userId, month, year);

            expect(result).toHaveProperty('totalInvested', 0);
            expect(result).toHaveProperty('totalCurrentValue', 0);
        });

        it('should handle zero invested amount', async () => {
            const userId = 'user-1';
            mockLeftJoinWhere.mockReturnValue([]);

            const result = await holdingService.getSummary(userId);

            expect(result.totalProfitLossPercentage).toBe(0);
        });
    });

    describe('getTrends', () => {
        it('should return trends data', async () => {
            const userId = 'user-1';
            const mockData = [
                { month: 1, year: 2024, invested_amount: '10000', current_value: '11000' },
                { month: 2, year: 2024, invested_amount: '10000', current_value: '12000' }
            ];

            mockOrderBy.mockReturnValue(mockData);
            mockSelectWhere.mockReturnValue({ orderBy: mockOrderBy });

            const result = await holdingService.getTrends(userId);

            expect(result).toBeInstanceOf(Array);
            expect(mockSelect).toHaveBeenCalled();
        });

        it('should filter trends by years', async () => {
            const userId = 'user-1';
            const years = [2023, 2024];

            mockOrderBy.mockReturnValue([]);
            mockSelectWhere.mockReturnValue({ orderBy: mockOrderBy });

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

