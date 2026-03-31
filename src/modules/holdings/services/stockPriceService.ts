import { externalApiClient } from '../../../utils/httpClient';

interface YahooFinanceQuoteResponse {
  quoteResponse?: {
    result?: Array<{
      symbol: string;
      regularMarketPrice: number;
      currency: string;
    }>;
  };
}

export interface StockPrice {
  symbol: string;
  price: number;
  currency: string;
}

export class StockPriceService {
  /**
   * Fetch current prices for multiple stock symbols from Yahoo Finance
   * @param symbols Array of stock tickers (e.g., ['AAPL', 'BBCA.JK'])
   */
  async getMultiplePrices(symbols: string[]): Promise<StockPrice[]> {
    if (symbols.length === 0) return [];

    try {
      // Yahoo Finance Query API (v7)
      const symbolsStr = symbols.join(',');
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsStr}`;

      const response = await externalApiClient.get<YahooFinanceQuoteResponse>(url);
      const results = response.data.quoteResponse?.result || [];

      return results.map((item: any) => ({
        symbol: item.symbol,
        price: item.regularMarketPrice,
        currency: item.currency,
      }));
    } catch (error) {
      console.error('Error fetching stock prices:', error);
      throw new Error('Failed to fetch stock prices from external provider');
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
