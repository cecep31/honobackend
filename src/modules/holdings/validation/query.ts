import { z } from 'zod';
import {
  MAX_PRICE_SYMBOL_QUERY_CHARS,
  MAX_TRENDS_YEAR_VALUES_IN_QUERY,
  MAX_TRENDS_YEARS_PARAM_CHARS,
} from '../../../utils/validationLimits';

const MIN_HOLDING_YEAR = 1990;
const MAX_HOLDING_YEAR = new Date().getFullYear() + 1;
const MAX_MONTHLY_RANGE_MONTHS = 240; // 20 years

function optionalQueryBoundedInt(min: number, max: number, maxDigits: number) {
  return z.union([
    z.undefined(),
    z
      .string()
      .regex(/^[0-9]+$/)
      .max(maxDigits)
      .transform((s) => Number(s))
      .pipe(z.number().int().gte(min).lte(max)),
  ]);
}

function getDefaultMonthRange() {
  const now = new Date();
  const endMonth = now.getMonth() + 1;
  const endYear = now.getFullYear();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
  const startMonth = startDate.getMonth() + 1;
  const startYear = startDate.getFullYear();
  return { startMonth, startYear, endMonth, endYear };
}

export const getHoldingsQuerySchema = z.object({
  month: optionalQueryBoundedInt(1, 12, 2),
  year: optionalQueryBoundedInt(MIN_HOLDING_YEAR, MAX_HOLDING_YEAR, 4),
  sortBy: z
    .enum([
      'created_at',
      'updated_at',
      'name',
      'platform',
      'invested_amount',
      'current_value',
      'holding_type',
    ])
    .optional()
    .default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const getSummaryQuerySchema = z.object({
  month: optionalQueryBoundedInt(1, 12, 2),
  year: optionalQueryBoundedInt(MIN_HOLDING_YEAR, MAX_HOLDING_YEAR, 4),
});

export const getTrendsQuerySchema = z.object({
  years: z
    .string()
    .max(MAX_TRENDS_YEARS_PARAM_CHARS)
    .optional()
    .transform((val) => {
      if (!val?.trim()) return undefined;
      const parts = val
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, MAX_TRENDS_YEAR_VALUES_IN_QUERY);
      const nums = parts
        .map((s) => Number(s))
        .filter(
          (n) => Number.isFinite(n) && Number.isInteger(n) && n >= MIN_HOLDING_YEAR && n <= MAX_HOLDING_YEAR
        );
      const unique = [...new Set(nums)];
      return unique.length ? unique : undefined;
    }),
});

export const getCompareMonthsSchema = z.object({
  fromMonth: optionalQueryBoundedInt(1, 12, 2),
  fromYear: optionalQueryBoundedInt(MIN_HOLDING_YEAR, MAX_HOLDING_YEAR, 4),
  toMonth: optionalQueryBoundedInt(1, 12, 2),
  toYear: optionalQueryBoundedInt(MIN_HOLDING_YEAR, MAX_HOLDING_YEAR, 4),
});

export const getMonthlyQuerySchema = z
  .object({
    startMonth: optionalQueryBoundedInt(1, 12, 2).default(() => getDefaultMonthRange().startMonth),
    startYear: optionalQueryBoundedInt(MIN_HOLDING_YEAR, MAX_HOLDING_YEAR, 4).default(
      () => getDefaultMonthRange().startYear
    ),
    endMonth: optionalQueryBoundedInt(1, 12, 2).default(() => getDefaultMonthRange().endMonth),
    endYear: optionalQueryBoundedInt(MIN_HOLDING_YEAR, MAX_HOLDING_YEAR, 4).default(
      () => getDefaultMonthRange().endYear
    ),
  })
  .refine(
    ({ startMonth, startYear, endMonth, endYear }) => {
      const totalStartMonths = startYear * 12 + startMonth;
      const totalEndMonths = endYear * 12 + endMonth;
      const diff = Math.abs(totalEndMonths - totalStartMonths);
      return diff <= MAX_MONTHLY_RANGE_MONTHS;
    },
    { message: 'Date range cannot exceed 20 years (240 months)' }
  );

export const getPriceQuerySchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(MAX_PRICE_SYMBOL_QUERY_CHARS),
});

/** Query untuk GET /calendar (corporate actions): default bulan & tahun berjalan */
export const getCalendarQuerySchema = z.object({
  month: optionalQueryBoundedInt(1, 12, 2).default(() => new Date().getMonth() + 1),
  year: optionalQueryBoundedInt(MIN_HOLDING_YEAR, MAX_HOLDING_YEAR, 4).default(
    () => new Date().getFullYear()
  ),
});
