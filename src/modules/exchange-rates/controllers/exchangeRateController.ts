import { Hono } from 'hono';
import { auth } from '../../../middlewares/auth';
import { validateRequest } from '../../../middlewares/validateRequest';
import type { AppServices } from '../../../services';
import type { Variables } from '../../../types/context';
import { sendSuccess } from '../../../utils/response';
import { getExchangeRateQuerySchema } from '../validation';

type ExchangeRateService = AppServices['exchangeRateService'];

export const createExchangeRateController = (exchangeRateService: ExchangeRateService) =>
  new Hono<{ Variables: Variables }>().get(
    '/',
    auth,
    validateRequest('query', getExchangeRateQuerySchema),
    async (c) => {
      const { from, to } = c.req.valid('query');
      const result = await exchangeRateService.getRate(from, to);
      return sendSuccess(c, result, 'Exchange rate fetched successfully');
    }
  );
