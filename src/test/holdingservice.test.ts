import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createDrizzleMocks, createChainableMock } from './helpers/drizzleMock';
import { HoldingService } from '../modules/holdings/services/holdingService';

// Create mocks using helper
const mocks = createDrizzleMocks();

const mockHoldingsFindFirst = mock();
const mockHoldingsFindMany = mock();
const mockHoldingTypesFindFirst = mock();
const mockHoldingTypesFindMany = mock();
const mockGetQuotes = mock();
const mockGetPrice = mock();
const mockGetMultiplePrices = mock();

// Transaction mocks
const mockTxDelete = mock(() => ({ where: mock(() => Promise.resolve()) }));
const mockTxInsert = mock(() => ({ values: mock(() => ({ returning: mocks.mockReturning })) }));
const mockTransaction = mock(async (callback: any) => {
  return await callback({
    delete: mockTxDelete,
    insert: mockTxInsert,
  });
});

mock.module('../database/drizzle', () => {
  return {
    db: {
      insert: mocks.mockInsert,
      update: mocks.mockUpdate,
      delete: mocks.mockDelete,
      select: mocks.mockSelect,
      transaction: mockTransaction,
      query: {
        holdings: {
          findFirst: mockHoldingsFindFirst,
          findMany: mockHoldingsFindMany,
        },
        holding_types: {
          findFirst: mockHoldingTypesFindFirst,
          findMany: mockHoldingTypesFindMany,
        },
      },
    },
  };
});

const mockStockPriceService = {
  getQuotes: mockGetQuotes,
  getPrice: mockGetPrice,
  getMultiplePrices: mockGetMultiplePrices,
};

describe('HoldingService', () => {
  let holdingService: HoldingService;

  beforeEach(() => {
    mocks.reset();
    mockHoldingsFindFirst.mockReset();
    mockHoldingsFindMany.mockReset();
    mockHoldingTypesFindFirst.mockReset();
    mockHoldingTypesFindMany.mockReset();
    mockGetQuotes.mockReset();
    mockGetPrice.mockReset();
    mockGetMultiplePrices.mockReset();
    mockTransaction.mockClear();
    mockTxDelete.mockClear();
    mockTxInsert.mockClear();
    holdingService = new HoldingService(mockStockPriceService as any);
  });

  describe('createHolding', () => {
    it('should create a new holding', async () => {
      const userId = 'user-1';
      const holdingData = {
        holding_type_id: 1,
        invested_amount: 1000,
        current_value: 1200,
        name: 'Test holding',
        month: 12,
        year: 2024,
      };

      const mockHolding = { id: BigInt(1), user_id: userId, ...holdingData };
      mocks.mockReturning.mockResolvedValue([mockHolding]);

      const result = await holdingService.createHolding(userId, holdingData);

      expect(result).toEqual([mockHolding]);
      expect(mocks.mockInsert).toHaveBeenCalled();
    });
  });

  describe('syncCurrentMonthPrices', () => {
    it('should sync prices for current month holdings with symbols', async () => {
      const userId = 'user-1';
      const mockHoldings = [
        { id: BigInt(1), symbol: 'AAPL', units: '10', current_price: '150', current_value: '1500' },
        { id: BigInt(2), symbol: 'MSFT', units: '5', current_price: '300', current_value: '1500' },
      ];

      mockHoldingsFindMany.mockResolvedValue(mockHoldings);
      mockGetQuotes.mockResolvedValue({
        AAPL: 160,
        MSFT: 310,
      });

      const result = await holdingService.syncCurrentMonthPrices(userId);

      expect(result.syncedCount).toBe(2);
      expect(mockGetQuotes).toHaveBeenCalledWith(['AAPL', 'MSFT']);
      expect(mocks.mockUpdate).toHaveBeenCalledTimes(2);
    });

    it('should return empty count if no holdings with symbols found', async () => {
      mockHoldingsFindMany.mockResolvedValue([]);
      const result = await holdingService.syncCurrentMonthPrices('user-1');
      expect(result.syncedCount).toBe(0);
    });
  });

  describe('getHoldingById', () => {
    it('should return a holding by id', async () => {
      const mockHolding = {
        id: BigInt(1),
        invested_amount: '1000',
        holding_type: { id: 1, name: 'Stocks' },
      };
      mockHoldingsFindFirst.mockResolvedValue(mockHolding);

      const result = await holdingService.getHoldingById('user-1', 1);

      expect(result).toEqual(mockHolding);
    });

    it('should throw NotFound if holding does not exist', async () => {
      mockHoldingsFindFirst.mockResolvedValue(null);

      await expect(holdingService.getHoldingById('user-1', 999)).rejects.toThrow();
    });
  });

  describe('getHoldingsByUserId', () => {
    it('should return holdings for a user', async () => {
      const mockHoldings = [
        {
          holding: { id: BigInt(1), name: 'Holding 1' },
          holding_type: { id: 1, name: 'Stocks' },
        },
      ];

      const chainMock = createChainableMock(mockHoldings);
      mocks.mockSelect.mockReturnValue(chainMock);

      const result = await holdingService.getHoldingsByUserId('user-1');

      expect(result).toEqual([
        { id: BigInt(1), name: 'Holding 1', holding_type: { id: 1, name: 'Stocks' } },
      ]);
    });

    it('should filter by month and year', async () => {
      const chainMock = createChainableMock([]);
      mocks.mockSelect.mockReturnValue(chainMock);

      await holdingService.getHoldingsByUserId('user-1', 12, 2024);

      expect(mocks.mockSelect).toHaveBeenCalled();
    });

    it('should support different sort options', async () => {
      const chainMock = createChainableMock([]);
      mocks.mockSelect.mockReturnValue(chainMock);

      await holdingService.getHoldingsByUserId('user-1', undefined, undefined, 'name', 'asc');
      expect(mocks.mockSelect).toHaveBeenCalled();
    });
  });

  describe('updateHolding', () => {
    it('should update an existing holding', async () => {
      const updatedHolding = { id: BigInt(1), invested_amount: '1500' };
      mockHoldingsFindFirst.mockResolvedValue({
        id: BigInt(1),
        holding_type: { id: 1, name: 'Stocks' },
      });
      mocks.mockReturning.mockResolvedValue([updatedHolding]);

      const result = await holdingService.updateHolding('user-1', 1, {
        invested_amount: 1500,
      });

      expect(result).toEqual([updatedHolding]);
      expect(mocks.mockUpdate).toHaveBeenCalled();
    });

    it('should throw NotFound if holding does not exist', async () => {
      mockHoldingsFindFirst.mockResolvedValue(null);

      await expect(
        holdingService.updateHolding('user-1', 999, { invested_amount: 1500 })
      ).rejects.toThrow();
    });
  });

  describe('deleteHolding', () => {
    it('should delete a holding', async () => {
      const deletedHolding = { id: BigInt(1) };
      mockHoldingsFindFirst.mockResolvedValue({
        id: BigInt(1),
        holding_type: { id: 1, name: 'Stocks' },
      });
      mocks.mockReturning.mockResolvedValue([deletedHolding]);

      const result = await holdingService.deleteHolding('user-1', 1);

      expect(result).toEqual([deletedHolding]);
      expect(mocks.mockDelete).toHaveBeenCalled();
    });

    it('should throw NotFound if holding does not exist', async () => {
      mockHoldingsFindFirst.mockResolvedValue(null);

      await expect(holdingService.deleteHolding('user-1', 999)).rejects.toThrow();
    });
  });

  describe('getHoldingTypes', () => {
    it('should return all holding types', async () => {
      const mockTypes = [
        { id: 1, name: 'Stocks' },
        { id: 2, name: 'Crypto' },
      ];
      mockHoldingTypesFindMany.mockResolvedValue(mockTypes);

      const result = await holdingService.getHoldingTypes();

      expect(result).toEqual(mockTypes);
    });
  });

  describe('getHoldingTypeById', () => {
    it('should return a holding type by id', async () => {
      const mockType = { id: 1, name: 'Stocks' };
      mockHoldingTypesFindFirst.mockResolvedValue(mockType);

      const result = await holdingService.getHoldingTypeById(1);

      expect(result).toEqual(mockType);
    });

    it('should throw NotFound if holding type does not exist', async () => {
      mockHoldingTypesFindFirst.mockResolvedValue(null);

      await expect(holdingService.getHoldingTypeById(999)).rejects.toThrow();
    });
  });

  describe('getSummary', () => {
    it('should return portfolio summary with breakdowns', async () => {
      // Mock for totals (totalInvested, totalCurrentValue, holdingsCount)
      const chainMock1 = createChainableMock([
        { totalInvested: 10000, totalCurrentValue: 12000, holdingsCount: 5 },
      ]);
      mocks.mockSelect.mockReturnValueOnce(chainMock1);

      // Mock for type breakdown
      const chainMock2 = createChainableMock([
        { name: 'Stocks', invested: 6000, current: 7000 },
        { name: 'Crypto', invested: 4000, current: 5000 },
      ]);
      mocks.mockSelect.mockReturnValueOnce(chainMock2);

      // Mock for platform breakdown
      const chainMock3 = createChainableMock([
        { name: 'Binance', invested: 5000, current: 6000 },
        { name: 'IBKR', invested: 5000, current: 6000 },
      ]);
      mocks.mockSelect.mockReturnValueOnce(chainMock3);

      const result = await holdingService.getSummary('user-1');

      expect(result.totalInvested).toBe(10000);
      expect(result.typeBreakdown).toHaveLength(2);
      expect(result.platformBreakdown).toHaveLength(2);
    });

    it('should filter summary by month and year', async () => {
      const chainMock1 = createChainableMock([
        { totalInvested: 5000, totalCurrentValue: 6000, holdingsCount: 2 },
      ]);
      mocks.mockSelect.mockReturnValueOnce(chainMock1);
      const chainMock2 = createChainableMock([]);
      mocks.mockSelect.mockReturnValueOnce(chainMock2);
      const chainMock3 = createChainableMock([]);
      mocks.mockSelect.mockReturnValueOnce(chainMock3);

      const result = await holdingService.getSummary('user-1', 12, 2024);

      expect(result.totalInvested).toBe(5000);
    });

    it('should handle zero invested amount', async () => {
      const chainMock1 = createChainableMock([
        { totalInvested: 0, totalCurrentValue: 0, holdingsCount: 0 },
      ]);
      mocks.mockSelect.mockReturnValueOnce(chainMock1);
      const chainMock2 = createChainableMock([]);
      mocks.mockSelect.mockReturnValueOnce(chainMock2);
      const chainMock3 = createChainableMock([]);
      mocks.mockSelect.mockReturnValueOnce(chainMock3);

      const result = await holdingService.getSummary('user-1');

      expect(result.totalInvested).toBe(0);
    });
  });

  describe('getTrends', () => {
    it('should return trends data', async () => {
      const chainMock = createChainableMock([
        { month: 11, year: 2024, sum: 8000 },
        { month: 12, year: 2024, sum: 10000 },
      ]);
      mocks.mockSelect.mockReturnValue(chainMock);

      const result = await holdingService.getTrends('user-1');

      expect(result).toHaveLength(2);
    });

    it('should filter trends by years', async () => {
      const chainMock = createChainableMock([{ month: 12, year: 2024, sum: 10000 }]);
      mocks.mockSelect.mockReturnValue(chainMock);

      const result = await holdingService.getTrends('user-1', [2024]);

      expect(result).toHaveLength(1);
    });
  });

  describe('duplicateHoldingsByMonth', () => {
    it('should duplicate holdings from one month to another', async () => {
      const mockSourceHoldings = [
        {
          id: BigInt(1),
          user_id: 'user-1',
          name: 'Test 1',
          invested_amount: '1000',
          month: 11,
          year: 2024,
        },
        {
          id: BigInt(2),
          user_id: 'user-1',
          name: 'Test 2',
          invested_amount: '2000',
          month: 11,
          year: 2024,
        },
      ];

      mockHoldingsFindMany.mockResolvedValueOnce(mockSourceHoldings).mockResolvedValueOnce([]);

      mocks.mockReturning.mockResolvedValue(
        mockSourceHoldings.map((h, i) => ({ ...h, id: BigInt(i + 10), month: 12 }))
      );

      const result = await holdingService.duplicateHoldingsByMonth('user-1', {
        fromMonth: 11,
        fromYear: 2024,
        toMonth: 12,
        toYear: 2024,
        overwrite: false,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should overwrite existing holdings if overwrite is true', async () => {
      const mockSourceHoldings = [
        {
          id: BigInt(1),
          user_id: 'user-1',
          name: 'Test',
          invested_amount: '1000',
          month: 11,
          year: 2024,
        },
      ];

      mockHoldingsFindMany.mockResolvedValue(mockSourceHoldings);
      mocks.mockReturning.mockResolvedValue([
        { id: BigInt(10), ...mockSourceHoldings[0], month: 12 },
      ]);

      const result = await holdingService.duplicateHoldingsByMonth('user-1', {
        fromMonth: 11,
        fromYear: 2024,
        toMonth: 12,
        toYear: 2024,
        overwrite: true,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(mockTxDelete).toHaveBeenCalled();
    });

    it('should throw error if no source holdings found', async () => {
      mockHoldingsFindMany.mockResolvedValue([]);

      await expect(
        holdingService.duplicateHoldingsByMonth('user-1', {
          fromMonth: 11,
          fromYear: 2024,
          toMonth: 12,
          toYear: 2024,
          overwrite: false,
        })
      ).rejects.toThrow();
    });

    it('should throw when source and target period are the same', async () => {
      await expect(
        holdingService.duplicateHoldingsByMonth('user-1', {
          fromMonth: 3,
          fromYear: 2024,
          toMonth: 3,
          toYear: 2024,
          overwrite: false,
        })
      ).rejects.toThrow();
      expect(mockHoldingsFindMany).not.toHaveBeenCalled();
    });

    it('should throw when target month already has holdings and overwrite is false', async () => {
      const mockSourceHoldings = [
        {
          id: BigInt(1),
          user_id: 'user-1',
          name: 'Test',
          invested_amount: '1000',
          month: 11,
          year: 2024,
        },
      ];
      const mockExistingTarget = [
        {
          id: BigInt(99),
          user_id: 'user-1',
          name: 'Existing',
          invested_amount: '500',
          month: 12,
          year: 2024,
        },
      ];

      mockHoldingsFindMany
        .mockResolvedValueOnce(mockSourceHoldings)
        .mockResolvedValueOnce(mockExistingTarget);

      await expect(
        holdingService.duplicateHoldingsByMonth('user-1', {
          fromMonth: 11,
          fromYear: 2024,
          toMonth: 12,
          toYear: 2024,
          overwrite: false,
        })
      ).rejects.toThrow();
      expect(mockTransaction).not.toHaveBeenCalled();
    });
  });

  describe('getPrice', () => {
    it('should return stock price', async () => {
      mockGetPrice.mockResolvedValue({ symbol: 'AAPL', price: 150, currency: 'USD' });

      const result = await holdingService.getPrice('AAPL');

      expect(result.symbol).toBe('AAPL');
      expect(result.price).toBe(150);
    });

    it('should normalize symbol to uppercase', async () => {
      mockGetPrice.mockResolvedValue({ symbol: 'AAPL', price: 150, currency: 'USD' });

      await holdingService.getPrice(' aapl ');
      expect(mockGetPrice).toHaveBeenCalledWith('AAPL');
    });

    it('should throw NotFound when price not found', async () => {
      mockGetPrice.mockResolvedValue(null);

      await expect(holdingService.getPrice('UNKNOWN')).rejects.toThrow();
    });
  });

  describe('getMonthly', () => {
    it('should return monthly data for default range', async () => {
      const chainMock = createChainableMock([
        { month: 1, year: 2024, totalInvested: 5000, totalCurrentValue: 5500, holdingsCount: 2 },
      ]);
      mocks.mockSelect.mockReturnValue(chainMock);

      const result = await holdingService.getMonthly('user-1');

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return monthly data for custom range', async () => {
      const chainMock = createChainableMock([
        { month: 6, year: 2024, totalInvested: 3000, totalCurrentValue: 3200, holdingsCount: 1 },
      ]);
      mocks.mockSelect.mockReturnValue(chainMock);

      const result = await holdingService.getMonthly('user-1', 1, 2024, 6, 2024);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(6);
    });
  });

  describe('compareMonths', () => {
    it('should compare two months', async () => {
      const chainMock = createChainableMock([
        { totalInvested: 10000, totalCurrentValue: 12000, holdingsCount: 5 },
      ]);
      mocks.mockSelect.mockReturnValue(chainMock);

      const result = await holdingService.compareMonths('user-1', 11, 2024, 12, 2024);

      expect(result).toHaveProperty('fromMonth');
      expect(result).toHaveProperty('toMonth');
      expect(result).toHaveProperty('summary');
    });

    it('should default to current and previous month', async () => {
      const chainMock = createChainableMock([
        { totalInvested: 10000, totalCurrentValue: 12000, holdingsCount: 5 },
      ]);
      mocks.mockSelect.mockReturnValue(chainMock);

      const result = await holdingService.compareMonths('user-1');

      expect(result).toHaveProperty('fromMonth');
      expect(result).toHaveProperty('toMonth');
      expect(result).toHaveProperty('summary');
    });
  });
});
