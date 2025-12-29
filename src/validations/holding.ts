import { z } from "zod";

export const getHoldingsQuerySchema = z.object({
  month: z.string().regex(/^\d+$/).transform(Number).optional(),
  year: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export const holdingIdSchema = z.object({
  id: z.string().regex(/^\d+$/),
});

export const createHoldingSchema = z.object({
  name: z.string(),
  platform: z.string(),
  holding_type_id: z.number(),
  currency: z.string().length(3),
  invested_amount: z.string(),
  current_value: z.string(),
  units: z.string().optional(),
  avg_buy_price: z.string().optional(),
  current_price: z.string().optional(),
  last_updated: z.string().optional(),
  notes: z.string().optional(),
  month: z.number().optional(),
  year: z.number().optional(),
});

export const updateHoldingSchema = z.object({
  name: z.string().optional(),
  platform: z.string().optional(),
  holding_type_id: z.number().optional(),
  currency: z.string().length(3).optional(),
  invested_amount: z.string().optional(),
  current_value: z.string().optional(),
  units: z.string().optional(),
  avg_buy_price: z.string().optional(),
  current_price: z.string().optional(),
  last_updated: z.string().optional(),
  notes: z.string().optional(),
  month: z.number().optional(),
  year: z.number().optional(),
});

export const duplicateHoldingSchema = z.object({
  fromMonth: z.number().int().min(1).max(12),
  fromYear: z.number().int().min(1900).max(2100),
  toMonth: z.number().int().min(1).max(12),
  toYear: z.number().int().min(1900).max(2100),
  overwrite: z.boolean().optional().default(false),
});

export type DuplicateHoldingPayload = z.infer<typeof duplicateHoldingSchema>;
