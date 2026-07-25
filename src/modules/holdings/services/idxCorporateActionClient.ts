import config from '../../../config';
import { externalApiClient } from '../../../utils/httpClient';

const RAPID_API_IDX_HOST = 'indonesia-stock-exchange-idx.p.rapidapi.com';
const RAPID_API_IDX_BASE_URL = `https://${RAPID_API_IDX_HOST}`;

export type CorporateActionType = 'dividend' | 'rups';

/** A single corporate action event (dividend or RUPS) from the IDX calendar. */
export interface CorporateActionEvent {
  symbol: string;
  name: string;
  type: CorporateActionType;
  /** Primary event date (ex-date for dividends, meeting date for RUPS): YYYY-MM-DD */
  date: string;
  /** Dividend payment date: YYYY-MM-DD */
  payDate?: string;
  /** Gross dividend amount per share */
  amount?: number;
  currency: string;
  note: string;
  market: string;
}

interface RapidApiDividendItem {
  company_symbol?: string;
  dividend_exdate?: string;
  dividend_paydate?: string;
  dividend_value?: string;
  dividend_currency?: string;
}

interface RapidApiRupsItem {
  company_symbol?: string;
  company_name?: string;
  rups_date?: string;
  rups_time?: string;
  rups_venue?: string;
}

interface RapidApiListResponse<T> {
  success?: boolean;
  data?: {
    data?: Record<string, T[] | undefined>;
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeIdxSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.JK$/, '');
}

function normalizeCurrency(currency: string): string {
  const normalized = currency.trim().toUpperCase().replace(/^CURRENCY_/, '');
  return normalized || 'IDR';
}

/**
 * RapidAPI IDX client for fetching dividend & RUPS calendars.
 *
 * Mirrors echobackend's `market.RapidAPIIDXClient`: fail-open per endpoint
 * (errors are logged and skipped) and a no-op (empty results) when
 * `RAPIDAPI_IDX_KEY` is not configured.
 */
export class IdxCorporateActionClient {
  constructor(private apiKey: string = config.marketData.rapidApiIdxKey) {}

  /**
   * Fetch all corporate actions (dividend + RUPS) within [from, to].
   * @param from Start date (YYYY-MM-DD)
   * @param to End date (YYYY-MM-DD)
   */
  async getCorporateActions(from: string, to: string): Promise<CorporateActionEvent[]> {
    if (!this.apiKey) {
      return [];
    }

    const [dividends, rups] = await Promise.all([
      this.fetchDividends(from, to),
      this.fetchRups(from, to),
    ]);

    return [...dividends, ...rups];
  }

  private async fetchDividends(from: string, to: string): Promise<CorporateActionEvent[]> {
    try {
      const response = await externalApiClient.get<RapidApiListResponse<RapidApiDividendItem>>(
        `${RAPID_API_IDX_BASE_URL}/api/calendar/dividend?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { headers: this.buildHeaders() }
      );

      const items = response.data.data?.data?.['dividend'] ?? [];
      const events: CorporateActionEvent[] = [];

      for (const item of items) {
        const rawSymbol = item.company_symbol ?? '';
        const exDate = item.dividend_exdate ?? '';
        if (!rawSymbol || !DATE_RE.test(exDate)) continue;

        const symbol = normalizeIdxSymbol(rawSymbol);
        const event: CorporateActionEvent = {
          symbol,
          name: symbol, // No company name in dividends endpoint, default to ticker
          type: 'dividend',
          date: exDate,
          currency: normalizeCurrency(item.dividend_currency ?? ''),
          note: '',
          market: 'IDX',
        };

        const payDate = item.dividend_paydate ?? '';
        if (DATE_RE.test(payDate)) {
          event.payDate = payDate;
        }

        const value = Number(item.dividend_value ?? '');
        if (Number.isFinite(value) && value > 0) {
          event.amount = value;
        }

        events.push(event);
      }

      return events;
    } catch (error) {
      console.error('Failed to fetch IDX dividend calendar:', error);
      return [];
    }
  }

  private async fetchRups(from: string, to: string): Promise<CorporateActionEvent[]> {
    try {
      const response = await externalApiClient.get<RapidApiListResponse<RapidApiRupsItem>>(
        `${RAPID_API_IDX_BASE_URL}/api/calendar/rups?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { headers: this.buildHeaders() }
      );

      const items = response.data.data?.data?.['rups'] ?? [];
      const events: CorporateActionEvent[] = [];

      for (const item of items) {
        const rawSymbol = item.company_symbol ?? '';
        const meetingDate = item.rups_date ?? '';
        if (!rawSymbol || !DATE_RE.test(meetingDate)) continue;

        const symbol = normalizeIdxSymbol(rawSymbol);
        const time = (item.rups_time ?? '').trim();
        const venue = (item.rups_venue ?? '').trim();
        let note = '';
        if (venue && time) {
          note = `Waktu: ${time}, Tempat: ${venue}`;
        } else if (venue) {
          note = `Tempat: ${venue}`;
        } else if (time) {
          note = `Waktu: ${time}`;
        }

        events.push({
          symbol,
          name: (item.company_name ?? '').trim() || symbol,
          type: 'rups',
          date: meetingDate,
          currency: '',
          note,
          market: 'IDX',
        });
      }

      return events;
    } catch (error) {
      console.error('Failed to fetch IDX RUPS calendar:', error);
      return [];
    }
  }

  private buildHeaders(): Record<string, string> {
    return {
      'X-RapidAPI-Key': this.apiKey,
      'X-RapidAPI-Host': RAPID_API_IDX_HOST,
      Accept: 'application/json',
    };
  }
}
