import { Hono } from "hono";
import { holdingService } from "../pkg/service";
import { auth } from "../middlewares/auth";
import { validateRequest } from "../middlewares/validateRequest";
import type { Variables } from "../types/context";
import { sendSuccess } from "../utils/response";
import {
  createHoldingSchema,
  getHoldingsQuerySchema,
  holdingIdSchema,
  updateHoldingSchema,
} from "../validations/holding";

export const holdingController = new Hono<{ Variables: Variables }>()
  .get("/", auth, validateRequest("query", getHoldingsQuerySchema), async (c) => {
    const authUser = c.get("user");
    const { month, year } = c.req.valid("query");
    const holdings = await holdingService.getHoldingsByUserId(
      authUser.user_id,
      month,
      year
    );
    return sendSuccess(c, holdings, "Holdings fetched successfully");
  })
  .get("/types", auth, async (c) => {
    const types = await holdingService.getHoldingTypes();
    return sendSuccess(c, types, "Holding types fetched successfully");
  })
  .get(
    "/:id",
    auth,
    validateRequest("param", holdingIdSchema),
    async (c) => {
      const params = c.req.valid("param");
      const holding = await holdingService.getHoldingById(Number(params.id));
      return sendSuccess(c, holding, "Holding fetched successfully");
    }
  )
  .post(
    "/",
    auth,
    validateRequest("json", createHoldingSchema),
    async (c) => {
      const authUser = c.get("user");
      const body = c.req.valid("json");
      const holding = await holdingService.createHolding(authUser.user_id, body);
      return sendSuccess(c, holding, "Holding created successfully", 201);
    }
  )
  .put(
    "/:id",
    auth,
    validateRequest("param", holdingIdSchema),
    validateRequest("json", updateHoldingSchema),
    async (c) => {
      const params = c.req.valid("param");
      const body = c.req.valid("json");
      const holding = await holdingService.updateHolding(
        Number(params.id),
        body
      );
      return sendSuccess(c, holding, "Holding updated successfully");
    }
  )
  .delete(
    "/:id",
    auth,
    validateRequest("param", holdingIdSchema),
    async (c) => {
      const params = c.req.valid("param");
      const holding = await holdingService.deleteHolding(Number(params.id));
      return sendSuccess(c, holding, "Holding deleted successfully");
    }
  );
