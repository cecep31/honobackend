import { describe, it, expect, beforeEach, mock } from 'bun:test';

const mockExternalGet = mock();

mock.module('../utils/httpClient', () => ({
  externalApiClient: {
    get: mockExternalGet,
  },
}));

mock.module('../config', () => ({
  default: {
    marketData: {
      rapidApiKey: 'test-key',
    },
    cache: {
      url: '',
    },
  },
}));

const { StockPriceService } = await import('../modules/holdings/services/stockPriceService');

describe('StockPriceService', () => {
  const service = new StockPriceService();

  beforeEach(() => {
    mockExternalGet.mockReset();
  });

  it('fetches prices from RapidAPI endpoint', async () => {
    mockExternalGet.mockImplementation(async (url: string) => {
      if (url.includes('rapidapi.com')) {
        return {
          data: {
            body: [
              { symbol: 'AAPL', regularMarketPrice: 280.14, currency: 'USD' },
              { symbol: 'BBCA.JK', regularMarketPrice: 5850, currency: 'IDR' },
            ],
          },
        };
      }
      return { data: {} };
    });

    const result = await service.getMultiplePrices(['aapl', 'BBCA.JK']);

    expect(result).toEqual([
      { symbol: 'AAPL', price: 280.14, currency: 'USD' },
      { symbol: 'BBCA.JK', price: 5850, currency: 'IDR' },
    ]);
  });

  it('returns null for a symbol without a market price', async () => {
    mockExternalGet.mockResolvedValue({
      data: {
        body: [{ symbol: 'UNKNOWN' }],
      },
    });

    await expect(service.getPrice('UNKNOWN')).resolves.toBeNull();
  });
});
