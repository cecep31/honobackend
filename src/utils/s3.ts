import { S3Client } from 'bun';
import getConfig from '../config';

interface S3HelperConfig {
  endpoint?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
  privateBucketName?: string;
}

type ResolvedS3Config = Required<S3HelperConfig>;
type UploadBody = Parameters<S3Client['write']>[1];
type FileStat = Awaited<ReturnType<S3Client['stat']>>;
export type StorageAccessType = 'public' | 'private';

export interface UploadFileOptions {
  accessType?: StorageAccessType;
}

type AccessScopedOptions = UploadFileOptions;

class S3HelperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'S3HelperError';
  }
}

class S3Helper {
  private client: S3Client;
  private config: ResolvedS3Config;
  private endpointBase: string;

  constructor(config?: S3HelperConfig) {
    this.config = S3Helper.mergeConfig(config);
    this.endpointBase = S3Helper.normalizeEndpoint(this.config.endpoint);

    this.client = new S3Client({
      endpoint: this.config.endpoint,
      region: this.config.region,
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
    });
  }

  private static mergeConfig(config?: S3HelperConfig): ResolvedS3Config {
    const globalS3Config = getConfig.s3;
    const merged = {
      endpoint: config?.endpoint ?? globalS3Config.endpoint,
      region: config?.region ?? globalS3Config.region,
      accessKeyId: config?.accessKeyId ?? globalS3Config.accessKeyId,
      secretAccessKey: config?.secretAccessKey ?? globalS3Config.secretAccessKey,
      bucketName: config?.bucketName ?? globalS3Config.bucketName,
      privateBucketName: config?.privateBucketName ?? globalS3Config.privateBucketName,
    };

    const resolved: ResolvedS3Config = {
      endpoint: S3Helper.normalizeEndpoint(merged.endpoint),
      region: (merged.region ?? '').trim(),
      accessKeyId: (merged.accessKeyId ?? '').trim(),
      secretAccessKey: (merged.secretAccessKey ?? '').trim(),
      bucketName: S3Helper.normalizeBucketName(merged.bucketName),
      privateBucketName: S3Helper.normalizeBucketName(merged.privateBucketName),
    };

    const missing = Object.entries(resolved)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new S3HelperError(`S3 configuration is incomplete: missing ${missing.join(', ')}`);
    }

    return resolved;
  }

  private static normalizeEndpoint(endpoint?: string): string {
    return (endpoint ?? '').trim().replace(/\/+$/, '');
  }

  private static normalizeBucketName(bucketName?: string): string {
    return (bucketName ?? '').trim().replace(/^\/+|\/+$/g, '');
  }

  private normalizeKey(key: string): string {
    const normalizedKey = key.trim().replace(/^\/+/, '');
    if (!normalizedKey) {
      throw new S3HelperError('S3 object key is required.');
    }
    return normalizedKey;
  }

  private resolveAccessType(accessType?: StorageAccessType): StorageAccessType {
    return accessType ?? 'public';
  }

  private resolveBucketName(accessType?: StorageAccessType): string {
    const resolvedAccessType = this.resolveAccessType(accessType);
    return resolvedAccessType === 'private' ? this.config.privateBucketName : this.config.bucketName;
  }

  private toFullPath(key: string, accessType?: StorageAccessType): string {
    return `${this.resolveBucketName(accessType)}/${this.normalizeKey(key)}`;
  }

  private handleError(action: string, key: string, error: unknown): never {
    const reason = error instanceof Error ? error.message : String(error);
    throw new S3HelperError(`Failed to ${action} "${key}": ${reason}`);
  }

  /**
   * Upload a file to S3
   * @param key The key/name of the file in S3
   * @param body The file content (Buffer, Blob, string, etc.)
   * @returns The S3 object URL
   */
  async uploadFile(key: string, body: UploadBody, options?: UploadFileOptions): Promise<string> {
    const fullPath = this.toFullPath(key, options?.accessType);
    const accessType = this.resolveAccessType(options?.accessType);

    try {
      // Access-specific storage behavior is centralized here so bucket/policy routing can
      // evolve later without changing upload call sites. Public/private already resolve to
      // different buckets, while the shared client config remains reusable.
      void accessType;
      await this.client.write(fullPath, body);
      return key;
    } catch (error) {
      return this.handleError('upload', key, error);
    }
  }

  /**
   * Download a file from S3
   * @param key The key/name of the file in S3
   * @returns The file content as ArrayBuffer
   */
  async downloadFile(key: string, options?: AccessScopedOptions): Promise<ArrayBuffer> {
    const fullPath = this.toFullPath(key, options?.accessType);

    try {
      const file = await this.client.file(fullPath);
      return await file.arrayBuffer();
    } catch (error) {
      return this.handleError('download', key, error);
    }
  }

  /**
   * Delete a file from S3
   * @param key The key/name of the file in S3
   * @returns True if deletion was successful
   */
  async deleteFile(key: string, options?: AccessScopedOptions): Promise<boolean> {
    const fullPath = this.toFullPath(key, options?.accessType);

    try {
      await this.client.delete(fullPath);
      return true;
    } catch (error) {
      return this.handleError('delete', key, error);
    }
  }

  /**
   * Check if a file exists in S3
   * @param key The key/name of the file in S3
   * @returns True if the file exists
   */
  async fileExists(key: string, options?: AccessScopedOptions): Promise<boolean> {
    const fullPath = this.toFullPath(key, options?.accessType);

    try {
      return await this.client.exists(fullPath);
    } catch (error) {
      return this.handleError('check existence of', key, error);
    }
  }

  /**
   * Get file size in bytes
   * @param key The key/name of the file in S3
   * @returns File size in bytes
   */
  async getFileSize(key: string, options?: AccessScopedOptions): Promise<number> {
    const fullPath = this.toFullPath(key, options?.accessType);

    try {
      return await this.client.size(fullPath);
    } catch (error) {
      return this.handleError('get size for', key, error);
    }
  }

  /**
   * Get file stats
   * @param key The key/name of the file in S3
   * @returns File stats object
   */
  async getFileStats(key: string, options?: AccessScopedOptions): Promise<FileStat> {
    const fullPath = this.toFullPath(key, options?.accessType);

    try {
      return await this.client.stat(fullPath);
    } catch (error) {
      return this.handleError('get stats for', key, error);
    }
  }

  /**
   * Generate a presigned URL for an S3 object
   * @param key The key/name of the file in S3
   * @param expiresIn Expiration time in seconds
   * @returns Presigned URL
   */
  async generatePresignedUrl(
    key: string,
    expiresIn: number = 3600,
    options?: UploadFileOptions
  ): Promise<string> {
    const fullPath = this.toFullPath(key, options?.accessType);
    const safeExpiresIn = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600;
    const accessType = this.resolveAccessType(options?.accessType);

    try {
      void accessType;
      return await this.client.presign(fullPath, { expiresIn: safeExpiresIn });
    } catch (error) {
      return this.handleError('generate presigned URL for', key, error);
    }
  }

  /**
   * Get the public URL for an S3 object
   * @param key The key/name of the file in S3
   * @returns Public URL
   */
  getPublicUrl(key: string, options?: AccessScopedOptions): string {
    const normalizedKey = this.normalizeKey(key);
    return `${this.endpointBase}/${this.resolveBucketName(options?.accessType)}/${normalizedKey}`;
  }

  /**
   * Get the S3 client instance (for advanced usage)
   */
  getClient(): S3Client {
    return this.client;
  }
}

// Singleton instance
let s3Instance: S3Helper | null = null;

/**
 * Get the S3 helper singleton instance
 * @param config Optional configuration (uses global config if not provided)
 * @returns S3Helper instance
 */
export function getS3Helper(config?: S3HelperConfig): S3Helper {
  if (!s3Instance) {
    s3Instance = new S3Helper(config);
  }
  return s3Instance;
}

/**
 * Create a new S3 helper instance
 * @param config Configuration for the S3 client
 * @returns New S3Helper instance
 */
export function createS3Helper(config: S3HelperConfig): S3Helper {
  return new S3Helper(config);
}
