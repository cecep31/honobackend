import { createMiddleware } from "hono/factory";

export type LogLevel = "error" | "warn" | "info" | "http" | "debug";

const LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

let currentLevel: LogLevel = "http";

export const setLogLevel = (level: LogLevel) => {
  currentLevel = level;
};

const shouldLog = (level: LogLevel): boolean => {
  return LEVELS[level] <= LEVELS[currentLevel];
};

const getStatusLevel = (status: number): LogLevel => {
  if (status >= 500) return "error";
  if (status >= 400) return "warn";
  if (status >= 300) return "http";
  return "info";
};

interface SimpleLogger {
  log: (data: unknown) => void;
}

const simpleLogger: SimpleLogger = {
  log: (data) => {
    if (shouldLog("error")) {
      console.error(`[${new Date().toISOString()}]`, data);
    }
  },
};

export const getLogger = (): SimpleLogger => simpleLogger;

export const pilputLogger = createMiddleware(async (c, next) => {
  const start = Date.now();
  const requestId = c.get("requestId") || `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  c.set("requestId", requestId);

  try {
    await next();
  } catch (error) {
    if (shouldLog("error")) {
      console.error(`[${new Date().toISOString()}] ${requestId} ERROR: ${c.req.method} ${new URL(c.req.url).pathname} ${c.res.status} - ${error}`);
    }
    throw error;
  }

  if (shouldLog(getStatusLevel(c.res.status))) {
    const latency = Date.now() - start;
    const level = getStatusLevel(c.res.status);
    const logFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    logFn(`[${new Date().toISOString()}] ${requestId} ${c.req.method} ${new URL(c.req.url).pathname} ${c.res.status} ${latency}ms`);
  }
});
