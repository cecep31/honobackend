import { createMiddleware } from "hono/factory";

interface LogEntry {
  level: string;
  method: string;
  url: string;
  status: number;
  latency: number;
  userAgent: string;
  ip: string;
  requestId: string;
  timestamp: string;
}

export const pilputLogger = createMiddleware(async (c, next) => {
  const start = Date.now();

  try {
    await next();
  } finally {
    const end = Date.now();
    const latency = end - start;

    const logEntry: LogEntry = {
      level: getLogLevel(c.res.status),
      method: c.req.method,
      url: new URL(c.req.url).pathname,
      status: c.res.status,
      latency,
      userAgent: c.req.header("user-agent") || "Unknown",
      ip: c.req.header("x-forwarded-for") || "Unknown",
      requestId: c.get("requestId") || "N/A",
      timestamp: new Date().toISOString(),
    };

    console.log(JSON.stringify(logEntry));
    
  }
});

function getLogLevel(status: number): string {
  if (status >= 500) return "error";
  if (status >= 400) return "warn";
  return "info";
}
