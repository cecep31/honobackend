import type { Context } from 'hono';

/**
 * Extract the real client IP address from common proxy/CDN headers.
 *
 * Priority order:
 *  1. CF-Connecting-IP  — set by Cloudflare, not spoofable when behind CF
 *  2. X-Real-IP        — set by nginx / single-proxy setups
 *  3. X-Forwarded-For  — standard proxy chain header (first entry = client)
 */
export function getClientIp(c: Context): string | undefined {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-real-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    undefined
  );
}
