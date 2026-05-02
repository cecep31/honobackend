import { externalApiClient } from '../../../utils/httpClient';
import { Errors } from '../../../utils/error';

interface YahooFinanceQuoteResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        regularMarketPrice?: number;
        currency?: string;
      };
    }>;
    error?: unknown;
  };
}

export interface StockPrice {
  symbol: string;
  price: number;
  currency: string;
}

export class StockPriceService {
  /**
   * Fetch current prices for multiple stock symbols from Yahoo Finance.
   *
   * The quote endpoint currently rejects unauthenticated requests, while chart
   * exposes the same last market price without requiring Yahoo cookies/crumbs.
   * @param symbols Array of stock tickers (e.g., ['AAPL', 'BBCA.JK'])
   */
  async getMultiplePrices(symbols: string[]): Promise<StockPrice[]> {
    if (symbols.length === 0) return [];

    try {
      const normalizedSymbols = Array.from(
        new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))
      );

      const prices = await Promise.all(
        normalizedSymbols.map(async (symbol) => {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
            symbol
          )}?interval=1d&range=1d`;
          const response = await externalApiClient.get<YahooFinanceQuoteResponse>(url);
          const meta = response.data.chart?.result?.[0]?.meta;

          if (!meta || typeof meta.regularMarketPrice !== 'number') {
            return null;
          }

          return {
            symbol: meta.symbol ?? symbol,
            price: meta.regularMarketPrice,
            currency: meta.currency ?? 'USD',
          };
        })
      );

      return prices.filter((price): price is StockPrice => price !== null);
    } catch (error) {
      console.error('Error fetching stock prices:', error);
      throw Errors.ExternalServiceError('Stock price provider');
    }
  }

  /**
   * Fetch current price for a single stock symbol
   */
  async getPrice(symbol: string): Promise<StockPrice | null> {
    const results = await this.getMultiplePrices([symbol]);
    return results.length > 0 ? results[0] : null;
  }
}

export const stockPriceService = new StockPriceService();
