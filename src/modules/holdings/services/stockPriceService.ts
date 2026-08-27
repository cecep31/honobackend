import config from '../../../config';
import type { CacheService } from '../../../services/cacheService';
import { Errors } from '../../../utils/error';
import { externalApiClient } from '../../../utils/httpClient';

export const STOCK_QUOTE_CACHE_TTL_SECONDS = 15 * 60; // 15 minutes

export interface StockPrice {
  symbol: string;
  price: number;
  currency: string;
}

export class StockPriceService {
  constructor(private cacheService?: CacheService) {}

  private parseRapidApiResponse(data: any): Record<string, number> {
    const quotes: Record<string, number> = {};
    if (!data) return quotes;

    let quoteList: any[] = [];
    if (Array.isArray(data.body)) {
      quoteList = data.body;
    } else if (Array.isArray(data?.quoteResponse?.result)) {
      quoteList = data.quoteResponse.result;
    } else if (Array.isArray(data)) {
      quoteList = data;
    } else if (Array.isArray(data?.spark?.result)) {
      quoteList = data.spark.result;
    }

    for (const q of quoteList) {
      const sym = (q?.symbol || '').trim().toUpperCase();
      const price =
        Number(q?.regularMarketPrice) ||
        Number(q?.price) ||
        Number(q?.close) ||
        Number(q?.previousClose) ||
        0;

      if (sym && price > 0) {
        quotes[sym] = price;
      }
    }

    return quotes;
  }

  async getQuotes(symbols: string[]): Promise<Record<string, number>> {
    const cleanSymbols = Array.from(
      new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))
    );
    if (cleanSymbols.length === 0) return {};

    const quotes: Record<string, number> = {};
    const missing: string[] = [];

    // 1. Check cache first
    for (const sym of cleanSymbols) {
      const cached = await this.cacheService?.get<number>(`quote:${sym}`);
      if (cached !== null && cached !== undefined && cached > 0) {
        quotes[sym] = cached;
      } else {
        missing.push(sym);
      }
    }

    if (missing.length === 0) {
      return quotes;
    }

    // 2. Fetch missing symbols
    let fetchedQuotes: Record<string, number> = {};

    const apiKey = config?.marketData?.rapidApiKey || '';
    if (apiKey) {
      try {
        fetchedQuotes = await this.fetchQuotesFromRapidAPI(missing, apiKey);
      } catch (error) {
        console.warn('RapidAPI quote fetch failed, falling back to direct Yahoo chart:', error);
        fetchedQuotes = await this.fetchQuotesFromYahooChart(missing);
      }
    } else {
      fetchedQuotes = await this.fetchQuotesFromYahooChart(missing);
    }

    // 3. Cache fetched quotes and merge
    for (const [sym, price] of Object.entries(fetchedQuotes)) {
      if (price > 0) {
        quotes[sym] = price;
        await this.cacheService?.set(`quote:${sym}`, price, STOCK_QUOTE_CACHE_TTL_SECONDS);
      }
    }

    return quotes;
  }

  private async fetchQuotesFromRapidAPI(
    symbols: string[],
    apiKey: string
  ): Promise<Record<string, number>> {
    const quotes: Record<string, number> = {};
    const CHUNK_SIZE = 50;

    for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
      const chunk = symbols.slice(i, i + CHUNK_SIZE);
      const symbolsParam = chunk.join(',');
      const url = `https://yh-finance.p.rapidapi.com/market/v2/get-quotes?symbols=${encodeURIComponent(
        symbolsParam
      )}&ticker=${encodeURIComponent(symbolsParam)}`;

      const res = await externalApiClient.get<any>(url, {
        headers: {
          'x-rapidapi-host': 'yh-finance.p.rapidapi.com',
          'x-rapidapi-key': apiKey,
        },
      });

      const parsed = this.parseRapidApiResponse(res.data);
      Object.assign(quotes, parsed);
    }

    return quotes;
  }

  private async fetchQuotesFromYahooChart(symbols: string[]): Promise<Record<string, number>> {
    const quotes: Record<string, number> = {};

    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
            symbol
          )}?interval=1d&range=1d`;
          const res = await externalApiClient.get<{
            chart?: {
              result?: Array<{
                meta?: {
                  symbol?: string;
                  regularMarketPrice?: number;
                  chartPreviousClose?: number;
                  previousClose?: number;
                };
              }>;
            };
          }>(url);

          const meta = res.data?.chart?.result?.[0]?.meta;
          const price =
            meta?.regularMarketPrice ?? meta?.chartPreviousClose ?? meta?.previousClose ?? 0;

          if (price > 0) {
            quotes[symbol] = price;
          }
        } catch {
          // ignore error on individual symbol
        }
      })
    );

    return quotes;
  }

  async getMultiplePrices(symbols: string[]): Promise<StockPrice[]> {
    if (symbols.length === 0) {
      return [];
    }

    const uniqueSymbols = Array.from(
      new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))
    );
    const quotes = await this.getQuotes(uniqueSymbols);

    return uniqueSymbols
      .map((sym) => {
        const price = quotes[sym];
        if (price === undefined || price <= 0) return null;
        return {
          symbol: sym,
          price,
          currency: sym.endsWith('.JK') ? 'IDR' : 'USD',
        };
      })
      .filter((p): p is StockPrice => p !== null);
  }

  async getPrice(symbol: string): Promise<StockPrice | null> {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const prices = await this.getMultiplePrices([normalizedSymbol]);
    return prices[0] ?? null;
  }
}

export const stockPriceService = new StockPriceService();
