ALTER TABLE "posts_to_tags" DROP CONSTRAINT "posts_to_tags_posts_id_posts_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts_to_tags" ADD CONSTRAINT "posts_to_tags_posts_id_posts_id_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
