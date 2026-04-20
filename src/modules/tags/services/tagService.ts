import { randomUUIDv7 } from 'bun';
import { and, desc, eq, inArray, isNull, asc } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import {
  posts_to_tags,
  tags as tagsModel,
  user_tag_follows,
} from '../../../database/schemas/postgres/schema';
import { Errors } from '../../../utils/error';

export class TagService {
  async getTags() {
    return await db.query.tags.findMany();
  }

  async getTagsForSitemap(limit = 1000) {
    return await db.query.tags.findMany({
      orderBy: [asc(tagsModel.created_at)],
      limit,
    });
  }

  async getTag(name: string) {
    return await db.query.tags.findFirst({
      where: eq(tagsModel.name, name),
    });
  }

  async getTagById(id: number) {
    return await db.query.tags.findFirst({
      where: eq(tagsModel.id, id),
    });
  }

  async addTag(name: string) {
    return await db.insert(tagsModel).values({ name: name }).onConflictDoNothing();
  }

  async addTagsBatch(names: string[]) {
    if (names.length === 0) return [];
    return await db
      .insert(tagsModel)
      .values(names.map((name) => ({ name })))
      .onConflictDoNothing()
      .returning();
  }

  async getTagsByNameArray(name: string[]) {
    if (name.length === 0) return [];
    return await db.query.tags.findMany({
      where: inArray(tagsModel.name, name),
    });
  }

  async addTagToPost(post_id: string, tag_id: number) {
    return await db
      .insert(posts_to_tags)
      .values({ tag_id: tag_id, post_id: post_id })
      .onConflictDoNothing();
  }

  async addTagsToPostBatch(post_id: string, tag_ids: number[]) {
    if (tag_ids.length === 0) return [];
    return await db
      .insert(posts_to_tags)
      .values(tag_ids.map((tag_id) => ({ post_id, tag_id })))
      .onConflictDoNothing();
  }

  async followTag(userId: string, tagId: number) {
    const tag = await this.getTagById(tagId);
    if (!tag) {
      throw Errors.NotFound('Tag');
    }

    const existing = await db.query.user_tag_follows.findFirst({
      where: and(
        eq(user_tag_follows.user_id, userId),
        eq(user_tag_follows.tag_id, tagId),
        isNull(user_tag_follows.deleted_at)
      ),
      columns: { id: true },
    });

    if (existing) {
      throw Errors.BusinessRuleViolation('Already following this tag');
    }

    const [row] = await db
      .insert(user_tag_follows)
      .values({
        id: randomUUIDv7(),
        user_id: userId,
        tag_id: tagId,
      })
      .returning();

    return row;
  }

  async unfollowTag(userId: string, tagId: number) {
    const existing = await db.query.user_tag_follows.findFirst({
      where: and(
        eq(user_tag_follows.user_id, userId),
        eq(user_tag_follows.tag_id, tagId),
        isNull(user_tag_follows.deleted_at)
      ),
    });

    if (!existing) {
      throw Errors.NotFound('Tag follow');
    }

    const [updated] = await db
      .update(user_tag_follows)
      .set({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(eq(user_tag_follows.id, existing.id))
      .returning();

    return updated;
  }

  async getFollowedTags(userId: string) {
    const rows = await db.query.user_tag_follows.findMany({
      where: and(eq(user_tag_follows.user_id, userId), isNull(user_tag_follows.deleted_at)),
      with: {
        tag: true,
      },
      orderBy: [desc(user_tag_follows.created_at)],
    });

    return rows.map((r) => r.tag);
  }

  async isFollowingTag(userId: string, tagId: number) {
    const row = await db.query.user_tag_follows.findFirst({
      where: and(
        eq(user_tag_follows.user_id, userId),
        eq(user_tag_follows.tag_id, tagId),
        isNull(user_tag_follows.deleted_at)
      ),
      columns: { id: true },
    });
    return Boolean(row);
  }
}
