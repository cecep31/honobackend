import { eq, inArray } from "drizzle-orm";
import { db } from "../../database/drizzel";
import { postsToTags, tags as tagsModel } from "../../database/schema/schema";

export class TagRepository {
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

  async getTagsByNameArray(name: string[]) {
    return await db.query.tags.findMany({
      where: inArray(tagsModel.name, name),
    });
  }

  async addTagToPost(post_id: string, tag_id: number) {
    return await db
      .insert(postsToTags)
      .values({ tags_id: tag_id, posts_id: post_id })
      .onConflictDoNothing();
  }
}
