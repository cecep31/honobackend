import { z } from "zod";

export const getHoldingsQuerySchema = z.object({
  month: z.string().regex(/^\d+$/).transform(Number).optional(),
  year: z.string().regex(/^\d+$/).transform(Number).optional(),
  sortBy: z
    .enum([
      "created_at",
      "updated_at",
      "name",
      "platform",
      "invested_amount",
      "current_value",
      "holding_type",
    ])
    .optional()
    .default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const getSummaryQuerySchema = z.object({
  month: z.string().regex(/^\d+$/).transform(Number).optional(),
  year: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export const getTrendsQuerySchema = z.object({
  years: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",").map(Number) : undefined)),
});

export const getCompareMonthsSchema = z.object({
  fromMonth: z.string().regex(/^\d+$/).transform(Number).optional(),
  fromYear: z.string().regex(/^\d+$/).transform(Number).optional(),
  toMonth: z.string().regex(/^\d+$/).transform(Number).optional(),
  toYear: z.string().regex(/^\d+$/).transform(Number).optional(),
});
