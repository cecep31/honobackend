import { describe, it, expect, beforeEach, mock } from 'bun:test';

const mockExternalGet = mock();

mock.module('../utils/httpClient', () => ({
  externalApiClient: {
    get: mockExternalGet,
  },
}));

const { StockPriceService } = await import('../modules/holdings/services/stockPriceService');

describe('StockPriceService', () => {
  const service = new StockPriceService();

  beforeEach(() => {
    mockExternalGet.mockReset();
  });

  it('fetches prices from Yahoo chart endpoint', async () => {
    mockExternalGet.mockImplementation(async (url: string) => ({
      data: {
        chart: {
          result: [
            {
              meta: {
                symbol: url.includes('BBCA.JK') ? 'BBCA.JK' : 'AAPL',
                regularMarketPrice: url.includes('BBCA.JK') ? 5850 : 280.14,
                currency: url.includes('BBCA.JK') ? 'IDR' : 'USD',
              },
            },
          ],
        },
      },
    }));

    const result = await service.getMultiplePrices(['aapl', 'BBCA.JK']);

    expect(result).toEqual([
      { symbol: 'AAPL', price: 280.14, currency: 'USD' },
      { symbol: 'BBCA.JK', price: 5850, currency: 'IDR' },
    ]);
    expect(mockExternalGet).toHaveBeenCalledWith(
      'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d'
    );
    expect(mockExternalGet).toHaveBeenCalledWith(
      'https://query1.finance.yahoo.com/v8/finance/chart/BBCA.JK?interval=1d&range=1d'
    );
  });

  it('returns null for a symbol without a market price', async () => {
    mockExternalGet.mockResolvedValue({
      data: {
        chart: {
          result: [{ meta: { symbol: 'UNKNOWN', currency: 'USD' } }],
        },
      },
    });

    await expect(service.getPrice('UNKNOWN')).resolves.toBeNull();
  });
});
