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

  console.log(
    `${colors.blue}${method}${colors.reset} ${colors.green}${url}${
      colors.reset
    } - ${colors.yellow}${duration}ms${colors.reset} | ${tatuscolor}${status}${
      colors.reset
    } | ${colors.blue}${c.get("requestId")}${colors.reset} | ${c.req.header("user-agent")}` 
  );
});
