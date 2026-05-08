import { db } from '../database/drizzle';
import { sql } from 'drizzle-orm';
import config from '../config';
import { createClient } from 'redis';
import { S3Client } from 'bun';

interface CheckResult {
  service: string;
  connected: boolean;
  message: string;
  skipped?: boolean;
}

function logResult(result: CheckResult): void {
  const status = result.skipped ? '-' : result.connected ? '\u2713' : '\u2717';
  const label = `[STARTUP] ${result.service}`.padEnd(30);
  console.log(`${label} ${status} ${result.message}`);
}

function buildSkippedResult(service: string, message: string): CheckResult {
  return { service, connected: false, skipped: true, message };
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
  if (!config.cache.url) {
    return {
      service: 'Cache (Valkey/Redis)',
      connected: false,
      skipped: true,
      message: 'skipped: not configured',
    };
  }

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

function checkS3(): CheckResult[] {
  const { endpoint, region, accessKeyId, secretAccessKey } = config.s3;
  const publicBucketName = process.env.S3_PUBLIC_BUCKET_NAME || process.env.S3_BUCKET_NAME || '';
  const privateBucketName = process.env.S3_PRIVATE_BUCKET_NAME || '';
  const sharedMissing = [];

  if (!endpoint) sharedMissing.push('S3_ENDPOINT');
  if (!region) sharedMissing.push('S3_REGION');
  if (!accessKeyId) sharedMissing.push('S3_ACCESS_KEY_ID');
  if (!secretAccessKey) sharedMissing.push('S3_SECRET_ACCESS_KEY');

  if (sharedMissing.length > 0) {
    const message = `skipped: missing shared config (${sharedMissing.join(', ')})`;
    return [
      buildSkippedResult('Storage (S3 Public)', message),
      buildSkippedResult('Storage (S3 Private)', message),
    ];
  }

  let clientError: string | null = null;
  try {
    new S3Client({ endpoint, region, accessKeyId, secretAccessKey });
  } catch (error) {
    clientError = error instanceof Error ? error.message : String(error);
  }

  const results: CheckResult[] = [];

  if (!publicBucketName) {
    results.push(buildSkippedResult('Storage (S3 Public)', 'skipped: bucket not configured'));
  } else if (clientError) {
    results.push({ service: 'Storage (S3 Public)', connected: false, message: clientError });
  } else {
    results.push({
      service: 'Storage (S3 Public)',
      connected: true,
      message: `client created (${publicBucketName})`,
    });
  }

  if (!privateBucketName) {
    results.push(
      buildSkippedResult(
        'Storage (S3 Private)',
        'skipped: private bucket not configured (runtime falls back to public bucket)'
      )
    );
  } else if (clientError) {
    results.push({ service: 'Storage (S3 Private)', connected: false, message: clientError });
  } else {
    results.push({
      service: 'Storage (S3 Private)',
      connected: true,
      message: `client created (${privateBucketName})`,
    });
  }

  return results;
}

async function checkOpenRouter(): Promise<CheckResult | null> {
  if (!config.openrouter.apiKey) {
    return { service: 'AI (OpenRouter)', connected: false, skipped: true, message: 'skipped: not configured' };
  }

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
  if (!config.email.resendApiKey) {
    return { service: 'Email (Resend)', connected: false, skipped: true, message: 'skipped: not configured' };
  }
  return { service: 'Email (Resend)', connected: true, message: 'key configured' };
}

export async function runStartupChecks(): Promise<void> {
  console.log('\n=== Startup Connectivity Checks ===\n');

  const checks: Promise<CheckResult | CheckResult[] | null>[] = [
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

  for (const entry of results) {
    if (!entry) {
      skipped++;
      continue;
    }

    const normalizedResults = Array.isArray(entry) ? entry : [entry];
    for (const result of normalizedResults) {
      logResult(result);
      if (result.skipped) {
        skipped++;
      } else if (result.connected) {
        passed++;
      } else {
        failed++;
      }
    }
  }

  console.log(
    `\n[STARTUP] Summary: ${passed} passed, ${failed} failed, ${skipped} skipped (not configured)\n`
  );
}
