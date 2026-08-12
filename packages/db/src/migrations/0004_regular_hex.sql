ALTER TABLE "learning_logs" DROP CONSTRAINT "learning_logs_node_id_roadmap_nodes_id_fk";
--> statement-breakpoint
ALTER TABLE "learning_logs" ALTER COLUMN "time_spent" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "learning_logs" ADD COLUMN "socratic_failure_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_logs" ADD COLUMN "time_ratios" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_logs" ADD COLUMN "backtrack_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_logs" ADD COLUMN "effort_score" integer;--> statement-breakpoint
ALTER TABLE "learning_logs" ADD COLUMN "stagnation_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_logs" ADD COLUMN "intervention_level" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_logs" ADD COLUMN "trigger_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_logs" ADD COLUMN "last_attempt_id" text;--> statement-breakpoint
ALTER TABLE "learning_logs" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_logs" ADD CONSTRAINT "learning_logs_node_id_roadmap_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."roadmap_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "learning_log_user_node_idx" ON "learning_logs" USING btree ("user_id","node_id");