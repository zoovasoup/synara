CREATE TABLE "learning_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"provider" text NOT NULL,
	"url" text NOT NULL,
	"source_type" text NOT NULL,
	"level" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "learning_source_url_idx" ON "learning_sources" USING btree ("url");