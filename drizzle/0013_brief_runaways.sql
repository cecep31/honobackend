ALTER TABLE "holdings" ADD COLUMN "gain_amount" numeric(18, 2) GENERATED ALWAYS AS (current_value - invested_amount) STORED;--> statement-breakpoint
ALTER TABLE "holdings" ADD COLUMN "gain_percent" numeric(18, 2) GENERATED ALWAYS AS (
        CASE
          WHEN invested_amount = 0 THEN 0
          ELSE ((current_value - invested_amount) / invested_amount) * 100
        END
      ) STORED;