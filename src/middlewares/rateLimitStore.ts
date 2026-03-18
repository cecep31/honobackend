import type { ClientRateLimitInfo, Store } from 'hono-rate-limiter';

// Memory-safe rate limit store with automatic cleanup
export class CleanupStore implements Store {
  private clients = new Map<string, { totalHits: number; resetTime: Date }>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private windowMs: number) {
    // Run cleanup every window period to prevent memory growth
    this.cleanupInterval = setInterval(() => this.cleanup(), windowMs);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.clients) {
      if (value.resetTime.getTime() <= now) {
        this.clients.delete(key);
      }
    }
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const client = this.clients.get(key);
    if (!client) return undefined;

    if (client.resetTime.getTime() <= Date.now()) {
      this.clients.delete(key);
      return undefined;
    }

    return { totalHits: client.totalHits, resetTime: client.resetTime };
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = Date.now();
    const client = this.clients.get(key);

    if (client && client.resetTime.getTime() > now) {
      client.totalHits++;
      return { totalHits: client.totalHits, resetTime: client.resetTime };
    }

    const resetTime = new Date(now + this.windowMs);
    this.clients.set(key, { totalHits: 1, resetTime });
    return { totalHits: 1, resetTime };
  }

  async decrement(key: string): Promise<void> {
    const client = this.clients.get(key);
    if (client && client.totalHits > 0) {
      client.totalHits--;
    }
  }

  async resetKey(key: string): Promise<void> {
    this.clients.delete(key);
  }

  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clients.clear();
  }
}
