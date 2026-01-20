ALTER TABLE "posts" DROP CONSTRAINT "creator and slug inique";--> statement-breakpoint
ALTER TABLE "files" DROP CONSTRAINT "files_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "post_comments" DROP CONSTRAINT "fk_post_comments_creator";
--> statement-breakpoint
DROP INDEX "idx_post_comments_parent_id";--> statement-breakpoint
DROP INDEX "idx_post_comments_post_parent";--> statement-breakpoint
ALTER TABLE "post_comments" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();--> statement-breakpoint
ALTER TABLE "post_comments" ALTER COLUMN "text" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "post_comments" ALTER COLUMN "post_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "post_comments" ALTER COLUMN "parent_comment_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "post_comments" ALTER COLUMN "created_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "created_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "fk_post_comments_creator" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_post_comments_parent_id" ON "post_comments" USING btree ("parent_comment_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_post_comments_post_parent" ON "post_comments" USING btree ("post_id" uuid_ops,"parent_comment_id" uuid_ops);--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "creator and slug unique" UNIQUE("created_by","slug");