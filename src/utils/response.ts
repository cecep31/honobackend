import type { Context } from "hono";
import type { ContentfulStatusCode as StatusCode } from "hono/utils/http-status";

interface SuccessResponse<T> {
  success: true;
  data: T;
  message: string;
  meta?: any;
  request_id: string;
  timestamp: string;
}

/**
 * Standardize successful API responses
 */
export function sendSuccess<T>(
  c: Context,
  data: T,
  message = "Success",
  status: StatusCode = 200,
  meta?: any
) {
  const requestId = c.get("requestId") || "unknown";
  const response: SuccessResponse<T> = {
    success: true,
    data,
    message,
    meta,
    request_id: requestId,
    timestamp: new Date().toISOString(),
  };

  return c.json(response, status);
}
