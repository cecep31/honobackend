CREATE INDEX "idx_holdings_user_type" ON "holdings" USING btree ("user_id" uuid_ops,"holding_type_id" int2_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_user_read_created_at" ON "notifications" USING btree ("user_id" uuid_ops,"read" bool_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_post_bookmarks_user_created_at" ON "post_bookmarks" USING btree ("user_id" uuid_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_post_comments_post_created_at" ON "post_comments" USING btree ("post_id" uuid_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_post_likes_post_created_at" ON "post_likes" USING btree ("post_id" uuid_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_post_views_post_created_at" ON "post_views" USING btree ("post_id" uuid_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_users_last_logged_at" ON "users" USING btree ("last_logged_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_users_username_lower" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE INDEX "idx_users_email_lower" ON "users" USING btree (lower("email"));