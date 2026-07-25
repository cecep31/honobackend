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

const EXCHANGE_RATE_SOURCE = 'Yahoo Finance';

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
    private stockPriceService: StockPriceService = new StockPriceService()
  ) {}

  /**
   * Get the exchange rate for a currency pair (e.g. USD -> IDR).
   *
   * Rates are fetched from Yahoo Finance using the `{FROM}{TO}=X` symbol and
   * cached for 15 minutes. If the direct pair is unavailable, the inverse
   * pair (`{TO}{FROM}=X`) is used and the rate inverted.
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

    const quotes = await this.stockPriceService.getMultiplePrices([directSymbol, inverseSymbol]);

    const direct = quotes.find((q) => q.symbol.toUpperCase() === directSymbol);
    if (direct && direct.price > 0) {
      return this.buildResponse(from, to, directSymbol, direct.price);
    }

    const inverse = quotes.find((q) => q.symbol.toUpperCase() === inverseSymbol);
    if (inverse && inverse.price > 0) {
      const rate = Math.round((1 / inverse.price) * 1e8) / 1e8;
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
