import { eq } from "drizzle-orm";
import { db } from "../../database/drizzel";
import { postsToTags, tags as tagsModel } from "../../database/schema/schema";

export class tagRepository {
  async getTags() {
    return await db.query.tags.findMany();
  }
  async getTag(name: string) {
    return await db.query.tags.findMany({
      where: eq(tagsModel.name, name),
    });
  }

  async addTag(name: string) {
    return await db
      .insert(tagsModel)
      .values({ name: name })
      .onConflictDoNothing();
  }

  async addTagToPost(post_id: string, tag_id: number) {
    return await db
      .insert(postsToTags)
      .values({ tags_id: tag_id, posts_id: post_id })
      .onConflictDoNothing();
  }
}
