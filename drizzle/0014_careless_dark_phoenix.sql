DROP INDEX "idx_bookmark_post_id_user_id";--> statement-breakpoint
DROP INDEX "idx_post_bookmarks_deleted_at";--> statement-breakpoint
ALTER TABLE "post_bookmarks" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "post_bookmarks" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
CREATE UNIQUE INDEX "idx_post_bookmarks_unique_user_post" ON "post_bookmarks" USING btree ("post_id" uuid_ops,"user_id" uuid_ops);--> statement-breakpoint
ALTER TABLE "post_bookmarks" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "post_bookmarks" DROP COLUMN "deleted_at";