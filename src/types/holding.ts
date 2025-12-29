import { z } from "zod";

export type Holding = {
  id: number;
  user_id: string;
  name: string;
  platform: string;
  holding_type_id: number;
  currency: string;
  invested_amount: string;
  current_value: string;
  units?: string;
  avg_buy_price?: string;
  current_price?: string;
  last_updated?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  month: number;
  year: number;
};

export type HoldingCreate = {
  name: string;
  platform: string;
  holding_type_id: number;
  currency: string;
  invested_amount: string;
  current_value: string;
  units?: string;
  avg_buy_price?: string;
  current_price?: string;
  last_updated?: string;
  notes?: string;
  month?: number;
  year?: number;
};

export type HoldingUpdate = {
  name?: string;
  platform?: string;
  holding_type_id?: number;
  currency?: string;
  invested_amount?: string;
  current_value?: string;
  units?: string;
  avg_buy_price?: string;
  current_price?: string;
  last_updated?: string;
  notes?: string;
  month?: number;
  year?: number;
};

export type DuplicateHoldingPayload = {
  fromMonth: number;
  fromYear: number;
  toMonth: number;
  toYear: number;
  overwrite?: boolean;
};

export const holdingCreateSchema = z.object({
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

export const holdingUpdateSchema = z.object({
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