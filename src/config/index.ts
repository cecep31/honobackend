export const originList = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://pilput.me',
  'https://www.pilput.me',
  'https://www.pilput.net',
  'https://app.pilput.me',
  'https://dash.pilput.me',
  'https://pilput.net',
];

function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;

  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function getStringEnv(key: string, defaultValue = ''): string {
  return process.env[key] ?? defaultValue;
}

function validateDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set. Please configure a valid PostgreSQL connection URL.');
  }

  return databaseUrl;
}

function getMainDomain(): string {
  return process.env.MAIN_DOMAIN ?? 'pilput.net';
}

/**
 * Validate JWT_SECRET strength
 * Must be at least 32 characters for adequate security
 */
function validateJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      'JWT_SECRET is not set. Please set JWT_SECRET environment variable to a random string of at least 32 characters.'
    );
  }

  if (secret.length < 32) {
    throw new Error(
      `JWT_SECRET is too weak (${secret.length} characters). ` +
        'It must be at least 32 characters long for adequate security.'
    );
  }

  return secret;
}

export const rateLimitConfig = {
  windowMs: 60 * 1000,
  limit: getNumberEnv('RATE_LIMIT_MAX', 150),
};

export const bodyLimitConfig = {
  maxSizeMB: getNumberEnv('BODY_LIMIT_MAX_SIZE_MB', 10),
};

const githubConfig = {
  CLIENT_ID: getStringEnv('GITHUB_CLIENT_ID'),
  CLIENT_SECRET: getStringEnv('GITHUB_CLIENT_SECRET'),
  REDIRECT_URI: getStringEnv(
    'GITHUB_REDIRECT_URI',
    'https://hono.pilput.net/auth/oauth/github/callback'
  ),
};

const config = {
  rateLimiter: process.env.RATE_LIMITER === 'true',
  rateLimitConfig,
  database: {
    url: validateDatabaseUrl(),
    max_connections: getNumberEnv('DB_MAX_CONNECTIONS', 10),
    idle_timeout: getNumberEnv('DB_IDLE_TIMEOUT', 30),
    connect_timeout: getNumberEnv('DB_CONNECT_TIMEOUT', 10),
    max_lifetime: getNumberEnv('DB_MAX_LIFETIME', 1800),
  },
  jwt: {
    secret: validateJwtSecret(),
    expiresIn: getStringEnv('JWT_EXPIRES_IN', '1d'),
  },
  github: githubConfig,
  s3: {
    endpoint: getStringEnv('S3_ENDPOINT'),
    region: getStringEnv('S3_REGION'),
    accessKeyId: getStringEnv('S3_ACCESS_KEY_ID'),
    secretAccessKey: getStringEnv('S3_SECRET_ACCESS_KEY'),
    bucketName: getStringEnv('S3_BUCKET_NAME'),
  },
  openrouter: {
    apiKey: getStringEnv('OPENROUTER_API_KEY'),
    baseUrl: getStringEnv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
    defaultModel: getStringEnv('OPENROUTER_DEFAULT_MODEL', 'google/gemma-2-9b-it:free'),
  },
  email: {
    resendApiKey: getStringEnv('RESEND_API_KEY'),
    from: getStringEnv('EMAIL_FROM', 'noreply@pilput.net'),
  },
  frontend: {
    url: getStringEnv('FRONTEND_URL', 'https://pilput.net'),
    resetPasswordUrl: getStringEnv(
      'FRONTEND_RESET_PASSWORD_URL',
      'http://localhost:3000/reset-password'
    ),
    mainDomain: getMainDomain(),
  },
};

export default config;
