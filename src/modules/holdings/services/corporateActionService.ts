import { and, asc, count, gte, lte } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { corporate_actions } from '../../../database/schemas/postgres/schema';
import {
  IdxCorporateActionClient,
  type CorporateActionEvent,
} from './idxCorporateActionClient';

export interface CorporateActionResponse {
  symbol: string;
  name?: string;
  type: string;
  date: string;
  pay_date?: string;
  amount?: number;
  currency?: string;
  note?: string;
  market: string;
}

export interface CorporateActionCalendarResponse {
  from: string;
  to: string;
  total: number;
  cached: boolean;
  actions: CorporateActionResponse[];
}

function formatDate(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type CorporateActionRow = typeof corporate_actions.$inferInsert;

/**
 * Collapse rows sharing the same (symbol, type, event_date) — the unique
 * constraint target — into one. IDX occasionally reports the same
 * company/date more than once (e.g. multiple RUPS agenda items), and a
 * single INSERT ... ON CONFLICT DO UPDATE statement errors if its target
 * key repeats within the batch. Distinct notes are concatenated so no
 * agenda information is silently dropped.
 */
function dedupeCorporateActions(rows: CorporateActionRow[]): CorporateActionRow[] {
  const order: string[] = [];
  const merged = new Map<string, CorporateActionRow>();

  for (const row of rows) {
    const key = `${row.symbol}|${row.type}|${row.event_date}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...row });
      order.push(key);
      continue;
    }
    if (row.note && existing.note !== row.note && !(existing.note ?? '').includes(row.note)) {
      existing.note = existing.note ? `${existing.note}; ${row.note}` : row.note;
    }
    if (existing.amount == null && row.amount != null) {
      existing.amount = row.amount;
    }
    if (existing.pay_date == null && row.pay_date != null) {
      existing.pay_date = row.pay_date;
    }
  }

  return order.map((key) => merged.get(key)!);
}


/**
 * Fetches dividend and RUPS events for the holdings calendar,
 * persisted in Postgres (mirrors echobackend CorporateActionService).
 *
 * If the month already has stored rows they are served directly without
 * calling IDX again. Otherwise IDX is queried, the results are upserted,
 * and the freshly stored rows are returned. Individual API errors are
 * swallowed (fail-open) so that a partial result is always returned.
 */
export class CorporateActionService {
  constructor(private idxClient: IdxCorporateActionClient = new IdxCorporateActionClient()) {}

  async getCalendar(year: number, month: number): Promise<CorporateActionCalendarResponse> {
    const now = new Date();
    const validMonth = month >= 1 && month <= 12 ? month : now.getUTCMonth() + 1;
    const validYear = Number.isInteger(year) ? year : now.getUTCFullYear();

    const from = formatDate(new Date(Date.UTC(validYear, validMonth - 1, 1)));
    const to = formatDate(new Date(Date.UTC(validYear, validMonth, 0))); // last day of month

    let cached = false;
    try {
      const existing = await db
        .select({ count: count() })
        .from(corporate_actions)
        .where(and(gte(corporate_actions.event_date, from), lte(corporate_actions.event_date, to)));
      cached = (existing[0]?.count ?? 0) > 0;
    } catch (error) {
      console.error('Failed to check corporate actions cache:', error);
    }

    if (!cached) {
      const events = await this.idxClient.getCorporateActions(from, to);
      if (events.length > 0) {
        await this.upsertEvents(events);
      }
    }

    let stored: (typeof corporate_actions.$inferSelect)[] = [];
    try {
      stored = await db
        .select()
        .from(corporate_actions)
        .where(and(gte(corporate_actions.event_date, from), lte(corporate_actions.event_date, to)))
        .orderBy(asc(corporate_actions.event_date));
    } catch (error) {
      console.error('Failed to fetch corporate actions:', error);
    }

    const actions: CorporateActionResponse[] = stored.map((row) => {
      const action: CorporateActionResponse = {
        symbol: row.symbol,
        type: row.type,
        date: row.event_date,
        market: row.market,
      };
      if (row.name) action.name = row.name;
      if (row.pay_date) action.pay_date = row.pay_date;
      if (row.amount != null) action.amount = Number(row.amount);
      if (row.currency) action.currency = row.currency;
      if (row.note) action.note = row.note;
      return action;
    });

    return { from, to, total: actions.length, cached, actions };
  }

  private async upsertEvents(events: CorporateActionEvent[]): Promise<void> {
    const rows = dedupeCorporateActions(
      events.map((event) => ({
        symbol: event.symbol,
        name: event.name,
        type: event.type,
        event_date: event.date,
        pay_date: event.payDate ?? null,
        amount: event.amount != null ? String(event.amount) : null,
        currency: event.currency,
        note: event.note,
        market: event.market,
      }))
    );
    if (rows.length === 0) return;

    try {
      await db
        .insert(corporate_actions)
        .values(rows)
        .onConflictDoUpdate({
          target: [corporate_actions.symbol, corporate_actions.type, corporate_actions.event_date],
          set: {
            name: corporate_actions.name,
            pay_date: corporate_actions.pay_date,
            amount: corporate_actions.amount,
            currency: corporate_actions.currency,
            note: corporate_actions.note,
            market: corporate_actions.market,
            updated_at: new Date().toISOString(),
          },
        });
    } catch (error) {
      console.error('Failed to upsert corporate actions:', error);
    }
  }
}
