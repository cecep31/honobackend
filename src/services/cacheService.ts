import { createClient, type RedisClientType } from 'redis';
import config from '../config';

type RedisConnection = RedisClientType;

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  disconnect(): Promise<void>;
}

export class RedisCacheService implements CacheService {
  private client: RedisConnection | null = null;
  private connectPromise: Promise<RedisConnection | null> | null = null;

  private isEnabled() {
    return config.cache.url.length > 0;
  }

  private buildKey(key: string) {
    return `${config.cache.keyPrefix}:${key}`;
  }

  private async getClient(): Promise<RedisConnection | null> {
    if (!this.isEnabled()) {
      return null;
    }

    if (this.client?.isOpen) {
      return this.client;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    const client = createClient({
      url: config.cache.url,
      socket: {
        connectTimeout: config.cache.connectTimeoutMs,
      },
    });

    client.on('error', (error: unknown) => {
      console.error('Valkey cache error:', error);
    });

    this.connectPromise = client
      .connect()
      .then(() => {
        this.client = client;
        return client;
      })
      .catch((error: unknown) => {
        console.error('Failed to connect to Valkey cache:', error);
        this.client = null;
        client.destroy();
        return null;
      })
      .finally(() => {
        this.connectPromise = null;
      });

    return this.connectPromise;
  }

  async get<T>(key: string): Promise<T | null> {
    const client = await this.getClient();
    if (!client) {
      return null;
    }

    try {
      const value = await client.get(this.buildKey(key));
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      console.error(`Failed to read cache key "${key}":`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const client = await this.getClient();
    if (!client) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await client.set(this.buildKey(key), serialized, { EX: ttlSeconds });
        return;
      }

      await client.set(this.buildKey(key), serialized);
    } catch (error) {
      console.error(`Failed to write cache key "${key}":`, error);
    }
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient();
    if (!client) {
      return;
    }

    try {
      await client.del(this.buildKey(key));
    } catch (error) {
      console.error(`Failed to delete cache key "${key}":`, error);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      if (this.client.isOpen) {
        await this.client.quit();
      }
    } catch (error) {
      console.error('Failed to disconnect Valkey cache:', error);
      this.client.destroy();
    } finally {
      this.client = null;
    }
  }
}
