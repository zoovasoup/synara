import { relations } from "drizzle-orm";
import {
	pgTable,
	text,
	timestamp,
	integer,
	boolean,
	index,
	jsonb,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

type LessonContent = {
	resourceModelVersion: 1;
	summary: string;
	concepts: string[];
	steps: string[];
	exercises: string[];
	resources: {
		sourceId: string;
		title: string;
		provider: string;
		url: string;
		sourceType:
			| "official_documentation"
			| "open_courseware"
			| "verified_tutorial";
		level: "beginner" | "intermediate" | "advanced" | "all";
		description: string;
	}[];
};

export const learningSources = pgTable(
	"learning_sources",
	{
		id: text("id").primaryKey(),
		title: text("title").notNull(),
		provider: text("provider").notNull(),
		url: text("url").notNull(),
		sourceType: text("source_type", {
			enum: [
				"official_documentation",
				"open_courseware",
				"verified_tutorial",
			],
		}).notNull(),
		level: text("level", {
			enum: ["beginner", "intermediate", "advanced", "all"],
		}).notNull(),
		tags: jsonb("tags").$type<string[]>().default([]).notNull(),
		description: text("description").notNull(),
		isVerified: boolean("is_verified").default(false).notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		verifiedAt: timestamp("verified_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [uniqueIndex("learning_source_url_idx").on(table.url)],
);

export const learningRoadmaps = pgTable(
	"learning_roadmaps",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		goalDescription: text("goal_description").notNull(),
		// Logic: Auto-Recalibration state tracking
		currentStatus: text("current_status", {
			enum: ["active", "completed", "recalibrating", "needs_recalibration"],
		}).default("active"),
		// Buat metadata lebih fleksibel dengan Record atau interface yang lebih luas
		metadata: jsonb("metadata").$type<{
			onboarding?: {
				topic: string;
				level: string;
				goal: string;
				weeklyHours: string;
				learningStyle: string;
			};
			originalPrompt?: string;
			aiContext?: string;
			reason?: string;
			lastNode?: string;
			triggerNodeId?: string;
			lastRecalibrationAt?: string;
			lastRecalibrationLogId?: string;
			generationStatus?: "generated" | "draft";
		}>(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("roadmap_userId_idx").on(table.userId)],
);

export const recalibrationLogs = pgTable(
	"recalibration_logs",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		roadmapId: text("roadmap_id")
			.notNull()
			.references(() => learningRoadmaps.id, { onDelete: "cascade" }),
		triggerNodeTitle: text("trigger_node_title").notNull(),
		stagnationScore: integer("stagnation_score").notNull(),
		interventionLevel: text("intervention_level", {
			enum: ["none", "light_support", "remediation", "recalibration"],
		}).notNull(),
		triggerReasons: jsonb("trigger_reasons").$type<string[]>().notNull(),
		previousNodeTitles: jsonb("previous_node_titles")
			.$type<string[]>()
			.notNull(),
		replacementNodeTitles: jsonb("replacement_node_titles")
			.$type<string[]>()
			.notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("recalibration_log_user_idx").on(table.userId),
		index("recalibration_log_roadmap_idx").on(table.roadmapId),
	],
);

export const roadmapNodes = pgTable(
	"roadmap_nodes",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		roadmapId: text("roadmap_id")
			.notNull()
			.references(() => learningRoadmaps.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		orderIndex: integer("order_index").notNull(),
		contentType: text("content_type", {
			enum: ["video", "reading", "hands-on", "socratic"],
		}).notNull(),
		estimatedTime: integer("estimated_time").notNull(),
		successCriteria: jsonb("success_criteria").$type<string[]>().notNull(),
		difficultyLevel: integer("difficulty_level").notNull(),
		lessonContent: jsonb("lesson_content").$type<LessonContent>(),
		isCompleted: boolean("is_completed").default(false).notNull(),
		completedAt: timestamp("completed_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("node_roadmapId_idx").on(table.roadmapId)],
);

export const tutorSessions = pgTable(
	"tutor_sessions",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		nodeId: text("node_id")
			.notNull()
			.references(() => roadmapNodes.id, { onDelete: "cascade" }),
		chatHistory: jsonb("chat_history")
			.$type<{ role: "user" | "assistant"; content: string }[]>()
			.notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [uniqueIndex("tutor_session_user_node_idx").on(table.userId, table.nodeId)],
);

export const learningRoadmapsRelations = relations(
	learningRoadmaps,
	({ one, many }) => ({
		user: one(user, {
			fields: [learningRoadmaps.userId],
			references: [user.id],
		}),
		nodes: many(roadmapNodes),
	}),
);

export const roadmapNodesRelations = relations(roadmapNodes, ({ one }) => ({
	roadmap: one(learningRoadmaps, {
		fields: [roadmapNodes.roadmapId],
		references: [learningRoadmaps.id],
	}),
}));
