-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid DEFAULT uuid_generate_v4() NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"first_name" text DEFAULT 'pilput',
	"last_name" text DEFAULT 'admin',
	"email" text NOT NULL,
	"password" text,
	"image" text,
	"issuperadmin" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_comments" (
	"id" uuid DEFAULT uuid_generate_v4() NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"text" text,
	"post_id" uuid,
	"parrent_comment_id" bigint,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts" (
	"id" uuid DEFAULT uuid_generate_v4() NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"title" text,
	"created_by" uuid,
	"body" text,
	"slug" text,
	"createbyid" varchar(50),
	"photo_url" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "taskgorups" (
	"id" uuid DEFAULT uuid_generate_v4() NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"name" text,
	"created_by" uuid,
	"order" bigint
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" uuid DEFAULT uuid_generate_v4() NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"title" text,
	"desc" text,
	"group_id" uuid,
	"created_by" uuid,
	"order" bigint,
	"body" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");
*/