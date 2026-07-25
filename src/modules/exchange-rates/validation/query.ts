import { z } from 'zod';

const currencyCodeSchema = z
  .string()
  .trim()
  .length(3, 'Currency code must be exactly 3 characters')
  .regex(/^[a-zA-Z]{3}$/, 'Currency code must contain only letters')
  .transform((v) => v.toUpperCase());

/** Query untuk GET / (exchange rate): ?from=USD&to=IDR */
export const getExchangeRateQuerySchema = z.object({
  from: currencyCodeSchema,
  to: currencyCodeSchema,
});

export type GetExchangeRateQuery = z.infer<typeof getExchangeRateQuerySchema>;
