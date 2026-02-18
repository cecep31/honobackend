import type { Context } from "hono";
import type { ContentfulStatusCode as StatusCode } from "hono/utils/http-status";

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  totalPages?: number;
  hasMore?: boolean;
}

interface SuccessResponse<T> {
  success: true;
  data: T;
  message: string;
  meta?: PaginationMeta | Record<string, unknown>;
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
  meta?: PaginationMeta | Record<string, unknown>
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
