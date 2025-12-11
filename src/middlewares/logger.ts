import { createMiddleware } from "hono/factory";

// Define log levels with numeric values for severity
export const LogLevel = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  HTTP: "http",
  DEBUG: "debug",
} as const;

export type LogLevelType = typeof LogLevel[keyof typeof LogLevel];

// Define log colors for console output
const LogColors: Record<LogLevelType, string> = {
  [LogLevel.ERROR]: "\x1b[31m", // Red
  [LogLevel.WARN]: "\x1b[33m",  // Yellow
  [LogLevel.INFO]: "\x1b[32m",  // Green
  [LogLevel.HTTP]: "\x1b[35m",  // Magenta
  [LogLevel.DEBUG]: "\x1b[34m", // Blue
};

// Interface for structured log entry
interface LogEntry {
  level: LogLevelType;
  message: string;
  timestamp: string;
  method?: string;
  url?: string;
  status?: number;
  latency?: number;
  userAgent?: string;
  ip?: string;
  requestId?: string;
  context?: Record<string, unknown>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    [key: string]: unknown;
  };
}

// Interface for logger configuration
interface LoggerConfig {
  level?: LogLevelType;
  enableColors?: boolean;
  prettyPrint?: boolean;
  showTimestamp?: boolean;
}

// Default logger configuration
const defaultConfig: LoggerConfig = {
  level: LogLevel.INFO,
  enableColors: true,
  prettyPrint: process.env.NODE_ENV === "development",
  showTimestamp: true,
};

// Logger class implementation
class PilputLogger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig = defaultConfig) {
    this.config = { ...defaultConfig, ...config };
  }

  // Log method with structured logging
  public log(entry: LogEntry): void {
    const { level, message, ...rest } = entry;

    // Skip if log level is below configured level
    const levelPriority = this.getLevelPriority(level);
    const configLevelPriority = this.getLevelPriority(this.config.level || LogLevel.INFO);

    if (levelPriority > configLevelPriority) {
      return;
    }

    let logMessage = "";

    // Add timestamp if enabled
    if (this.config.showTimestamp) {
      logMessage += `[${entry.timestamp}] `;
    }

    // Add log level with color if enabled
    const levelText = this.formatLevel(level);
    logMessage += `${levelText}: ${message}`;

    // Add additional context if available
    if (Object.keys(rest).length > 0) {
      const contextString = this.config.prettyPrint
        ? JSON.stringify(rest, null, 2)
        : JSON.stringify(rest);
      logMessage += ` ${contextString}`;
    }

    // Output to console
    console.log(logMessage);
  }

  // Format log level with color
  private formatLevel(level: LogLevelType): string {
    if (!this.config.enableColors) {
      return level.toUpperCase();
    }

    const color = LogColors[level] || "\x1b[0m"; // Default to reset if level not found
    return `${color}${level.toUpperCase()}\x1b[0m`; // Reset color after level
  }

  // Get numeric priority for log level
  private getLevelPriority(level: LogLevelType): number {
    const priorities: Record<LogLevelType, number> = {
      [LogLevel.ERROR]: 0,
      [LogLevel.WARN]: 1,
      [LogLevel.INFO]: 2,
      [LogLevel.HTTP]: 3,
      [LogLevel.DEBUG]: 4,
    };
    return priorities[level] || 2; // Default to INFO priority
  }

  // Format error for logging
  public formatError(error: unknown): LogEntry["error"] {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (typeof error === "object" && error !== null) {
      return error as LogEntry["error"];
    }

    return { message: String(error) };
  }
}

// Singleton logger instance
let loggerInstance: PilputLogger;

// Get or create logger instance
function getLogger(config?: LoggerConfig): PilputLogger {
  if (!loggerInstance) {
    loggerInstance = new PilputLogger(config);
  }
  return loggerInstance;
}

// Get log level based on HTTP status code
function getLogLevel(status: number): LogLevelType {
  if (status >= 500) return LogLevel.ERROR;
  if (status >= 400) return LogLevel.WARN;
  if (status >= 300) return LogLevel.HTTP;
  return LogLevel.INFO;
}

// Create structured log entry
function createLogEntry(
  c: any,
  startTime: number,
  error?: unknown,
  context: Record<string, unknown> = {}
): LogEntry {
  const endTime = Date.now();
  const latency = endTime - startTime;

  const baseEntry: LogEntry = {
    level: getLogLevel(c.res.status),
    message: `${c.req.method} ${new URL(c.req.url).pathname} ${c.res.status}`,
    timestamp: new Date().toISOString(),
    method: c.req.method,
    url: new URL(c.req.url).pathname,
    status: c.res.status,
    latency,
    userAgent: c.req.header("user-agent") || "Unknown",
    ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "Unknown",
    requestId: c.get("requestId") || `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    context: {
      phase: "request_completed",
      ...context,
    },
  };

  // Add error information if present
  if (error) {
    baseEntry.error = getLogger().formatError(error);
    baseEntry.level = LogLevel.ERROR;
  }

  return baseEntry;
}

// Main logger middleware
export const pilputLogger = createMiddleware(async (c, next) => {
  const start = Date.now();
  const logger = getLogger();

  // Generate or use existing request ID for correlation
  const requestId = c.get("requestId") || `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  c.set("requestId", requestId);

  try {
    await next();
  } catch (error) {
    // Log the error with full context
    const errorEntry = createLogEntry(c, start, error, {
      phase: "error_handler",
    });

    logger.log(errorEntry);

    // Re-throw the error to let Hono handle it
    throw error;
  } finally {
    // Log the request completion
    const logEntry = createLogEntry(c, start, undefined, {
      phase: "request_completed",
    });

    logger.log(logEntry);
  }
});

// Export logger for direct use
export { getLogger };
