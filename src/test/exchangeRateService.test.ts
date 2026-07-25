import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ExchangeRateService } from '../modules/exchange-rates/services/exchangeRateService';
import type { StockPrice } from '../modules/holdings/services/stockPriceService';

const createCacheMock = () => ({
  get: mock(),
  set: mock(),
  del: mock(),
  disconnect: mock(),
});

const createStockPriceServiceMock = () => ({
  getMultiplePrices: mock(),
  getPrice: mock(),
});

describe('ExchangeRateService', () => {
  let cache: ReturnType<typeof createCacheMock>;
  let stockPrices: ReturnType<typeof createStockPriceServiceMock>;
  let service: ExchangeRateService;

  beforeEach(() => {
    cache = createCacheMock();
    stockPrices = createStockPriceServiceMock();
    service = new ExchangeRateService(cache as any, stockPrices as any);
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue(undefined);
  });

  it('returns the direct rate when the direct symbol is available', async () => {
    const quotes: StockPrice[] = [{ symbol: 'USDIDR=X', price: 16250.5, currency: 'IDR' }];
    stockPrices.getMultiplePrices.mockResolvedValue(quotes);

    const result = await service.getRate('usd', 'idr');

    expect(result.from).toBe('USD');
    expect(result.to).toBe('IDR');
    expect(result.symbol).toBe('USDIDR=X');
    expect(result.rate).toBe(16250.5);
    expect(result.source).toBe('Yahoo Finance');
    expect(result.cached).toBe(false);
    expect(stockPrices.getMultiplePrices).toHaveBeenCalledWith(['USDIDR=X', 'IDRUSD=X']);
    expect(cache.set).toHaveBeenCalled();
  });

  it('inverts the rate when only the inverse symbol is available', async () => {
    const quotes: StockPrice[] = [{ symbol: 'IDRUSD=X', price: 0.0000615385, currency: 'USD' }];
    stockPrices.getMultiplePrices.mockResolvedValue(quotes);

    const result = await service.getRate('USD', 'IDR');

    expect(result.symbol).toBe('IDRUSD=X');
    expect(result.rate).toBeCloseTo(Math.round((1 / 0.0000615385) * 1e8) / 1e8, 4);
  });

  it('returns a rate of 1 for identical currency pairs without fetching', async () => {
    const result = await service.getRate('USD', 'USD');

    expect(result.rate).toBe(1);
    expect(result.symbol).toBe('USDUSD=X');
    expect(stockPrices.getMultiplePrices).not.toHaveBeenCalled();
  });

  it('returns cached results with cached=true', async () => {
    cache.get.mockResolvedValue({
      from: 'USD',
      to: 'IDR',
      symbol: 'USDIDR=X',
      rate: 16000,
      source: 'Yahoo Finance',
      cached: false,
      fetchedAt: '2026-07-25T00:00:00.000Z',
    });

    const result = await service.getRate('USD', 'IDR');

    expect(result.cached).toBe(true);
    expect(result.rate).toBe(16000);
    expect(stockPrices.getMultiplePrices).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('throws a validation error for invalid currency codes', async () => {
    await expect(service.getRate('US', 'IDR')).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(service.getRate('USD', 'I1R')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('throws an external service error when no quote is found', async () => {
    stockPrices.getMultiplePrices.mockResolvedValue([]);

    await expect(service.getRate('USD', 'IDR')).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});
