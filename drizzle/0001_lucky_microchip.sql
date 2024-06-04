DROP TABLE "tasks";--> statement-breakpoint
DROP TABLE "taskgorups";--> statement-breakpoint
ALTER TABLE "post_comments" DROP CONSTRAINT "fk_post_comments_creator";
--> statement-breakpoint
ALTER TABLE "post_comments" DROP CONSTRAINT "fk_posts_post_comments";
--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "fk_posts_creator";
--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "fk_posts_user";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
