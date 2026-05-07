import { db } from '../database/drizzle';
import { sql } from 'drizzle-orm';
import config from '../config';
import { createClient } from 'redis';
import { S3Client } from 'bun';

interface CheckResult {
  service: string;
  connected: boolean;
  message: string;
}

function logResult(result: CheckResult): void {
  const status = result.connected ? '\u2713' : '\u2717';
  const label = `[STARTUP] ${result.service}`.padEnd(30);
  console.log(`${label} ${status} ${result.message}`);
}

async function checkDatabase(): Promise<CheckResult> {
  try {
    await db.execute(sql`SELECT 1`);
    return { service: 'Database (PostgreSQL)', connected: true, message: 'connected' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { service: 'Database (PostgreSQL)', connected: false, message: msg };
  }
}

async function checkCache(): Promise<CheckResult | null> {
  if (!config.cache.url) return null;

  const client = createClient({
    url: config.cache.url,
    socket: { connectTimeout: config.cache.connectTimeoutMs },
  });

  try {
    await client.connect();
    await client.ping();
    return { service: 'Cache (Valkey/Redis)', connected: true, message: 'connected' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { service: 'Cache (Valkey/Redis)', connected: false, message: msg };
  } finally {
    await client.disconnect().catch(() => {});
  }
}

function checkS3(): CheckResult | null {
  const { endpoint, region, accessKeyId, secretAccessKey, bucketName } = config.s3;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucketName) return null;

  try {
    new S3Client({ endpoint, region, accessKeyId, secretAccessKey });
    return { service: 'Storage (S3)', connected: true, message: 'client created' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { service: 'Storage (S3)', connected: false, message: msg };
  }
}

async function checkOpenRouter(): Promise<CheckResult | null> {
  if (!config.openrouter.apiKey) return null;

  try {
    const response = await fetch(`${config.openrouter.baseUrl.replace(/\/$/, '')}/key`, {
      headers: { Authorization: `Bearer ${config.openrouter.apiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return { service: 'AI (OpenRouter)', connected: true, message: 'key valid' };
    }

    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { service: 'AI (OpenRouter)', connected: false, message: msg };
  }
}

function checkEmail(): CheckResult | null {
  if (!config.email.resendApiKey) return null;
  return { service: 'Email (Resend)', connected: true, message: 'key configured' };
}

export async function runStartupChecks(): Promise<void> {
  console.log('\n=== Startup Connectivity Checks ===\n');

  const checks: Promise<CheckResult | null>[] = [
    checkDatabase(),
    checkCache(),
    Promise.resolve(checkS3()),
    checkOpenRouter(),
    Promise.resolve(checkEmail()),
  ];

  const results = await Promise.all(checks);
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const result of results) {
    if (!result) {
      skipped++;
      continue;
    }
    logResult(result);
    if (result.connected) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(
    `\n[STARTUP] Summary: ${passed} passed, ${failed} failed, ${skipped} skipped (not configured)\n`
  );
}
