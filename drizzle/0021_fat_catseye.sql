CREATE TABLE "bookmark_folders" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "post_bookmarks" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
ALTER TABLE "post_bookmarks" ADD COLUMN "name" varchar(255);--> statement-breakpoint
ALTER TABLE "post_bookmarks" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "post_bookmarks" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "bookmark_folders" ADD CONSTRAINT "fk_bookmark_folders_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bookmark_folders_user_id" ON "bookmark_folders" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_bookmark_folders_created_at" ON "bookmark_folders" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bookmark_folders_user_name" ON "bookmark_folders" USING btree ("user_id" uuid_ops,"name" text_ops);--> statement-breakpoint
ALTER TABLE "post_bookmarks" ADD CONSTRAINT "fk_post_bookmarks_folder_id" FOREIGN KEY ("folder_id") REFERENCES "public"."bookmark_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_post_bookmarks_folder_id" ON "post_bookmarks" USING btree ("folder_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_post_bookmarks_folder_created_at" ON "post_bookmarks" USING btree ("folder_id" uuid_ops,"created_at" timestamptz_ops);