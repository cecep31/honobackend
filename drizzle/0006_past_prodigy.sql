CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text,
	"read" boolean DEFAULT false NOT NULL,
	"data" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "holdings" DROP CONSTRAINT "holdings_user_id_fkey";
--> statement-breakpoint
ALTER TABLE "holdings" DROP CONSTRAINT "holdings_holding_type_id_fkey";
--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "post_bookmarks" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();--> statement-breakpoint
ALTER TABLE "post_likes" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_follows" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_read" ON "notifications" USING btree ("read" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "notifications" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_user_read" ON "notifications" USING btree ("user_id" uuid_ops,"read" bool_ops);--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_holding_type_id_fkey" FOREIGN KEY ("holding_type_id") REFERENCES "public"."holding_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_holdings_user_month_year" ON "holdings" USING btree ("user_id" uuid_ops,"year" int4_ops,"month" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_post_comments_post_parent" ON "post_comments" USING btree ("post_id" uuid_ops,"parent_comment_id" int8_ops);--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "chk_holdings_positive_amounts" CHECK (invested_amount >= 0 AND current_value >= 0);--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "chk_holdings_valid_month" CHECK (month >= 1 AND month <= 12);--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "chk_holdings_valid_year" CHECK (year >= 2000);--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "chk_posts_counts_positive" CHECK (view_count >= 0 AND like_count >= 0);