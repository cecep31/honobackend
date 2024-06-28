ALTER TABLE "files" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "published" boolean DEFAULT true;