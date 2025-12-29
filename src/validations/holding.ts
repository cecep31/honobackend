import { z } from "zod";

export const getHoldingsQuerySchema = z.object({
  month: z.string().regex(/^\d+$/).transform(Number).optional(),
  year: z.string().regex(/^\d+$/).transform(Number).optional(),
  sortBy: z.enum(["created_at", "updated_at", "name", "invested_amount", "current_value", "month", "year"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const holdingIdSchema = z.object({
  id: z.string().regex(/^\d+$/),
});

export const createHoldingSchema = z.object({
  name: z.string(),
  platform: z.string(),
  holding_type_id: z.number(),
  currency: z.string().length(3),
  invested_amount: z.number(),
  current_value: z.number(),
  units: z.string().nullable().optional(),
  avg_buy_price: z.number().nullable().optional(),
  current_price: z.number().nullable().optional(),
  last_updated: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  month: z.number().nullable().optional(),
  year: z.number().nullable().optional(),
});

export const updateHoldingSchema = z.object({
  name: z.string().optional(),
  platform: z.string().optional(),
  holding_type_id: z.number().optional(),
  currency: z.string().length(3).optional(),
  invested_amount: z.number().optional(),
  current_value: z.number().optional(),
  units: z.string().nullable().optional(),
  avg_buy_price: z.number().nullable().optional(),
  current_price: z.number().nullable().optional(),
  last_updated: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  month: z.number().nullable().optional(),
  year: z.number().nullable().optional(),
});

export const duplicateHoldingSchema = z.object({
  fromMonth: z.number().int().min(1).max(12),
  fromYear: z.number().int().min(1900).max(2100),
  toMonth: z.number().int().min(1).max(12),
  toYear: z.number().int().min(1900).max(2100),
  overwrite: z.boolean().optional().default(false),
});

export type DuplicateHoldingPayload = z.infer<typeof duplicateHoldingSchema>;
