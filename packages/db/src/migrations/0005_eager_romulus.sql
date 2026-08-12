CREATE TABLE "recalibration_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"roadmap_id" text NOT NULL,
	"trigger_node_title" text NOT NULL,
	"stagnation_score" integer NOT NULL,
	"intervention_level" text NOT NULL,
	"trigger_reasons" jsonb NOT NULL,
	"previous_node_titles" jsonb NOT NULL,
	"replacement_node_titles" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recalibration_logs" ADD CONSTRAINT "recalibration_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recalibration_logs" ADD CONSTRAINT "recalibration_logs_roadmap_id_learning_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."learning_roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recalibration_log_user_idx" ON "recalibration_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recalibration_log_roadmap_idx" ON "recalibration_logs" USING btree ("roadmap_id");