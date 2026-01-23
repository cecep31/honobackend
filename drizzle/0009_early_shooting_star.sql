ALTER TABLE "likes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "likes" CASCADE;--> statement-breakpoint
DROP INDEX "idx_post_likes_deleted_at";--> statement-breakpoint
DROP INDEX "idx_post_likes_unique_user_post";--> statement-breakpoint
CREATE UNIQUE INDEX "idx_post_likes_unique_user_post" ON "post_likes" USING btree ("post_id" uuid_ops,"user_id" uuid_ops);--> statement-breakpoint
ALTER TABLE "post_likes" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "post_likes" DROP COLUMN "deleted_at";