import { createMiddleware } from "hono/factory";

const colors = {
  reset: "\x1b[0m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

export const pilputLogger = createMiddleware(async (c, next) => {
  const start = Date.now();
  await next();
  const end = Date.now();
  const method = c.req.method;
  const url = c.req.url;
  const duration = end - start;
  const status = c.res.status;
  let tatuscolor = "";
  if (status >= 200 && status < 300) {
    tatuscolor = colors.green;
  } else if (status >= 300 && status < 400) {
    tatuscolor = colors.yellow;
  } else if (status >= 400 && status < 500) {
    tatuscolor = colors.blue;
  } else if (status >= 500 && status < 600) {
    tatuscolor = colors.red;
  }

  // {"level":"info","ip":"127.0.0.1","latency":"1.8629287s","status":200,"method":"GET","url":"/api/v2/posts","time":"2024-07-26T15:23:15+07:00","message":"Success"}

  console.log(
    `{"method":"${colors.blue}${method}${colors.reset}","url":"${colors.green}${url}${colors.reset}","latency":"${colors.yellow}${duration}ms${colors.reset}","status":"${tatuscolor}${status}${colors.reset}","requestId":"${colors.blue}${c.get("requestId")}${colors.reset}","userAgent":"${c.req.header("user-agent")}"}`
  );
});
