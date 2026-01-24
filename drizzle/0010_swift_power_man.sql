ALTER TABLE "posts" DROP CONSTRAINT "fk_posts_creator";
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "fk_posts_creator" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;