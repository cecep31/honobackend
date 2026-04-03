ALTER TABLE "holdings" ALTER COLUMN "year" SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::int;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD COLUMN "is_pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD COLUMN "pinned_at" timestamp(6) with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_chat_conversations_user_pinned" ON "chat_conversations" USING btree ("user_id" uuid_ops,"is_pinned" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_conversations_pinned_at" ON "chat_conversations" USING btree ("pinned_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_posts_published_at" ON "posts" USING btree ("published_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_posts_published_visibility" ON "posts" USING btree ("published" bool_ops,"published_at" timestamptz_ops);