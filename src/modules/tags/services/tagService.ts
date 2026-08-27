import { randomUUIDv7 } from 'bun';
import { and, desc, eq, inArray, isNull, asc, sql } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import {
  posts_to_tags,
  tags as tagsModel,
  user_tag_follows,
} from '../../../database/schemas/postgres/schema';
import type { CacheService } from '../../../services/cacheService';
import { Errors } from '../../../utils/error';

export const TRENDING_TAGS_CACHE_TTL_SECONDS = 30 * 60; // 30 minutes

export interface TrendingTagResponse {
  id: number;
  name: string;
  total_views: number;
  total_likes: number;
  trending_score: number;
}

export class TagService {
  constructor(private cacheService?: CacheService) {}

  async getTags() {
    return await db.query.tags.findMany({
      columns: {
        id: true,
        name: true,
      },
    });
  }

  async getTagsForSitemap(limit = 1000) {
    return await db.query.tags.findMany({
      orderBy: [asc(tagsModel.created_at)],
      limit,
    });
  }

  async getTrendingTags(limit = 5): Promise<TrendingTagResponse[]> {
    const cacheKey = 'tags:trending';
    const cached = await this.cacheService?.get<TrendingTagResponse[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }

    const queryResult = await db.execute(sql`
      SELECT
        tags.id,
        tags.name,
        COALESCE(SUM(posts.view_count), 0)::bigint AS total_views,
        COALESCE(SUM(posts.like_count), 0)::bigint AS total_likes,
        COALESCE(SUM(posts.like_count * 2 + posts.bookmark_count * 2 + posts.view_count), 0)::bigint AS trending_score
      FROM tags
      INNER JOIN posts_to_tags ON posts_to_tags.tag_id = tags.id
      INNER JOIN posts ON posts.id = posts_to_tags.post_id
      INNER JOIN users ON users.id = posts.created_by AND users.deleted_at IS NULL
      WHERE posts.published = true AND posts.deleted_at IS NULL
      GROUP BY tags.id, tags.name
      ORDER BY trending_score DESC, COUNT(posts_to_tags.post_id) DESC, tags.name ASC
      LIMIT ${limit}
    `);

    const rawRows = (queryResult as unknown as Array<{
      id: number;
      name: string;
      total_views: string | number;
      total_likes: string | number;
      trending_score: string | number;
    }>) || [];

    const trendingTags: TrendingTagResponse[] = rawRows.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      total_views: Number(r.total_views || 0),
      total_likes: Number(r.total_likes || 0),
      trending_score: Number(r.trending_score || 0),
    }));

    await this.cacheService?.set(cacheKey, trendingTags, TRENDING_TAGS_CACHE_TTL_SECONDS);

    return trendingTags;
  }

  async getTag(name: string) {
    return await db.query.tags.findFirst({
      where: eq(tagsModel.name, name),
    });
  }

  async getTagById(id: number) {
    const tag = await db.query.tags.findFirst({
      where: eq(tagsModel.id, id),
      columns: {
        id: true,
        name: true,
      },
    });
    if (!tag) {
      throw Errors.NotFound('Tag');
    }
    return tag;
  }

  async createTag(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw Errors.InvalidInput('name', 'Tag name cannot be empty');
    }

    const existing = await this.getTag(trimmedName);
    if (existing) {
      return { id: existing.id, name: existing.name };
    }

    const [created] = await db
      .insert(tagsModel)
      .values({ name: trimmedName })
      .returning({ id: tagsModel.id, name: tagsModel.name });

    return created;
  }

  async updateTag(id: number, name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw Errors.InvalidInput('name', 'Tag name cannot be empty');
    }

    await this.getTagById(id);

    const [updated] = await db
      .update(tagsModel)
      .set({
        name: trimmedName,
      })
      .where(eq(tagsModel.id, id))
      .returning({ id: tagsModel.id, name: tagsModel.name });

    return updated;
  }

  async deleteTag(id: number) {
    await this.getTagById(id);
    await db.delete(tagsModel).where(eq(tagsModel.id, id));
    return null;
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
