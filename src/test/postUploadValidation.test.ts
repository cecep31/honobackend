import { describe, expect, it } from 'bun:test';
import { presignedUrlSchema } from '../modules/posts/validation';

describe('presignedUrlSchema', () => {
  it('accepts the expected upload payload without access selection', () => {
    const result = presignedUrlSchema.parse({
      contentType: 'image/png',
      filename: 'example.png',
      size: 1024,
    });

    expect(result).toEqual({
      contentType: 'image/png',
      filename: 'example.png',
      size: 1024,
    });
  });

  it('drops user-controlled accessType from the validated payload', () => {
    const result = presignedUrlSchema.parse({
      contentType: 'image/webp',
      filename: 'private.webp',
      size: 1024,
      accessType: 'private',
    });

    expect(result).toEqual({
      contentType: 'image/webp',
      filename: 'private.webp',
      size: 1024,
    });
  });
});
