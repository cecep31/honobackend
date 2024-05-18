CREATE TABLE IF NOT EXISTS "shoes" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"name" text,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "post_comments" DROP CONSTRAINT "fk_post_comments_creator";
--> statement-breakpoint
ALTER TABLE "post_comments" DROP CONSTRAINT "fk_posts_post_comments";
--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "fk_posts_creator";
--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "fk_posts_user";
--> statement-breakpoint
ALTER TABLE "taskgorups" DROP CONSTRAINT "fk_taskgorups_created_by";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "fk_taskgorups_task";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "fk_tasks_created_by";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "fk_tasks_creator";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shoes" ADD CONSTRAINT "shoes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
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
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "taskgorups" ADD CONSTRAINT "taskgorups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_group_id_taskgorups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."taskgorups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
