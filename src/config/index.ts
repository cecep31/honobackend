export const originList = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://pilput.me",
  "https://www.pilput.me",
  "https://app.pilput.me",
  "https://dash.pilput.me",
  "https://pilput.me",
  "https://pilput.net",
];

function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === "") return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

function getMainDomain(): string | undefined {
  const domain = process.env["MAIN_DOMAIN"];
  return domain && domain !== "" ? domain : "pilput.net";
}

/**
 * Validate JWT_SECRET strength
 * Must be at least 32 characters for adequate security
 */
function validateJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];

  if (!secret || secret === "") {
    throw new Error(
      "JWT_SECRET is not set. Please set JWT_SECRET environment variable to a random string of at least 32 characters."
    );
  }

  if (secret.length < 32) {
    throw new Error(
      `JWT_SECRET is too weak (${secret.length} characters). ` +
      "It must be at least 32 characters long for adequate security."
    );
  }

  return secret;
}

export const rateLimitConfig = {
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: getNumberEnv("RATE_LIMIT_MAX", 150),
};

export const bodyLimitConfig = {
  maxSizeMB: getNumberEnv("BODY_LIMIT_MAX_SIZE_MB", 10), // Default 10MB
};

const githubConfig = {
  CLIENT_ID: process.env["GITHUB_CLIENT_ID"] ?? "",
  CLIENT_SECRET: process.env["GITHUB_CLIENT_SECRET"] ?? "",
  REDIRECT_URI:
    process.env["GITHUB_REDIRECT_URI"] ??
    "https://hono.pilput.net/auth/oauth/github/callback",
};

const getConfig = {
  rateLimiter: process.env["RATE_LIMITER"] === "true",
  rateLimitConfig,
  database: {
    url: process.env["DATABASE_URL"] ?? "",
    max_connections: getNumberEnv("DB_MAX_CONNECTIONS", 20),
    idle_timeout: getNumberEnv("DB_IDLE_TIMEOUT", 30),
    connect_timeout: getNumberEnv("DB_CONNECT_TIMEOUT", 5),
    max_lifetime: getNumberEnv("DB_MAX_LIFETIME", 1800),
  },
  jwt: {
    secret: validateJwtSecret(),
    expiresIn: process.env["JWT_EXPIRES_IN"] ?? "1d",
  },
  github: githubConfig,
  s3: {
    endpoint: process.env["S3_ENDPOINT"] ?? "",
    region: process.env["S3_REGION"] ?? "",
    accessKeyId: process.env["S3_ACCESS_KEY_ID"] ?? "",
    secretAccessKey: process.env["S3_SECRET_ACCESS_KEY"] ?? "",
    bucketName: process.env["S3_BUCKET_NAME"] ?? "",
  },
  openrouter: {
    apiKey: process.env["OPENROUTER_API_KEY"] ?? "",
    baseUrl:
      process.env["OPENROUTER_BASE_URL"] ?? "https://openrouter.ai/api/v1",
    defaultModel:
      process.env["OPENROUTER_DEFAULT_MODEL"] ?? "google/gemma-2-9b-it:free",
  },
  email: {
    host: process.env["EMAIL_HOST"] ?? "",
    port: getNumberEnv("EMAIL_PORT", 587),
    secure: process.env["EMAIL_SECURE"] === "true",
    user: process.env["EMAIL_USER"] ?? "",
    password: process.env["EMAIL_PASSWORD"] ?? "",
    from: process.env["EMAIL_FROM"] ?? "noreply@pilput.net",
  },
  frontend: {
    url: process.env["FRONTEND_URL"] ?? "https://pilput.net",
    resetPasswordUrl:
      process.env["FRONTEND_RESET_PASSWORD_URL"] ??
      "http://localhost:3000/reset-password",
    mainDomain: getMainDomain(),
  },
};

export default getConfig;
