import { Hono } from "hono";
import { holdingService } from "../../services/index";
import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import type { Variables } from "../../types/context";
import { sendSuccess } from "../../utils/response";
import {
  createHoldingSchema,
  duplicateHoldingSchema,
  getHoldingsQuerySchema,
  getSummaryQuerySchema,
  getTrendsQuerySchema,
  holdingIdSchema,
  updateHoldingSchema,
} from "./validation/holding";

export const holdingController = new Hono<{ Variables: Variables }>()
  .get(
    "/",
    auth,
    validateRequest("query", getHoldingsQuerySchema),
    async (c) => {
      const authUser = c.get("user");
      const { month, year, sortBy, order } = c.req.valid("query");
      const holdings = await holdingService.getHoldingsByUserId(
        authUser.user_id,
        month,
        year,
        sortBy,
        order
      );
      return sendSuccess(c, holdings, "Holdings fetched successfully");
    }
  )
  .get(
    "/summary",
    auth,
    validateRequest("query", getSummaryQuerySchema),
    async (c) => {
      const authUser = c.get("user");
      const { month, year } = c.req.valid("query");
      const summary = await holdingService.getSummary(
        authUser.user_id,
        month,
        year
      );
      return sendSuccess(c, summary, "Holdings summary fetched successfully");
    }
  )
  .get(
    "/trends",
    auth,
    validateRequest("query", getTrendsQuerySchema),
    async (c) => {
      const authUser = c.get("user");
      const { years } = c.req.valid("query");
      const trends = await holdingService.getTrends(authUser.user_id, years);
      return sendSuccess(c, trends, "Holdings trends fetched successfully");
    }
  )
  .get("/types", auth, async (c) => {
    const types = await holdingService.getHoldingTypes();
    return sendSuccess(c, types, "Holding types fetched successfully");
  })
  .get("/:id", auth, validateRequest("param", holdingIdSchema), async (c) => {
    const params = c.req.valid("param");
    const holding = await holdingService.getHoldingById(Number(params.id));
    return sendSuccess(c, holding, "Holding fetched successfully");
  })
  .post("/", auth, validateRequest("json", createHoldingSchema), async (c) => {
    const authUser = c.get("user");
    const body = c.req.valid("json");
    const holding = await holdingService.createHolding(authUser.user_id, body);
    return sendSuccess(c, holding, "Holding created successfully", 201);
  })
  .post(
    "/duplicate",
    auth,
    validateRequest("json", duplicateHoldingSchema),
    async (c) => {
      const authUser = c.get("user");
      const body = c.req.valid("json");
      const holdings = await holdingService.duplicateHoldingsByMonth(
        authUser.user_id,
        body
      );
      return sendSuccess(c, holdings, "Holdings duplicated successfully", 201);
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
