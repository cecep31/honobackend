import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { errorHandler } from '../middlewares/errorHandler';

mock.module('../middlewares/auth', () => ({
  auth: async (c: any, next: any) => {
    c.set('user', {
      user_id: 'test-user-id',
      email: 'test@example.com',
      is_super_admin: false,
    });
    await next();
  },
}));

const holdingService = {
  getHoldingsByUserId: mock(async () => [
    { id: 1, name: 'AAPL', holding_type: { name: 'Stock' } },
  ]),
  getSummary: mock(async () => ({
    totalInvested: 10000,
    totalCurrentValue: 12000,
    totalProfitLoss: 2000,
    totalProfitLossPercentage: 20,
    holdingsCount: 2,
    typeBreakdown: [],
    platformBreakdown: [],
  })),
  getTrends: mock(async () => [
    { date: '2024-01', invested: 5000, current: 5500, profitLoss: 500, profitLossPercentage: 10 },
  ]),
  compareMonths: mock(async () => ({
    fromMonth: { month: 1, year: 2024 },
    toMonth: { month: 2, year: 2024 },
    summary: {},
    typeComparison: [],
    platformComparison: [],
  })),
  getMonthly: mock(async () => [
    { month: 1, year: 2024, date: '2024-01', totalInvested: 5000, totalCurrentValue: 5500, holdingsCount: 2 },
  ]),
  getPrice: mock(async (symbol: string) => ({ symbol, price: 150.5, currency: 'USD' })),
  createHolding: mock(async () => [{ id: 1, name: 'New Holding' }]),
  syncCurrentMonthPrices: mock(async () => ({
    syncedCount: 2,
    month: 4,
    year: 2026,
  })),
  duplicateHoldingsByMonth: mock(async () => [{ id: 2, name: 'Duplicated' }]),
  getHoldingById: mock(async () => ({ id: 1, name: 'AAPL' })),
  updateHolding: mock(async () => [{ id: 1, name: 'Updated' }]),
  deleteHolding: mock(async () => [{ id: 1, name: 'Deleted' }]),
};

const { createHoldingController } = await import('../modules/holdings/controllers/holdingController');

describe('Holding Controller', () => {
  const app = new Hono();
  app.onError(errorHandler());
  app.route('/holdings', createHoldingController(holdingService as any));
  const client = testClient(app);

  beforeEach(() => {
    Object.values(holdingService).forEach((m: any) => m?.mockClear?.());
  });

  it('routes GET /holdings to getHoldingsByUserId', async () => {
    const res = await client.holdings.$get(
      { query: { month: '4', year: '2026' } },
      { headers: { Authorization: 'Bearer test-token' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe('Holdings fetched successfully');
    expect(holdingService.getHoldingsByUserId).toHaveBeenCalledWith('test-user-id', 4, 2026, 'created_at', 'desc');
  });

  it('routes GET /holdings/summary to getSummary', async () => {
    const res = await client.holdings.summary.$get(
      { query: { month: '4', year: '2026' } },
      { headers: { Authorization: 'Bearer test-token' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.totalInvested).toBe(10000);
  });

  it('routes GET /holdings/trends to getTrends', async () => {
    const res = await client.holdings.trends.$get(
      { query: {} },
      { headers: { Authorization: 'Bearer test-token' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
  });

  it('routes GET /holdings/compare to compareMonths', async () => {
    const res = await client.holdings.compare.$get(
      { query: { fromMonth: '1', fromYear: '2024', toMonth: '2', toYear: '2024' } },
      { headers: { Authorization: 'Bearer test-token' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(holdingService.compareMonths).toHaveBeenCalledWith('test-user-id', 1, 2024, 2, 2024);
  });

  it('routes GET /holdings/monthly to getMonthly', async () => {
    const res = await client.holdings.monthly.$get(
      { query: { startMonth: '1', startYear: '2024', endMonth: '3', endYear: '2024' } },
      { headers: { Authorization: 'Bearer test-token' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
  });

  it('routes GET /holdings/price to getPrice', async () => {
    const res = await client.holdings.price.$get(
      { query: { symbol: 'aapl' } },
      { headers: { Authorization: 'Bearer test-token' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.symbol).toBe('aapl');
  });

  it('routes POST /holdings to createHolding', async () => {
    const res = await client.holdings.$post(
      {
        json: {
          name: 'AAPL',
          platform: 'Broker',
          invested_amount: 1000,
          current_value: 1200,
          holding_type_id: 1,
          currency: 'USD',
          month: 4,
          year: 2026,
        },
      },
      { headers: { Authorization: 'Bearer test-token' } }
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(holdingService.createHolding).toHaveBeenCalledWith('test-user-id', expect.any(Object));
  });

  it('routes POST /holdings/duplicate to duplicateHoldingsByMonth', async () => {
    const res = await client.holdings.duplicate.$post(
      {
        json: {
          fromMonth: 1,
          fromYear: 2024,
          toMonth: 2,
          toYear: 2024,
        },
      },
      { headers: { Authorization: 'Bearer test-token' } }
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('routes GET /holdings/:id to getHoldingById', async () => {
    const res = await client.holdings[':id'].$get(
      { param: { id: '1' } },
      { headers: { Authorization: 'Bearer test-token' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(holdingService.getHoldingById).toHaveBeenCalledWith('test-user-id', 1);
  });

  it('routes PUT /holdings/:id to updateHolding', async () => {
    const res = await client.holdings[':id'].$put(
      { param: { id: '1' }, json: { name: 'Updated' } },
      { headers: { Authorization: 'Bearer test-token' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(holdingService.updateHolding).toHaveBeenCalledWith('test-user-id', 1, { name: 'Updated' });
  });

  it('routes DELETE /holdings/:id to deleteHolding', async () => {
    const res = await client.holdings[':id'].$delete(
      { param: { id: '1' } },
      { headers: { Authorization: 'Bearer test-token' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(holdingService.deleteHolding).toHaveBeenCalledWith('test-user-id', 1);
  });
});
