import { z } from 'zod';
import {
  MAX_HOLDING_NAME_LENGTH,
  MAX_HOLDING_NOTES_LENGTH,
  MAX_HOLDING_NUMERIC_AMOUNT,
  MAX_HOLDING_PLATFORM_LENGTH,
  MAX_HOLDING_SYMBOL_LENGTH,
  MAX_ISO_DATETIME_STRING_LENGTH,
  SMALLINT_POSITIVE_MAX,
} from '../../../utils/validationLimits';

const nonNegFiniteAmount = z
  .number()
  .finite()
  .min(0)
  .max(MAX_HOLDING_NUMERIC_AMOUNT);

export const createHoldingSchema = z.object({
  name: z.string().max(MAX_HOLDING_NAME_LENGTH),
  symbol: z.string().max(MAX_HOLDING_SYMBOL_LENGTH).nullable().optional(),
  platform: z.string().max(MAX_HOLDING_PLATFORM_LENGTH),
  holding_type_id: z.number().int().positive().max(SMALLINT_POSITIVE_MAX),
  currency: z.string().length(3),
  invested_amount: nonNegFiniteAmount,
  current_value: nonNegFiniteAmount,
  units: nonNegFiniteAmount.nullable().optional(),
  avg_buy_price: nonNegFiniteAmount.nullable().optional(),
  current_price: nonNegFiniteAmount.nullable().optional(),
  last_updated: z.string().max(MAX_ISO_DATETIME_STRING_LENGTH).nullable().optional(),
  notes: z.string().max(MAX_HOLDING_NOTES_LENGTH).nullable().optional(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export const updateHoldingSchema = z.object({
  name: z.string().max(MAX_HOLDING_NAME_LENGTH).optional(),
  symbol: z.string().max(MAX_HOLDING_SYMBOL_LENGTH).nullable().optional(),
  platform: z.string().max(MAX_HOLDING_PLATFORM_LENGTH).optional(),
  holding_type_id: z.number().int().positive().max(SMALLINT_POSITIVE_MAX).optional(),
  currency: z.string().length(3).optional(),
  invested_amount: nonNegFiniteAmount.optional(),
  current_value: nonNegFiniteAmount.optional(),
  units: nonNegFiniteAmount.nullable().optional(),
  avg_buy_price: nonNegFiniteAmount.nullable().optional(),
  current_price: nonNegFiniteAmount.nullable().optional(),
  last_updated: z.string().max(MAX_ISO_DATETIME_STRING_LENGTH).nullable().optional(),
  notes: z.string().max(MAX_HOLDING_NOTES_LENGTH).nullable().optional(),
  month: z.number().int().min(1).max(12).nullable().optional(),
  year: z.number().int().min(2000).max(2100).nullable().optional(),
});

export const duplicateHoldingSchema = z.object({
  fromMonth: z.number().int().min(1).max(12),
  fromYear: z.number().int().min(1900).max(2100),
  toMonth: z.number().int().min(1).max(12),
  toYear: z.number().int().min(1900).max(2100),
  overwrite: z.boolean().optional().default(false),
});

export type DuplicateHoldingPayload = z.infer<typeof duplicateHoldingSchema>;
export type HoldingCreate = z.infer<typeof createHoldingSchema>;
export type HoldingUpdate = z.infer<typeof updateHoldingSchema>;
