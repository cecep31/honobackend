CREATE TABLE "corporate_actions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"name" text,
	"type" text NOT NULL,
	"event_date" date NOT NULL,
	"pay_date" date,
	"amount" numeric(18, 4),
	"currency" text,
	"note" text,
	"market" text DEFAULT 'IDX' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_corporate_actions_symbol_type_date" ON "corporate_actions" USING btree ("symbol" text_ops,"type" text_ops,"event_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_corporate_actions_event_date" ON "corporate_actions" USING btree ("event_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_corporate_actions_symbol" ON "corporate_actions" USING btree ("symbol" text_ops);