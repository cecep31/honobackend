import { eq, inArray } from "drizzle-orm";
import { db } from "../../database/drizzle";
import {
  posts_to_tags,
  tags as tagsModel,
} from "../../database/schemas/postgre/schema";

export class PostTagManager {
  static async linkTagsToPost(postId: string, tagNames: string[], tx: any) {
    if (!tagNames || tagNames.length === 0) return;

    const queryRunner = tx || db;

    await queryRunner
      .insert(tagsModel)
      .values(tagNames.map((name) => ({ name })))
      .onConflictDoNothing();

    const tags = await queryRunner.query.tags.findMany({
      where: inArray(tagsModel.name, tagNames),
    });

    if (tags.length > 0) {
      await queryRunner
        .insert(posts_to_tags)
        .values(
          tags.map((tag: any) => ({
            post_id: postId,
            tag_id: tag.id,
          }))
        )
        .onConflictDoNothing();
    }
  }

  static async updatePostTags(postId: string, tagNames: string[], tx: any) {
    const queryRunner = tx || db;

    await queryRunner
      .delete(posts_to_tags)
      .where(eq(posts_to_tags.post_id, postId));

    await this.linkTagsToPost(postId, tagNames, queryRunner);
  }
}
