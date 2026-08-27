import type { CacheService } from '../../../services/cacheService';
import { Errors } from '../../../utils/error';
import { StockPriceService } from '../../holdings/services/stockPriceService';

/** Cache TTL for exchange rates: 15 minutes (mirrors echobackend). */
export const EXCHANGE_RATE_CACHE_TTL_SECONDS = 15 * 60;

export interface ExchangeRateResponse {
  from: string;
  to: string;
  symbol: string;
  rate: number;
  source: string;
  cached: boolean;
  fetchedAt: string;
}

const EXCHANGE_RATE_SOURCE = 'RapidAPI';

function yahooCurrencySymbol(from: string, to: string): string {
  return `${from}${to}=X`;
}

function normalizeCurrencyCode(code: string): string {
  return code.trim().toUpperCase();
}

function isValidCurrencyCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

export class ExchangeRateService {
  constructor(
    private cacheService?: CacheService,
    private stockPriceService: StockPriceService = new StockPriceService(cacheService)
  ) {}

  /**
   * Get the exchange rate for a currency pair (e.g. USD -> IDR).
   *
   * Rates are fetched using the `{FROM}{TO}=X` symbol and cached for 15 minutes.
   * If the direct pair is unavailable, the inverse pair (`{TO}{FROM}=X`) is used and inverted.
   */
  async getRate(fromRaw: string, toRaw: string): Promise<ExchangeRateResponse> {
    const from = normalizeCurrencyCode(fromRaw);
    const to = normalizeCurrencyCode(toRaw);
    if (!isValidCurrencyCode(from) || !isValidCurrencyCode(to)) {
      throw Errors.InvalidInput('currency', 'Invalid currency pair');
    }

    const cacheKey = `exchange-rate:${from}:${to}`;
    const cached = await this.cacheService?.get<ExchangeRateResponse>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    let result: ExchangeRateResponse;
    if (from === to) {
      result = this.buildResponse(from, to, yahooCurrencySymbol(from, to), 1);
    } else {
      result = await this.fetchRate(from, to);
    }

    await this.cacheService?.set(cacheKey, result, EXCHANGE_RATE_CACHE_TTL_SECONDS);
    return result;
  }

  private async fetchRate(from: string, to: string): Promise<ExchangeRateResponse> {
    const directSymbol = yahooCurrencySymbol(from, to);
    const inverseSymbol = yahooCurrencySymbol(to, from);

    const quotes = await this.stockPriceService.getQuotes([directSymbol, inverseSymbol]);

    const directPrice = quotes[directSymbol];
    if (typeof directPrice === 'number' && directPrice > 0) {
      return this.buildResponse(from, to, directSymbol, directPrice);
    }

    const inversePrice = quotes[inverseSymbol];
    if (typeof inversePrice === 'number' && inversePrice > 0) {
      const rate = Math.round((1 / inversePrice) * 1e8) / 1e8;
      return this.buildResponse(from, to, inverseSymbol, rate);
    }

    throw Errors.ExternalServiceError('Exchange rate provider');
  }

  private buildResponse(
    from: string,
    to: string,
    symbol: string,
    rate: number
  ): ExchangeRateResponse {
    return {
      from,
      to,
      symbol,
      rate,
      source: EXCHANGE_RATE_SOURCE,
      cached: false,
      fetchedAt: new Date().toISOString(),
    };
  }
}
