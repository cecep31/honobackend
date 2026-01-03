import { createMiddleware } from "hono/factory";

export type LogLevel = "error" | "warn" | "info" | "http" | "debug";

export interface LogContext {
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  latency?: number;
  userAgent?: string;
  ip?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
  metadata?: Record<string, unknown>;
}

const LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: "\x1b[31m", // red
  warn: "\x1b[33m",  // yellow
  info: "\x1b[36m",  // cyan
  http: "\x1b[34m",  // blue
  debug: "\x1b[37m", // white
};

const RESET = "\x1b[0m";

let currentLevel: LogLevel = (process.env['LOG_LEVEL'] as LogLevel) || "info";

export const setLogLevel = (level: LogLevel) => {
  currentLevel = level;
};

const getStatusLevel = (status: number): LogLevel => {
  if (status >= 500) return "error";
  if (status >= 400) return "warn";
  if (status >= 300) return "http";
  return "info";
};

interface Logger {
  error: (message: string, context?: LogContext, error?: Error) => void;
  warn: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  http: (message: string, context?: LogContext) => void;
  debug: (message: string, context?: LogContext) => void;
  withContext: (context: LogContext) => Logger;
}

class StandardLogger implements Logger {
  constructor(private baseContext: LogContext = {}) {}

  private shouldLog(level: LogLevel): boolean {
    return LEVELS[level] <= LEVELS[currentLevel];
  }

  private formatLog(entry: LogEntry): string {
    const color = LEVEL_COLORS[entry.level];
    const contextStr = entry.context ? Object.entries(entry.context)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value}`)
      .join(" ") : "";
    
    const parts = [
      `${color}[${entry.timestamp}]${RESET}`,
      `${color}${entry.level.toUpperCase()}${RESET}`,
      entry.message
    ];
    
    if (contextStr) parts.push(`(${contextStr})`);
    if (entry.error) parts.push(`Error: ${entry.error.message}`);
    
    return parts.join(" ");
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.baseContext, ...context },
      error,
      metadata: { ...this.baseContext, ...context }
    };

    const formattedLog = this.formatLog(entry);
    const logFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    logFn(formattedLog);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log("error", message, context, error);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  http(message: string, context?: LogContext): void {
    this.log("http", message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  withContext(context: LogContext): Logger {
    return new StandardLogger({ ...this.baseContext, ...context });
  }
}

export const logger = new StandardLogger();
export const getLogger = (context?: LogContext): Logger => {
  return context ? logger.withContext(context) : logger;
};

export const loggingMiddleware = createMiddleware(async (c, next) => {
  const start = Date.now();
  const requestId = c.get("requestId") || `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  c.set("requestId", requestId);

  const requestContext: LogContext = {
    requestId,
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    userAgent: c.req.header("user-agent"),
    ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown"
  };

  const requestLogger = getLogger(requestContext);

  requestLogger.debug("Request started", {
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    userAgent: c.req.header("user-agent")
  });

  try {
    await next();
  } catch (error) {
    const latency = Date.now() - start;
    const errorContext: LogContext = {
      ...requestContext,
      statusCode: 500
    };

    requestLogger.error(`Request failed - ${latency}ms`, errorContext, error as Error);
    throw error;
  }

  const latency = Date.now() - start;
  const status = c.res.status;
  const responseContext: LogContext = {
    ...requestContext,
    statusCode: status
  };

  const statusLevel = getStatusLevel(status);
  const message = `${c.req.method} ${new URL(c.req.url).pathname} ${status} - ${latency}ms`;
  
  switch (statusLevel) {
    case "error":
      requestLogger.error(message, responseContext);
      break;
    case "warn":
      requestLogger.warn(message, responseContext);
      break;
    case "http":
      requestLogger.http(message, responseContext);
      break;
    default:
      requestLogger.info(message, responseContext);
  }
});
