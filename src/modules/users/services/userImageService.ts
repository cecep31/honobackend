import { randomUUIDv7 } from 'bun';
import { db } from '../../../database/drizzle';
import { and, eq, isNull } from 'drizzle-orm';
import { users as usersModel } from '../../../database/schemas/postgres/schema';
import { getS3Helper } from '../../../utils/s3';
import { MAX_PROFILE_IMAGE_BYTES } from '../validation/body';
import { ApiError, Errors } from '../../../utils/error';

const OAUTH_AVATAR_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const OAUTH_AVATAR_FETCH_TIMEOUT_MS = 15_000;

function normalizeAvatarContentType(header: string | null): string {
  if (!header) return '';
  return header.split(';')[0].trim().toLowerCase();
}

/** Stream read with hard cap; rejects oversize Content-Length and truncated bodies over maxBytes. */
async function readResponseBodyWithLimit(
  res: Response,
  maxBytes: number
): Promise<ArrayBuffer | null> {
  const cl = res.headers.get('content-length');
  if (cl) {
    const n = parseInt(cl, 10);
    if (!Number.isFinite(n) || n > maxBytes) return null;
  }
  if (!res.body) return null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) return null;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  return merged.buffer;
}

export class UserImageService {
  async updateUserImage(userId: string, imageFile: File) {
    try {
      if (imageFile.size > MAX_PROFILE_IMAGE_BYTES) {
        throw Errors.ValidationFailed([
          { field: 'image', message: 'Max file size is 1MB.' },
        ]);
      }

      const s3 = getS3Helper();
      const user = await db.query.users.findFirst({
        columns: { id: true, image: true },
        where: and(eq(usersModel.id, userId), isNull(usersModel.deleted_at)),
      });

      if (!user) {
        throw Errors.NotFound('User not found');
      }

      // If user has an old image, delete it from S3
      if (user.image) {
        try {
          const oldKey = user.image.substring(user.image.lastIndexOf('/') + 1);
          await s3.deleteFile(`avatars/${oldKey}`);
        } catch (error) {
          console.warn('Old image deletion failed, continuing with upload:', error);
        }
      }

      const imageId = randomUUIDv7();
      const imageKey = `avatars/${userId}/${imageId}.${imageFile.type.split('/')[1]}`;

      await s3.uploadFile(imageKey, imageFile);

      const [updatedUser] = await db
        .update(usersModel)
        .set({ image: imageKey, updated_at: new Date().toISOString() })
        .where(eq(usersModel.id, userId))
        .returning({
          id: usersModel.id,
          image: usersModel.image,
        });

      return updatedUser;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Error updating user image:', error);
      throw Errors.DatabaseError({
        message: 'Failed to update user image',
        error,
      });
    }
  }

  /**
   * Download an OAuth profile image (e.g. GitHub `avatar_url`) into S3 and point `users.image` at the object key.
   * Only updates the row if `image` still equals `avatarUrl` (avoids overwriting a newer manual upload).
   * On failure, logs and leaves the remote URL in the database.
   */
  async mirrorOAuthAvatarToStorage(userId: string, avatarUrl: string): Promise<void> {
    try {
      if (!avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
        return;
      }

      const res = await fetch(avatarUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(OAUTH_AVATAR_FETCH_TIMEOUT_MS),
      });

      if (!res.ok) {
        console.warn('OAuth avatar mirror: HTTP', res.status, avatarUrl);
        return;
      }

      const buffer = await readResponseBodyWithLimit(res, MAX_PROFILE_IMAGE_BYTES);
      if (!buffer || buffer.byteLength === 0) {
        console.warn('OAuth avatar mirror: empty or too large body', avatarUrl);
        return;
      }

      const mime = normalizeAvatarContentType(res.headers.get('content-type'));
      const ext = OAUTH_AVATAR_MIME_TO_EXT[mime];
      if (!ext) {
        console.warn('OAuth avatar mirror: unsupported content-type', mime);
        return;
      }

      const s3 = getS3Helper();
      const imageKey = `avatars/${userId}/${randomUUIDv7()}.${ext}`;
      await s3.uploadFile(imageKey, Buffer.from(buffer));

      const [replaced] = await db
        .update(usersModel)
        .set({ image: imageKey, updated_at: new Date().toISOString() })
        .where(and(eq(usersModel.id, userId), eq(usersModel.image, avatarUrl)))
        .returning({ id: usersModel.id });

      if (!replaced) {
        try {
          await s3.deleteFile(imageKey);
        } catch {
          /* ignore orphan cleanup failure */
        }
      }
    } catch (error) {
      console.warn('OAuth avatar mirror failed:', error);
    }
  }
}
