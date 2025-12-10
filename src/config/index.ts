export const originList = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://pilput.me",
  "https://www.pilput.me",
  "https://app.pilput.me",
  "https://dash.pilput.me",
  "https://pilput.me",
];
function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === "") return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

export const rateLimitConfig = {
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: getNumberEnv("RATE_LIMIT_MAX", 150),
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
    max_connections: getNumberEnv("DB_MAX_CONNECTIONS", 50),
    idle_timeout: getNumberEnv("DB_IDLE_TIMEOUT", 30),
    connect_timeout: getNumberEnv("DB_CONNECT_TIMEOUT", 5),
    max_lifetime: getNumberEnv("DB_MAX_LIFETIME", 1800),
    prepare_statements: process.env["DB_PREPARE_STATEMENTS"] !== "false",
  },
  jwt: {
    secret: process.env["JWT_SECRET"] ?? "",
    expiresIn: process.env["JWT_EXPIRES_IN"] ?? "1d",
  },
  github : githubConfig,
  s3: {
    endpoint: process.env["S3_ENDPOINT"] ?? "",
    region: process.env["S3_REGION"] ?? "",
    accessKeyId: process.env["S3_ACCESS_KEY_ID"] ?? "",
    secretAccessKey: process.env["S3_SECRET_ACCESS_KEY"] ?? "",
    bucketName: process.env["S3_BUCKET_NAME"] ?? "",
  },
};

export default getConfig;
