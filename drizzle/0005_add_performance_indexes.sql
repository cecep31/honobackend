-- Add performance indexes to improve query speed
-- All changes are non-breaking and additive only

-- likes table: Add individual indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_likes_post_id" ON "likes" USING btree ("post_id" uuid_ops);
CREATE INDEX IF NOT EXISTS "idx_likes_user_id" ON "likes" USING btree ("user_id" uuid_ops);

-- Add missing foreign key for likes -> posts
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'likes_post_id_posts_id_fk'
    ) THEN
        ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_posts_id_fk" 
        FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade;
    END IF;
END $$;

-- post_comments table: Add indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_post_comments_post_id" ON "post_comments" USING btree ("post_id" uuid_ops);
CREATE INDEX IF NOT EXISTS "idx_post_comments_created_by" ON "post_comments" USING btree ("created_by" uuid_ops);
CREATE INDEX IF NOT EXISTS "idx_post_comments_deleted_at" ON "post_comments" USING btree ("deleted_at" timestamptz_ops);

-- chat_conversations table: Add indexes for user queries and soft-delete filtering
CREATE INDEX IF NOT EXISTS "idx_chat_conversations_user_id" ON "chat_conversations" USING btree ("user_id" uuid_ops);
CREATE INDEX IF NOT EXISTS "idx_chat_conversations_deleted_at" ON "chat_conversations" USING btree ("deleted_at" timestamptz_ops);

-- Add missing foreign key for chat_conversations -> users
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chat_conversations_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
    END IF;
END $$;

-- chat_messages table: Add indexes for conversation and user queries
CREATE INDEX IF NOT EXISTS "idx_chat_messages_conversation_id" ON "chat_messages" USING btree ("conversation_id" uuid_ops);
CREATE INDEX IF NOT EXISTS "idx_chat_messages_user_id" ON "chat_messages" USING btree ("user_id" uuid_ops);
CREATE INDEX IF NOT EXISTS "idx_chat_messages_created_at" ON "chat_messages" USING btree ("created_at" timestamptz_ops);

-- Add missing foreign key for chat_messages -> users
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chat_messages_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
    END IF;
END $$;

-- posts table: Add optimized indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_posts_created_by" ON "posts" USING btree ("created_by" uuid_ops);
CREATE INDEX IF NOT EXISTS "idx_posts_slug" ON "posts" USING btree ("slug" text_ops);
CREATE INDEX IF NOT EXISTS "idx_posts_published" ON "posts" USING btree ("published" bool_ops);
CREATE INDEX IF NOT EXISTS "idx_posts_created_at" ON "posts" USING btree ("created_at" DESC timestamptz_ops);

-- sessions table: Add indexes for user sessions and expiration cleanup
CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "sessions" USING btree ("user_id" uuid_ops);
CREATE INDEX IF NOT EXISTS "idx_sessions_expires_at" ON "sessions" USING btree ("expires_at" timestamptz_ops);

-- files table: Add indexes for user files and soft-delete filtering
CREATE INDEX IF NOT EXISTS "idx_files_created_by" ON "files" USING btree ("created_by" uuid_ops);
CREATE INDEX IF NOT EXISTS "idx_files_deleted_at" ON "files" USING btree ("deleted_at" timestamptz_ops);

-- users table: Add index for recent users queries
CREATE INDEX IF NOT EXISTS "idx_users_created_at" ON "users" USING btree ("created_at" DESC timestamptz_ops);

-- posts_to_tags table: Add indexes for tag queries
CREATE INDEX IF NOT EXISTS "idx_posts_to_tags_post_id" ON "posts_to_tags" USING btree ("post_id" uuid_ops);
CREATE INDEX IF NOT EXISTS "idx_posts_to_tags_tag_id" ON "posts_to_tags" USING btree ("tag_id" int4_ops);

-- holdings table: Add indexes for type and time-based queries
CREATE INDEX IF NOT EXISTS "idx_holdings_holding_type_id" ON "holdings" USING btree ("holding_type_id" int2_ops);
CREATE INDEX IF NOT EXISTS "idx_holdings_month_year" ON "holdings" USING btree ("year" int4_ops, "month" int4_ops);

-- password_reset_tokens table: Already has good indexes, no changes needed

-- Analyze tables to update query planner statistics
ANALYZE likes;
ANALYZE post_comments;
ANALYZE chat_conversations;
ANALYZE chat_messages;
ANALYZE posts;
ANALYZE sessions;
ANALYZE files;
ANALYZE users;
ANALYZE posts_to_tags;
ANALYZE holdings;
