CREATE TABLE "user_tag_follows" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"tag_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "user_tag_follows" ADD CONSTRAINT "fk_user_tag_follows_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tag_follows" ADD CONSTRAINT "fk_user_tag_follows_tag_id" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_tag_follows_user_id" ON "user_tag_follows" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_user_tag_follows_tag_id" ON "user_tag_follows" USING btree ("tag_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_user_tag_follows_deleted_at" ON "user_tag_follows" USING btree ("deleted_at" timestamptz_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_tag_follows_unique" ON "user_tag_follows" USING btree ("user_id" uuid_ops,"tag_id" int4_ops) WHERE (deleted_at IS NULL);