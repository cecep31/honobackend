import { Hono } from 'hono';
import { auth } from '../../../middlewares/auth';
import type { AppServices } from '../../../services';
import type { Variables } from '../../../types/context';
import { sendSuccess } from '../../../utils/response';

type HoldingService = AppServices['holdingService'];

/** Global holding-type catalog (not scoped per user). */
export const createHoldingTypeController = (holdingService: HoldingService) =>
  new Hono<{ Variables: Variables }>().get('/', auth, async (c) => {
    const types = await holdingService.getHoldingTypes();
    return sendSuccess(c, types, 'Holding types fetched successfully');
  });
