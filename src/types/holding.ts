import { z } from "zod";

export type Holding = {
  id: number;
  userId: string;
  name: string;
  platform: string;
  holdingTypeId: number;
  currency: string;
  investedAmount: string;
  currentValue: string;
  units?: string;
  avgBuyPrice?: string;
  currentPrice?: string;
  lastUpdated?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  month: number;
  year: number;
};

export type HoldingCreate = {
  name: string;
  platform: string;
  holdingTypeId: number;
  currency: string;
  investedAmount: string;
  currentValue: string;
  units?: string;
  avgBuyPrice?: string;
  currentPrice?: string;
  lastUpdated?: string;
  notes?: string;
  month?: number;
  year?: number;
};

export type HoldingUpdate = {
  name?: string;
  platform?: string;
  holdingTypeId?: number;
  currency?: string;
  investedAmount?: string;
  currentValue?: string;
  units?: string;
  avgBuyPrice?: string;
  currentPrice?: string;
  lastUpdated?: string;
  notes?: string;
  month?: number;
  year?: number;
};

export const holdingCreateSchema = z.object({
  name: z.string(),
  platform: z.string(),
  holdingTypeId: z.number(),
  currency: z.string().length(3),
  investedAmount: z.string(),
  currentValue: z.string(),
  units: z.string().optional(),
  avgBuyPrice: z.string().optional(),
  currentPrice: z.string().optional(),
  lastUpdated: z.string().optional(),
  notes: z.string().optional(),
  month: z.number().optional(),
  year: z.number().optional(),
});

export const holdingUpdateSchema = z.object({
  name: z.string().optional(),
  platform: z.string().optional(),
  holdingTypeId: z.number().optional(),
  currency: z.string().length(3).optional(),
  investedAmount: z.string().optional(),
  currentValue: z.string().optional(),
  units: z.string().optional(),
  avgBuyPrice: z.string().optional(),
  currentPrice: z.string().optional(),
  lastUpdated: z.string().optional(),
  notes: z.string().optional(),
  month: z.number().optional(),
  year: z.number().optional(),
});