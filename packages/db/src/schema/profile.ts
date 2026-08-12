import {
	pgTable,
	text,
	timestamp,
	integer,
	index,
	jsonb,
	real,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { roadmapNodes } from "./learning";

export const userCognitiveProfiles = pgTable("user_cognitive_profiles", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	preferredFormat: text("preferred_format", {
		enum: ["visual", "textual", "auditory"],
	}).default("textual"),
	avgFocusDuration: integer("avg_focus_duration").default(0), // in minutes
	weakTopics: jsonb("weak_topics").$type<string[]>().default([]),
	lastRecalibrationAt: timestamp("last_recalibration_at"),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const learningLogs = pgTable(
	"learning_logs",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		nodeId: text("node_id")
			.notNull()
			.references(() => roadmapNodes.id, { onDelete: "cascade" }),
		timeSpent: integer("time_spent").default(0).notNull(), // cumulative active seconds
		socraticFailureCount: integer("socratic_failure_count")
			.default(0)
			.notNull(),
		timeRatios: jsonb("time_ratios").$type<number[]>().default([]).notNull(),
		backtrackCount: integer("backtrack_count").default(0).notNull(),
		effortScore: integer("effort_score"),
		stagnationScore: integer("stagnation_score").default(0).notNull(),
		interventionLevel: text("intervention_level", {
			enum: ["none", "light_support", "remediation", "recalibration"],
		})
			.default("none")
			.notNull(),
		triggerReasons: jsonb("trigger_reasons")
			.$type<string[]>()
			.default([])
			.notNull(),
		lastAttemptId: text("last_attempt_id"),
		stumbleCount: integer("stumble_count").default(0).notNull(), // legacy telemetry
		sentimentScore: real("sentiment_score"), // legacy telemetry
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("log_userId_idx").on(table.userId),
		index("log_nodeId_idx").on(table.nodeId),
		uniqueIndex("learning_log_user_node_idx").on(table.userId, table.nodeId),
	],
);
