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

/**
 * Safely converts a string or undefined to a limited number.
 * Ensures the value is between 1 and 100 (default max).
 */
export const safeLimit = (v: string | undefined, fallback: number = 10, max: number = 100) => {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 1 ? Math.min(max, Math.max(1, Math.floor(n))) : fallback;
};

/**
 * Safely converts a string or undefined to a non-negative integer (offset).
 */
export const safeOffset = (v: string | undefined, fallback: number = 0) => {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

/**
 * Safely converts a string or undefined to a positive integer (page).
 */
export const safePage = (v: string | undefined, fallback: number = 1) => {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
};
