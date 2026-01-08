ALTER TABLE "post_comments" RENAME COLUMN "parrent_comment_id" TO "parent_comment_id";--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "creator and slug inique";--> statement-breakpoint
ALTER TABLE "files" DROP CONSTRAINT "files_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "holdings" DROP CONSTRAINT "holdings_user_id_fkey";
--> statement-breakpoint
ALTER TABLE "post_comments" DROP CONSTRAINT "fk_post_comments_creator";
--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "fk_posts_creator";
--> statement-breakpoint
DROP INDEX "idx_holdings_user";--> statement-breakpoint
DROP INDEX "idx_like_post_id_created_by";--> statement-breakpoint
DROP INDEX "posts_created_by_idx";--> statement-breakpoint
DROP INDEX "posts_deleted_at_idx";--> statement-breakpoint
DROP INDEX "users_deleted_at_idx";--> statement-breakpoint
DROP INDEX "idx_tags_name";--> statement-breakpoint
DROP INDEX "idx_users_email";--> statement-breakpoint
DROP INDEX "idx_users_username";--> statement-breakpoint
ALTER TABLE "chat_conversations" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();--> statement-breakpoint
ALTER TABLE "chat_conversations" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "prompt_tokens" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "completion_tokens" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "total_tokens" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "path" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "size" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "created_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "likes" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "likes" ALTER COLUMN "post_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "likes" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "post_comments" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();--> statement-breakpoint
ALTER TABLE "post_comments" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "post_comments" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "post_comments" ALTER COLUMN "text" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "post_comments" ALTER COLUMN "post_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "post_comments" ALTER COLUMN "created_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "created_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "body" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "published" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "published" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "view_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "like_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "expires_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "first_name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "is_super_admin" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "followers_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "following_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "holdings" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts_to_tags" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "fk_post_comments_creator" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "fk_posts_creator" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chat_conversations_user_id" ON "chat_conversations" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_conversations_deleted_at" ON "chat_conversations" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_messages_conversation_id" ON "chat_messages" USING btree ("conversation_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_messages_user_id" ON "chat_messages" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_messages_created_at" ON "chat_messages" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_files_created_by" ON "files" USING btree ("created_by" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_files_deleted_at" ON "files" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_holdings_user_id" ON "holdings" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_holdings_holding_type_id" ON "holdings" USING btree ("holding_type_id" int2_ops);--> statement-breakpoint
CREATE INDEX "idx_holdings_deleted_at" ON "holdings" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_holdings_month_year" ON "holdings" USING btree ("year" int4_ops,"month" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_likes_post_id" ON "likes" USING btree ("post_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_likes_user_id" ON "likes" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_like_post_id_user_id" ON "likes" USING btree ("post_id" uuid_ops,"user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_post_comments_post_id" ON "post_comments" USING btree ("post_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_post_comments_created_by" ON "post_comments" USING btree ("created_by" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_post_comments_parent_id" ON "post_comments" USING btree ("parent_comment_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_post_comments_deleted_at" ON "post_comments" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_posts_created_by" ON "posts" USING btree ("created_by" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_posts_slug" ON "posts" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "idx_posts_published" ON "posts" USING btree ("published" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_posts_deleted_at" ON "posts" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_posts_created_at" ON "posts" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_posts_to_tags_post_id" ON "posts_to_tags" USING btree ("post_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_posts_to_tags_tag_id" ON "posts_to_tags" USING btree ("tag_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_sessions_expires_at" ON "sessions" USING btree ("expires_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_tags_deleted_at" ON "tags" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_users_deleted_at" ON "users" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_users_created_at" ON "users" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tags_name" ON "tags" USING btree ("name" text_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree ("email" text_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_username" ON "users" USING btree ("username" text_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_creator_slug_unique" UNIQUE("created_by","slug");