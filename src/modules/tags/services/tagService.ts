import { eq, inArray } from "drizzle-orm";
import { db } from "../../../database/drizzle";
import {
  posts_to_tags,
  tags as tagsModel,
} from "../../../database/schemas/postgre/schema";

export class TagService {
  async getTags() {
    return await db.query.tags.findMany();
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
    return await db
      .insert(tagsModel)
      .values({ name: name })
      .onConflictDoNothing();
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
}
