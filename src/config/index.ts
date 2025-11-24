export const originList = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://pilput.dev",
  "https://www.pilput.dev",
  "https://app.pilput.dev",
  "https://dash.pilput.dev",
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
  },
  jwt: {
    secret: process.env["JWT_SECRET"] ?? "",
    expiresIn: process.env["JWT_EXPIRES_IN"] ?? "1d",
  },
  github : githubConfig,
};

export default getConfig;
