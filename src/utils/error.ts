import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode as StatusCode } from 'hono/utils/http-status';

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
  | 'AUTH_001'
  | 'AUTH_002'
  | 'AUTH_003' // Authentication errors
  | 'VALID_001'
  | 'VALID_002' // Validation errors
  | 'DB_001'
  | 'DB_002'
  | 'DB_003' // Database errors
  | 'EXT_001'
  | 'EXT_002' // External service errors
  | 'BIZ_001'
  | 'BIZ_002' // Business logic errors
  | 'SYS_001'
  | 'SYS_002' // System errors
  | 'RATE_001'; // Rate limit errors

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
    this.name = 'ApiError';
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

/** Normalize ValidationFailed payloads (Zod arrays or `{ message }` objects). */
export function normalizeValidationIssues(details: unknown): ValidationIssue[] {
  if (Array.isArray(details)) {
    return details as ValidationIssue[];
  }
  if (details !== null && details !== undefined && typeof details === 'object') {
    const o = details as Record<string, unknown>;
    if (typeof o.message === 'string') {
      const field = typeof o.field === 'string' ? o.field : undefined;
      return [{ field, message: o.message }];
    }
  }
  return [{ message: 'Validation failed' }];
}

/**
 * Standard error response format (flat; no nested envelope object).
 * - success, message, request_id, timestamp: always present
 * - error: machine-readable classification (`ErrorCode`) when thrown as ApiError
 * - VALID_001: lists field issues in `errors`
 * - details: optional extra context (retry_after, etc.)
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: ErrorCode;
  errors?: ValidationIssue[];
  details?: ValidationIssue[] | Record<string, unknown>;
  request_id: string;
  timestamp: string;
}

const GENERIC_CLIENT_ERROR_MESSAGE = 'Request failed';
const GENERIC_SERVER_ERROR_MESSAGE = 'Internal server error';

function isServerErrorStatus(statusCode: number): boolean {
  return statusCode >= 500;
}

function getSafeMessage(statusCode: number, message?: string): string {
  if (isServerErrorStatus(statusCode)) {
    return GENERIC_SERVER_ERROR_MESSAGE;
  }

  if (message && message.trim().length > 0) {
    return message;
  }

  return GENERIC_CLIENT_ERROR_MESSAGE;
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
export function createErrorResponse(error: unknown, requestId: string): ApiErrorResponse {
  const timestamp = new Date().toISOString();
  // Never send stack traces to clients (security); stack is logged server-side only.

  if (error instanceof ApiError) {
    if (error.errorCode === 'VALID_001') {
      return {
        success: false,
        message: getSafeMessage(error.statusCode, error.message),
        error: error.errorCode,
        errors: normalizeValidationIssues(error.details),
        request_id: requestId,
        timestamp,
      };
    }

    const body: ApiErrorResponse = {
      success: false,
      message: getSafeMessage(error.statusCode, error.message),
      request_id: requestId,
      timestamp,
    };
    if (error.errorCode) {
      body.error = error.errorCode;
    }
    if (error.details !== undefined && error.details !== null) {
      body.details = error.details;
    }
    return body;
  }

  if (error instanceof HTTPException) {
    return {
      success: false,
      message: getSafeMessage(error.status, error.message),
      request_id: requestId,
      timestamp,
    };
  }

  const errorMessage = error instanceof Error ? error.message : undefined;
  if (!(error instanceof ApiError) && !(error instanceof HTTPException)) {
    console.error('Unexpected error:', error);
  }
  return {
    success: false,
    message: getSafeMessage(500, errorMessage),
    request_id: requestId,
    timestamp,
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
  InvalidInput: (field: string, message: string) =>
    errorHttp(`Invalid ${field}: ${message}`, 400, 'VALID_002'),

  // Database errors
  NotFound: (entity: string) => errorHttp(`${entity} not found`, 404, 'DB_001'),
  DatabaseError: (details: any) => errorHttp('Database operation failed', 500, 'DB_002', details),

  // External service errors
  ExternalServiceError: (service: string) => errorHttp(`${service} service error`, 503, 'EXT_001'),

  // Business logic errors
  BusinessRuleViolation: (rule: string) =>
    errorHttp(`Business rule violation: ${rule}`, 409, 'BIZ_001'),

  // Rate limiting
  TooManyRequests: (retryAfter = 60) =>
    errorHttp('Too many requests', 429, 'RATE_001', { retry_after: retryAfter }),

  // System errors
  InternalServerError: () => errorHttp('Internal server error', 500, 'SYS_001'),
  ServiceUnavailable: () => errorHttp('Service unavailable', 503, 'SYS_002'),
};
