CREATE TABLE IF NOT EXISTS "posts_to_tags" (
	"posts_id" uuid NOT NULL,
	"tags_id" integer NOT NULL,
	CONSTRAINT "posts_to_tags_posts_id_tags_id_pk" PRIMARY KEY("posts_id","tags_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts_to_tags" ADD CONSTRAINT "posts_to_tags_posts_id_posts_id_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts_to_tags" ADD CONSTRAINT "posts_to_tags_tags_id_tags_id_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tags_name" ON "tags" ("name");