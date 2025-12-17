import { Hono } from "hono";
import { holdingService } from "../pkg/service";
import { auth } from "../middlewares/auth";
import { z } from "zod";
import { validateRequest } from "../middlewares/validateRequest";
import type { Variables } from "../types/context";

export const holdingController = new Hono<{ Variables: Variables }>()
  .get("/", auth, async (c) => {
    const auth = c.get("user");
    const holdings = await holdingService.getHoldingsByUserId(auth.user_id);
    return c.json({
      data: holdings,
      success: true,
      message: "holdings fetched successfully",
      requestId: c.get("requestId") || "N/A",
    });
  })
  .get("/types", auth, async (c) => {
    const types = await holdingService.getHoldingTypes();
    return c.json({
      data: types,
      success: true,
      message: "holding types fetched successfully",
      requestId: c.get("requestId") || "N/A",
    });
  })
  .get(
    "/:id",
    auth,
    validateRequest("param", z.object({ id: z.string().regex(/^\d+$/) })),
    async (c) => {
      const params = c.req.valid("param");
      const holding = await holdingService.getHoldingById(Number(params.id));
      return c.json({
        data: holding,
        success: true,
        message: "holding fetched successfully",
        requestId: c.get("requestId") || "N/A",
      });
    }
  )
  .post(
    "/",
    auth,
    validateRequest(
      "json",
      z.object({
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
      })
    ),
    async (c) => {
      const auth = c.get("user");
      const body = c.req.valid("json");
      const holding = await holdingService.createHolding(auth.user_id, body);
      return c.json({
        data: holding,
        success: true,
        message: "holding created successfully",
        requestId: c.get("requestId") || "N/A",
      }, 201);
    }
  )
  .put(
    "/:id",
    auth,
    validateRequest("param", z.object({ id: z.string().regex(/^\d+$/) })),
    validateRequest(
      "json",
      z.object({
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
      })
    ),
    async (c) => {
      const params = c.req.valid("param");
      const body = c.req.valid("json");
      const holding = await holdingService.updateHolding(Number(params.id), body);
      return c.json({
        data: holding,
        success: true,
        message: "holding updated successfully",
        requestId: c.get("requestId") || "N/A",
      });
    }
  )
  .delete(
    "/:id",
    auth,
    validateRequest("param", z.object({ id: z.string().regex(/^\d+$/) })),
    async (c) => {
      const params = c.req.valid("param");
      const holding = await holdingService.deleteHolding(Number(params.id));
      return c.json({
        data: holding,
        success: true,
        message: "holding deleted successfully",
        requestId: c.get("requestId") || "N/A",
      });
    }
  );