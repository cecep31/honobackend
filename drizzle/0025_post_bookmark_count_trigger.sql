UPDATE "posts"
SET "bookmark_count" = COALESCE(bookmark_totals.total, 0)
FROM (
  SELECT "post_id", COUNT(*)::bigint AS total
  FROM "post_bookmarks"
  GROUP BY "post_id"
) AS bookmark_totals
WHERE "posts"."id" = bookmark_totals."post_id";--> statement-breakpoint

UPDATE "posts"
SET "bookmark_count" = 0
WHERE "bookmark_count" IS NULL;--> statement-breakpoint

CREATE OR REPLACE FUNCTION update_posts_bookmark_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "posts"
    SET "bookmark_count" = COALESCE("bookmark_count", 0) + 1
    WHERE "id" = NEW."post_id";
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE "posts"
    SET "bookmark_count" = GREATEST(COALESCE("bookmark_count", 0) - 1, 0)
    WHERE "id" = OLD."post_id";
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW."post_id" IS DISTINCT FROM OLD."post_id" THEN
    UPDATE "posts"
    SET "bookmark_count" = GREATEST(COALESCE("bookmark_count", 0) - 1, 0)
    WHERE "id" = OLD."post_id";

    UPDATE "posts"
    SET "bookmark_count" = COALESCE("bookmark_count", 0) + 1
    WHERE "id" = NEW."post_id";
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_update_posts_bookmark_count ON "post_bookmarks";--> statement-breakpoint

CREATE TRIGGER trg_update_posts_bookmark_count
AFTER INSERT OR DELETE OR UPDATE OF "post_id" ON "post_bookmarks"
FOR EACH ROW
EXECUTE FUNCTION update_posts_bookmark_count();
