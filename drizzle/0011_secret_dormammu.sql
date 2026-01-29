CREATE TABLE "auth_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid,
	"activity_type" varchar(50) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"status" varchar(20) NOT NULL,
	"error_message" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_activity_logs" ADD CONSTRAINT "auth_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_auth_activity_logs_user_id" ON "auth_activity_logs" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_auth_activity_logs_activity_type" ON "auth_activity_logs" USING btree ("activity_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_auth_activity_logs_status" ON "auth_activity_logs" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_auth_activity_logs_created_at" ON "auth_activity_logs" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_auth_activity_logs_user_created" ON "auth_activity_logs" USING btree ("user_id" uuid_ops,"created_at" timestamptz_ops);