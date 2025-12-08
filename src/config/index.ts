export const originList = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://pilput.me",
  "https://www.pilput.me",
  "https://app.pilput.me",
  "https://dash.pilput.me",
  "https://pilput.me",
];

export const rateLimitConfig = {
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: process.env["RATE_LIMIT_MAX"]
    ? Number(process.env["RATE_LIMIT_MAX"])
    : 150, // Limit each IP to 300 requests per `window` (here, per 1 minute).
};

const githubConfig = {
  CLIENT_ID: process.env["GITHUB_CLIENT_ID"] ?? "",
  CLIENT_SECRET: process.env["GITHUB_CLIENT_SECRET"] ?? "",
  REDIRECT_URI: process.env["GITHUB_REDIRECT_URI"] ?? "https://hono.pilput.dev/auth/oauth/github/callback"
};


const getConfig = {
  rateLimiter: process.env["RATE_LIMITER"] === "true",
  rateLimitConfig,
  database: {
    url: process.env["DATABASE_URL"] ?? "",
    max_connections: process.env["DB_MAX_CONNECTIONS"] ? Number(process.env["DB_MAX_CONNECTIONS"]) : 50,
    idle_timeout: process.env["DB_IDLE_TIMEOUT"] ? Number(process.env["DB_IDLE_TIMEOUT"]) : 30,
    connect_timeout: process.env["DB_CONNECT_TIMEOUT"] ? Number(process.env["DB_CONNECT_TIMEOUT"]) : 5,
    max_lifetime: process.env["DB_MAX_LIFETIME"] ? Number(process.env["DB_MAX_LIFETIME"]) : 1800,
    prepare_statements: process.env["DB_PREPARE_STATEMENTS"] !== "false",
  },
  jwt: {
    secret: process.env["JWT_SECRET"] ?? "",
    expiresIn: process.env["JWT_EXPIRES_IN"] ?? "1d",
  },
  github : githubConfig,
};

export default getConfig;
