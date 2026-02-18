import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { ApiError, createErrorResponse } from "../utils/error";
import { getLogger } from "./logger";

/**
 * Global error handling middleware
 * Handles all errors consistently across the application
 */
export const errorHandler = () => {
  return async (err: unknown, c: Context) => {
    const requestId = c.get("requestId") || "unknown";

    // Log the error with context
    logError(err, c, requestId, getLogger());

    // Create standardized error response
    const errorResponse = createErrorResponse(err, requestId);

    // Determine status code
    let statusCode = 500;
    if (err instanceof ApiError) {
      statusCode = err.statusCode;
    } else if (err instanceof HTTPException) {
      statusCode = err.status;
    }

    // Return JSON response
    return c.json(errorResponse, statusCode as any);
  };
};

/**
 * Log error with context for debugging and monitoring
 */
function logError(err: unknown, c: Context, requestId: string, logger: any) {
  const errorContext = {
    requestId,
    method: c.req.method,
    path: c.req.path,
    timestamp: new Date().toISOString(),
    userAgent: c.req.header("User-Agent") || "unknown",
  };

  if (err instanceof ApiError) {
    logger.log({
      ...errorContext,
      errorType: "ApiError",
      errorCode: err.errorCode,
      message: err.message,
      details: err.details,
      isOperational: err.isOperational,
    });
  } else if (err instanceof HTTPException) {
    logger.log({
      ...errorContext,
      errorType: "HTTPException",
      statusCode: err.status,
      message: err.message,
    });
  } else if (err instanceof Error) {
    logger.log({
      ...errorContext,
      errorType: "Error",
      message: err.message,
      stack: err.stack,
    });
  } else {
    logger.log({
      ...errorContext,
      errorType: "Unknown",
      error: err,
    });
  }
}

/**
 * Error handling wrapper for async route handlers
 * Provides consistent error handling for controller methods
 */
export function withErrorHandling(handler: (c: Context) => Promise<Response>) {
  return async (c: Context) => {
    try {
      return await handler(c);
    } catch (error) {
      const errHandler = errorHandler();
      return errHandler(error, c);
    }
  };
}

/**
 * Validate request helper with consistent error handling
 */
export function validateRequest(
  source: "json" | "query" | "param" | "header",
  schema: any,
  errorCode: string = "VALID_001"
) {
  return async (c: Context, next: Next) => {
    try {
      const result = await schema.parseAsync(
        source === "json"
          ? await c.req.json()
          : source === "query"
          ? c.req.query()
          : source === "param"
          ? c.req.param()
          : c.req.header()
      );
      c.set("validatedData", result);
      await next();
    } catch (error) {
      if (error instanceof Error) {
        const validationError = error as Error;
        throw new ApiError(
          `Validation failed: ${validationError.message}`,
          400,
          errorCode as any,
          { field: validationError.message }
        );
      }
      throw new ApiError("Validation failed", 400, errorCode as any, {
        error: String(error),
      });
    }
  };
}
