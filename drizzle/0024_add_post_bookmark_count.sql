ALTER TABLE "posts" DROP CONSTRAINT "chk_posts_counts_positive";--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "bookmark_count" bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "chk_posts_counts_positive" CHECK (view_count >= 0 AND like_count >= 0 AND bookmark_count >= 0);