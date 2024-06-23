ALTER TABLE "users" ADD COLUMN "username" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_username" ON "users" ("username");