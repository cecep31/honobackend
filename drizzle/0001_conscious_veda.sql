CREATE TABLE "chat_conversations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL,
	"deleted_at" timestamp(6) with time zone,
	"title" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"model" varchar(100),
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer
);
--> statement-breakpoint
CREATE TABLE "holding_types" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	CONSTRAINT "holding_types_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "holdings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"platform" text NOT NULL,
	"holding_type_id" smallint NOT NULL,
	"currency" char(3) NOT NULL,
	"invested_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"current_value" numeric(18, 2) DEFAULT '0' NOT NULL,
	"units" numeric(24, 10),
	"avg_buy_price" numeric(18, 8),
	"current_price" numeric(18, 8),
	"last_updated" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"month" integer DEFAULT 1 NOT NULL,
	"year" integer DEFAULT 2025 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "post_bookmarks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
	"deleted_at" timestamp(6) with time zone
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "post_views" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"id" uuid PRIMARY KEY NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_user_follows_no_self_follow" CHECK (follower_id <> following_id)
);
--> statement-breakpoint
ALTER TABLE "likes" RENAME COLUMN "created_by" TO "user_id";--> statement-breakpoint
ALTER TABLE "posts_to_tags" RENAME COLUMN "posts_id" TO "post_id";--> statement-breakpoint
ALTER TABLE "posts_to_tags" RENAME COLUMN "tags_id" TO "tag_id";--> statement-breakpoint
ALTER TABLE "sessions" RENAME COLUMN "token" TO "refresh_token";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "issuperadmin" TO "is_super_admin";--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "idx_posts_slug";--> statement-breakpoint
ALTER TABLE "likes" DROP CONSTRAINT "likes_post_id_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "likes" DROP CONSTRAINT "likes_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "post_comments" DROP CONSTRAINT "post_comments_post_id_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "post_comments" DROP CONSTRAINT "post_comments_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "posts_to_tags" DROP CONSTRAINT "posts_to_tags_posts_id_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "posts_to_tags" DROP CONSTRAINT "posts_to_tags_tags_id_tags_id_fk";
--> statement-breakpoint
DROP INDEX "idx_like_post_id_created_by";--> statement-breakpoint
DROP INDEX "idx_profiles_user_id";--> statement-breakpoint
DROP INDEX "idx_tags_name";--> statement-breakpoint
DROP INDEX "idx_users_email";--> statement-breakpoint
DROP INDEX "idx_users_username";--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "post_comments" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "view_count" bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "like_count" bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "followers_count" bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "following_count" bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_holding_type_id_fkey" FOREIGN KEY ("holding_type_id") REFERENCES "public"."holding_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_bookmarks" ADD CONSTRAINT "fk_post_bookmarks_post_id" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_bookmarks" ADD CONSTRAINT "fk_post_bookmarks_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "fk_post_likes_post_id" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "fk_post_likes_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "fk_post_views_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_posts_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "fk_user_follows_follower_id" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "fk_user_follows_following_id" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_holdings_user" ON "holdings" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_holdings_user_platform_name_currency" ON "holdings" USING btree ("user_id" bpchar_ops,"platform" bpchar_ops,"name" bpchar_ops,"currency" bpchar_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_password_reset_tokens_token" ON "password_reset_tokens" USING btree ("token" text_ops);--> statement-breakpoint
CREATE INDEX "idx_password_reset_tokens_user_id" ON "password_reset_tokens" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bookmark_post_id_user_id" ON "post_bookmarks" USING btree ("post_id" uuid_ops,"user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_post_bookmarks_created_at" ON "post_bookmarks" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_post_bookmarks_deleted_at" ON "post_bookmarks" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_post_bookmarks_post_id" ON "post_bookmarks" USING btree ("post_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_post_bookmarks_user_id" ON "post_bookmarks" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_post_likes_created_at" ON "post_likes" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_post_likes_deleted_at" ON "post_likes" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_post_likes_post_id" ON "post_likes" USING btree ("post_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_post_likes_unique_user_post" ON "post_likes" USING btree ("post_id" uuid_ops,"user_id" uuid_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "idx_post_likes_user_id" ON "post_likes" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_post_views_created_at" ON "post_views" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_post_views_deleted_at" ON "post_views" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_post_views_post_id" ON "post_views" USING btree ("post_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_post_views_unique_user_post" ON "post_views" USING btree ("post_id" uuid_ops,"user_id" uuid_ops) WHERE ((user_id IS NOT NULL) AND (deleted_at IS NULL));--> statement-breakpoint
CREATE INDEX "idx_post_views_user_id" ON "post_views" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_user_follows_created_at" ON "user_follows" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_user_follows_deleted_at" ON "user_follows" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_user_follows_follower_id" ON "user_follows" USING btree ("follower_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_user_follows_following_id" ON "user_follows" USING btree ("following_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_follows_unique" ON "user_follows" USING btree ("follower_id" uuid_ops,"following_id" uuid_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "fk_post_comments_creator" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "fk_posts_post_comments" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "fk_posts_creator" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "posts_to_tags" ADD CONSTRAINT "ptt_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts_to_tags" ADD CONSTRAINT "ptt_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_created_by_idx" ON "posts" USING btree ("created_by" bool_ops,"slug" bool_ops,"published" uuid_ops,"deleted_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "posts_deleted_at_idx" ON "posts" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "users_deleted_at_idx" ON "users" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_like_post_id_created_by" ON "likes" USING btree ("post_id" uuid_ops,"user_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_profiles_user_id" ON "profiles" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tags_name" ON "tags" USING btree ("name" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_username" ON "users" USING btree ("username" text_ops);--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "createbyid";--> statement-breakpoint
ALTER TABLE "posts_to_tags" DROP CONSTRAINT "posts_to_tags_posts_id_tags_id_pk";
--> statement-breakpoint
ALTER TABLE "posts_to_tags" ADD CONSTRAINT "posts_to_tags_posts_id_tags_id_pk" PRIMARY KEY("post_id","tag_id");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "creator and slug inique" UNIQUE("created_by","slug");