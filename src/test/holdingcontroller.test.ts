import { describe, it, expect, mock } from 'bun:test';
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
  getHoldingsByUserId: mock(),
  getSummary: mock(),
  getTrends: mock(),
  compareMonths: mock(),
  getMonthly: mock(),
  getPrice: mock(async (symbol: string) => ({
    symbol,
    price: 123.45,
    currency: 'USD',
  })),
  createHolding: mock(),
  syncCurrentMonthPrices: mock(async () => ({
    syncedCount: 2,
    month: 4,
    year: 2026,
  })),
  duplicateHoldingsByMonth: mock(),
  getHoldingById: mock(),
  updateHolding: mock(),
  deleteHolding: mock(),
};

const { createHoldingController } = await import('../modules/holdings/controllers/holdingController');

describe('Holding Controller', () => {
  const app = new Hono();
  app.onError(errorHandler());
  app.route('/holdings', createHoldingController(holdingService as any));
  const client = testClient(app);

  it('routes POST /holdings/sync to syncCurrentMonthPrices', async () => {
    const res = await client.holdings.sync.$post(
      {},
      {
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe('Prices synced successfully for current month');
    expect(holdingService.syncCurrentMonthPrices).toHaveBeenCalledWith('test-user-id');
  });

  it('routes GET /holdings/price to getPrice', async () => {
    const res = await client.holdings.price.$get(
      {
        query: {
          symbol: 'aapl',
        },
      },
      {
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe('Price fetched successfully');
    expect(json.data.symbol).toBe('aapl');
    expect(holdingService.getPrice).toHaveBeenCalledWith('aapl');
  });
});
