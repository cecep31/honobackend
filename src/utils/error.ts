import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode as StatusCode } from "hono/utils/http-status";

/**
 * Error classification codes
 * 1xxx: Authentication/Authorization errors
 * 2xxx: Validation errors  
 * 3xxx: Database errors
 * 4xxx: External service errors
 * 5xxx: Business logic errors
 * 6xxx: System/Infrastructure errors
 */
export type ErrorCode =
  | "AUTH_001" | "AUTH_002" | "AUTH_003" // Authentication errors
  | "VALID_001" | "VALID_002" // Validation errors
  | "DB_001" | "DB_002" | "DB_003" // Database errors
  | "EXT_001" | "EXT_002" // External service errors
  | "BIZ_001" | "BIZ_002" // Business logic errors
  | "SYS_001" | "SYS_002" // System errors
  | "RATE_001"; // Rate limit errors

/**
 * Custom API error class for consistent error handling
 */
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: StatusCode,
    public errorCode?: ErrorCode,
    public details?: any,
    public isOperational = true
  ) {
    super(message);
    this.name = "ApiError";
    this.cause = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/** Single validation issue (e.g. from Zod) */
export interface ValidationIssue {
  field?: string;
  message: string;
}

/**
 * Standard error response format.
 * - success, message: always present for clients
 * - error: always present; code for machine handling, details for validation/extra context
 * - request_id, timestamp: for support and client logging
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  error: {
    code?: ErrorCode;
    details?: ValidationIssue[] | Record<string, unknown>;
  };
  request_id: string;
  timestamp: string;
}

/**
 * Enhanced error utility with error classification
 * @param message Error message
 * @param statusCode HTTP status code
 * @param errorCode Optional error classification code
 * @param details Additional error details
 */
export function errorHttp(
  message: string,
  statusCode: StatusCode = 500,
  errorCode?: ErrorCode,
  details?: any
): never {
  throw new ApiError(message, statusCode, errorCode, details);
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: unknown,
  requestId: string
): ApiErrorResponse {
  const timestamp = new Date().toISOString();
  // Never send stack traces to clients (security); stack is logged server-side only.

  if (error instanceof ApiError) {
    return {
      success: false,
      message: error.message,
      error: {
        code: error.errorCode,
        details: error.details,
      },
      request_id: requestId,
      timestamp
    };
  }

  if (error instanceof HTTPException) {
    return {
      success: false,
      message: error.message,
      error: {},
      request_id: requestId,
      timestamp
    };
  }

  // Handle unknown errors
  const errorMessage = error instanceof Error ? error.message : 'Internal server error';
  if (!(error instanceof ApiError) && !(error instanceof HTTPException)) {
    console.error('Unexpected error:', error);
  }
  return {
    success: false,
    message: errorMessage,
    error: {},
    request_id: requestId,
    timestamp
  };
}

/**
 * Common error utilities
 */
export const Errors = {
  // Authentication errors
  Unauthorized: () => errorHttp('Unauthorized', 401, 'AUTH_001'),
  Forbidden: () => errorHttp('Forbidden', 403, 'AUTH_002'),
  InvalidCredentials: () => errorHttp('Invalid credentials', 401, 'AUTH_003'),
  
  // Validation errors
  ValidationFailed: (details: any) => errorHttp('Validation failed', 400, 'VALID_001', details),
  InvalidInput: (field: string, message: string) => errorHttp(`Invalid ${field}: ${message}`, 400, 'VALID_002'),
  
  // Database errors
  NotFound: (entity: string) => errorHttp(`${entity} not found`, 404, 'DB_001'),
  DatabaseError: (details: any) => errorHttp('Database operation failed', 500, 'DB_002', details),
  
  // External service errors
  ExternalServiceError: (service: string) => errorHttp(`${service} service error`, 503, 'EXT_001'),
  
  // Business logic errors
  BusinessRuleViolation: (rule: string) => errorHttp(`Business rule violation: ${rule}`, 409, 'BIZ_001'),

  // Rate limiting
  TooManyRequests: (retryAfter = 60) => errorHttp('Too many requests', 429, 'RATE_001', { retry_after: retryAfter }),

  // System errors
  InternalServerError: () => errorHttp('Internal server error', 500, 'SYS_001'),
  ServiceUnavailable: () => errorHttp('Service unavailable', 503, 'SYS_002')
};
