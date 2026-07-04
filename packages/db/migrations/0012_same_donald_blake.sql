ALTER TABLE "design_assets" ADD COLUMN "mime_type" text DEFAULT 'image/png' NOT NULL;--> statement-breakpoint
ALTER TABLE "design_assets" ADD COLUMN "extension" text DEFAULT 'png' NOT NULL;--> statement-breakpoint
ALTER TABLE "design_assets" ADD COLUMN "visibility" text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "design_assets" ADD COLUMN "checksum" text;