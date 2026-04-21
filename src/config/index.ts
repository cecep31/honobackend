// ------------------------------------------------------------------------------
// Env helpers
// ------------------------------------------------------------------------------

function getString(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

function getNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function getBoolean(key: string, fallback = false): boolean {
  return process.env[key] === 'true' ? true : fallback;
}

function requireString(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not set. Please configure it in your environment.`);
  }
  return value;
}

function requireJwtSecret(): string {
  const secret = requireString('JWT_SECRET');
  if (secret.length < 32) {
    throw new Error(
      `JWT_SECRET is too weak (${secret.length} chars). It must be at least 32 characters long.`
    );
  }
  return secret;
}

// ------------------------------------------------------------------------------
// Typed config shapes
// ------------------------------------------------------------------------------

interface DatabaseConfig {
  url: string;
  maxConnections: number;
  idleTimeout: number;
  connectTimeout: number;
  maxLifetime: number;
}

interface JwtConfig {
  secret: string;
  expiresIn: string;
}

interface GithubConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface S3Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
}

interface EmailConfig {
  resendApiKey: string;
  from: string;
}

interface FrontendConfig {
  url: string;
  resetPasswordUrl: string;
  mainDomain: string;
}

interface RateLimitConfig {
  windowMs: number;
  limit: number;
}

interface BodyLimitConfig {
  maxSizeMB: number;
}

interface CorsConfig {
  origins: string[];
}

interface AppConfig {
  rateLimiterEnabled: boolean;
  rateLimit: RateLimitConfig;
  bodyLimit: BodyLimitConfig;
  cors: CorsConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  github: GithubConfig;
  s3: S3Config;
  openrouter: OpenRouterConfig;
  email: EmailConfig;
  frontend: FrontendConfig;
}

// ------------------------------------------------------------------------------
// Config builders
// ------------------------------------------------------------------------------

function buildDatabaseConfig(): DatabaseConfig {
  return {
    url: requireString('DATABASE_URL'),
    maxConnections: getNumber('DB_MAX_CONNECTIONS', 10),
    idleTimeout: getNumber('DB_IDLE_TIMEOUT', 30),
    connectTimeout: getNumber('DB_CONNECT_TIMEOUT', 10),
    maxLifetime: getNumber('DB_MAX_LIFETIME', 1800),
  };
}

function buildJwtConfig(): JwtConfig {
  return {
    secret: requireJwtSecret(),
    expiresIn: getString('JWT_EXPIRES_IN', '1d'),
  };
}

function buildGithubConfig(): GithubConfig {
  return {
    clientId: getString('GITHUB_CLIENT_ID'),
    clientSecret: getString('GITHUB_CLIENT_SECRET'),
    redirectUri: getString(
      'GITHUB_REDIRECT_URI',
      'https://hono.pilput.net/auth/oauth/github/callback'
    ),
  };
}

function buildS3Config(): S3Config {
  return {
    endpoint: getString('S3_ENDPOINT'),
    region: getString('S3_REGION'),
    accessKeyId: getString('S3_ACCESS_KEY_ID'),
    secretAccessKey: getString('S3_SECRET_ACCESS_KEY'),
    bucketName: getString('S3_BUCKET_NAME'),
  };
}

function buildOpenRouterConfig(): OpenRouterConfig {
  return {
    apiKey: getString('OPENROUTER_API_KEY'),
    baseUrl: getString('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
    defaultModel: getString('OPENROUTER_DEFAULT_MODEL', 'google/gemma-2-9b-it:free'),
  };
}

function buildEmailConfig(): EmailConfig {
  return {
    resendApiKey: getString('RESEND_API_KEY'),
    from: getString('EMAIL_FROM', 'noreply@pilput.net'),
  };
}

function buildFrontendConfig(): FrontendConfig {
  return {
    url: getString('FRONTEND_URL', 'https://pilput.net'),
    resetPasswordUrl: getString('FRONTEND_RESET_PASSWORD_URL', 'http://localhost:3000/reset-password'),
    mainDomain: getString('MAIN_DOMAIN', 'pilput.net'),
  };
}

function buildCorsConfig(): CorsConfig {
  const customOrigin = getString('CORS_ORIGIN', '');
  return {
    origins: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://pilput.me',
      'https://www.pilput.me',
      'https://www.pilput.net',
      'https://app.pilput.me',
      'https://dash.pilput.me',
      'https://pilput.net',
      ...(customOrigin ? [customOrigin] : []),
    ],
  };
}

// ------------------------------------------------------------------------------
// Single source of truth
// ------------------------------------------------------------------------------

const config: AppConfig = {
  rateLimiterEnabled: getBoolean('RATE_LIMITER'),
  rateLimit: {
    windowMs: 60 * 1000,
    limit: getNumber('RATE_LIMIT_MAX', 150),
  },
  bodyLimit: {
    maxSizeMB: getNumber('BODY_LIMIT_MAX_SIZE_MB', 10),
  },
  cors: buildCorsConfig(),
  database: buildDatabaseConfig(),
  jwt: buildJwtConfig(),
  github: buildGithubConfig(),
  s3: buildS3Config(),
  openrouter: buildOpenRouterConfig(),
  email: buildEmailConfig(),
  frontend: buildFrontendConfig(),
};

// ------------------------------------------------------------------------------
// Named exports for convenience
// ------------------------------------------------------------------------------

export const originList = config.cors.origins;
export const rateLimitConfig = config.rateLimit;
export const bodyLimitConfig = config.bodyLimit;

export default config;
