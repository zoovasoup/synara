import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { learningRoadmaps, roadmapNodes, tutorSessions } from "@gemastik/db/schema/learning";
import { socraticSessions } from "@gemastik/db/schema/validation";
import { nanoid } from "nanoid";

import { aiService } from "../services/ai.service";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { roadmapService } from "../services/roadmap.service";
import { deriveNodeProgression } from "../domain/node-progression";
import { getAccessibleRoadmapNode } from "../services/node-access.service";

const contentTypeSchema = z.enum(["video", "reading", "hands-on", "socratic"]);

const onboardingAnswersSchema = z.object({
  topic: z.string().trim().min(3),
  level: z.string().trim().min(2),
  goal: z.string().trim().min(2),
  weeklyHours: z.string().trim().min(2),
  learningStyle: z.string().trim().min(2),
});

const generatedNodeSchema = z.object({
  title: z.string().trim().min(1),
  difficulty_level: z.coerce.number().int().min(1).max(10),
  estimated_time: z.coerce.number().int().positive(),
  content_type: z.enum(["video", "reading", "hands-on", "socratic", "text", "doc", "hands_on"]),
  success_criteria: z.array(z.string().trim().min(1)).min(1),
});

const lessonContentResourceSchema = z.object({
	title: z.string().trim().min(1),
	description: z.string().trim().min(1),
	type: z.enum(["reading", "video", "hands-on", "socratic"]),
});

const lessonContentSchema = z.object({
	summary: z.string().trim().min(1),
	concepts: z.array(z.string().trim().min(1)).min(2),
	steps: z.array(z.string().trim().min(1)).min(2),
	exercises: z.array(z.string().trim().min(1)).min(1),
	resources: z.array(lessonContentResourceSchema).min(1),
});

type OnboardingAnswers = z.infer<typeof onboardingAnswersSchema>;
type GeneratedNode = z.infer<typeof generatedNodeSchema>;
type RoadmapGenerationStatus = "generated" | "draft";
type LessonContent = z.infer<typeof lessonContentSchema>;

function buildGoalDescription(input: OnboardingAnswers) {
  return [
    `Learn ${input.topic}.`,
    `Current level: ${input.level}.`,
    `Primary goal: ${input.goal}.`,
    `Weekly commitment: ${input.weeklyHours}.`,
    `Preferred learning style: ${input.learningStyle}.`,
  ].join(" ");
}

function normalizeContentType(value: GeneratedNode["content_type"]): z.infer<typeof contentTypeSchema> {
  if (value === "text" || value === "doc") {
    return "reading";
  }

  if (value === "hands_on") {
    return "hands-on";
  }

  return contentTypeSchema.parse(value);
}

function formatNodesForInsert(nodes: GeneratedNode[], userId: string, roadmapId: string, startIndex = 0) {
  return nodes.map((node, index) => ({
    id: nanoid(),
    userId,
    roadmapId,
    title: node.title,
    difficultyLevel: node.difficulty_level,
    estimatedTime: node.estimated_time,
    contentType: normalizeContentType(node.content_type),
    successCriteria: node.success_criteria,
    orderIndex: startIndex + index,
  }));
}

function buildTutorInstruction({
	goalDescription,
	node,
	lessonContent,
}: {
	goalDescription: string;
	node: {
		title: string;
		contentType: string;
		difficultyLevel: number;
		estimatedTime: number;
		successCriteria: string[];
	};
	lessonContent?: LessonContent | null;
}) {
	return [
		"You are a patient learning tutor inside a personalized roadmap app.",
		"The overall learning goal is: " + goalDescription,
		"The active roadmap node is: " + node.title,
		"Node type: " + node.contentType + ". Difficulty: " + node.difficultyLevel + "/10. Estimated time: " + node.estimatedTime + " minutes.",
		"Success criteria: " + node.successCriteria.join("; ") + ".",
		lessonContent ? "Lesson summary: " + lessonContent.summary : "",
		lessonContent ? "Key concepts: " + lessonContent.concepts.join("; ") + "." : "",
		"Help the learner understand the topic, unblock confusion, and propose next steps.",
		"Do not grade them, do not mention competency scores, and do not imply progress was automatically updated.",
		"Keep responses practical, conversational, and grounded in the node context.",
	].filter(Boolean).join(" ");
}

function buildLessonContentPrompt({
	goalDescription,
	node,
}: {
	goalDescription: string;
	node: {
		title: string;
		contentType: string;
		difficultyLevel: number;
		estimatedTime: number;
		successCriteria: string[];
	};
}) {
	return [
		`Goal: ${goalDescription}`,
		`Node title: ${node.title}`,
		`Content type: ${node.contentType}`,
		`Difficulty: ${node.difficultyLevel}/10`,
		`Estimated time: ${node.estimatedTime} minutes`,
		`Success criteria: ${node.successCriteria.join("; ")}`,
	].join("\n");
}

async function generateLessonContent({
	goalDescription,
	node,
}: {
	goalDescription: string;
	node: {
		title: string;
		contentType: string;
		difficultyLevel: number;
		estimatedTime: number;
		successCriteria: string[];
	};
}) {
	const systemInstruction = [
		"You are a senior learning designer creating a compact but actionable lesson for one roadmap node.",
		"Respond ONLY with valid JSON.",
		"Schema:",
		'{"summary":"string","concepts":["string"],"steps":["string"],"exercises":["string"],"resources":[{"title":"string","description":"string","type":"reading|video|hands-on|socratic"}]}',
		"Keep the lesson grounded in the node context and success criteria.",
		"Do not include markdown fences.",
	].join(" ");

	const lesson = await aiService.generateStructuredOutput(
		buildLessonContentPrompt({ goalDescription, node }),
		systemInstruction,
	);

	return lessonContentSchema.parse(lesson);
}

async function ensureLessonContent({
	ctx,
	roadmap,
	node,
}: {
	ctx: { db: typeof import("@gemastik/db").db; user: { id: string } };
	roadmap: { goalDescription: string };
	node: {
		id: string;
		title: string;
		contentType: string;
		difficultyLevel: number;
		estimatedTime: number;
		successCriteria: string[];
		lessonContent: LessonContent | null;
	};
}) {
	if (node.lessonContent) {
		return node.lessonContent;
	}

	const lessonContent = await generateLessonContent({
		goalDescription: roadmap.goalDescription,
		node,
	});

	await ctx.db
		.update(roadmapNodes)
		.set({ lessonContent })
		.where(eq(roadmapNodes.id, node.id));

	return lessonContent;
}

async function syncRoadmapCompletion({
	ctx,
	roadmapId,
}: {
	ctx: { db: typeof import("@gemastik/db").db; user: { id: string } };
	roadmapId: string;
}) {
	const nodes = await ctx.db.query.roadmapNodes.findMany({
		where: and(
			eq(roadmapNodes.roadmapId, roadmapId),
			eq(roadmapNodes.userId, ctx.user.id),
		),
	});

	const isCompleted = nodes.length > 0 && nodes.every((node) => node.isCompleted);

	await ctx.db
		.update(learningRoadmaps)
		.set({ currentStatus: isCompleted ? "completed" : "active" })
		.where(
			and(
				eq(learningRoadmaps.id, roadmapId),
				eq(learningRoadmaps.userId, ctx.user.id),
			),
		);

	return isCompleted;
}

async function generateNodes(goalDescription: string) {
  const result = await roadmapService.generateInitialRoadmap(goalDescription);
  return z.array(generatedNodeSchema).min(1).max(5).parse(result.nodes);
}

async function createRoadmap({
  ctx,
  goalDescription,
  metadata,
  allowDraftOnGenerationFailure,
}: {
  ctx: { db: typeof import("@gemastik/db").db; user: { id: string } };
  goalDescription: string;
  metadata: Record<string, unknown>;
  allowDraftOnGenerationFailure: boolean;
}) {
  let generationStatus: RoadmapGenerationStatus = "generated";
  let nodes: GeneratedNode[] = [];

  try {
    nodes = await generateNodes(goalDescription);
  } catch (error) {
    if (!allowDraftOnGenerationFailure) {
      throw error;
    }

    generationStatus = "draft";
    console.error("ROADMAP_CREATE_DRAFT_FALLBACK:", error);
  }

  return await ctx.db.transaction(async (tx) => {
    const [roadmap] = await tx
      .insert(learningRoadmaps)
      .values({
        id: nanoid(),
        userId: ctx.user.id,
        goalDescription,
        metadata: {
          ...metadata,
          originalPrompt: goalDescription,
          generationStatus,
        },
      })
      .returning();

    if (!roadmap) {
      throw new Error("Failed to create roadmap: database insert returned no data.");
    }

    if (nodes.length > 0) {
      await tx.insert(roadmapNodes).values(formatNodesForInsert(nodes, ctx.user.id, roadmap.id));
    }

    return {
      roadmapId: roadmap.id,
      generationStatus,
      nodeCount: nodes.length,
    };
  });
}

export const learningRouter = createTRPCRouter({
	create: protectedProcedure
		.input(onboardingAnswersSchema)
		.mutation(async ({ ctx, input }) => {
			const goalDescription = buildGoalDescription(input);

			return await createRoadmap({
				ctx,
				goalDescription,
				metadata: {
					onboarding: input,
				},
				allowDraftOnGenerationFailure: true,
			});
		}),

	generate: protectedProcedure
		.input(z.object({ goal: z.string().min(10) }))
		.mutation(async ({ ctx, input }) => {
			return await createRoadmap({
				ctx,
				goalDescription: input.goal,
				metadata: {},
				allowDraftOnGenerationFailure: false,
			});
		}),

	recalibrate: protectedProcedure
		.input(z.object({ roadmapId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// 1. Ambil data roadmap dan node yang belum selesai
			const roadmap = await ctx.db.query.learningRoadmaps.findFirst({
				where: and(
					eq(learningRoadmaps.id, input.roadmapId),
					eq(learningRoadmaps.userId, ctx.user.id),
				),
				with: {
					nodes: true,
				},
			});

			if (!roadmap || roadmap.currentStatus !== "needs_recalibration") {
				throw new Error(
					"Roadmap tidak ditemukan atau tidak dalam status butuh rekalibrasi.",
				);
			}

			// 2. Ambil konteks kegagalan (lastNode dari metadata)
			const failedNodeTitle = (roadmap.metadata as any)?.lastNode;
			const failedNode = roadmap.nodes.find((n) => n.title === failedNodeTitle);

			let failureContext = "";
			if (failedNode) {
				const session = await ctx.db.query.socraticSessions.findFirst({
					where: eq(socraticSessions.nodeId, failedNode.id),
				});
				failureContext = JSON.stringify(session?.chatHistory ?? []);
			}

			// 3. Sintesis jalur alternatif via roadmapService
			const recalibratedRoadmap = await roadmapService.recalibrateRoadmap({
				goal: roadmap.goalDescription,
				failedNodeTitle: failedNodeTitle,
				context: failureContext,
			});
			const adaptedNodes = z.array(generatedNodeSchema).min(1).max(5).parse(recalibratedRoadmap.nodes);

			// 4. Transaction: Replace incomplete nodes
			return await ctx.db.transaction(async (tx) => {
				// Hapus node yang belum kelar
				await tx
					.delete(roadmapNodes)
					.where(
						and(
							eq(roadmapNodes.roadmapId, roadmap.id),
							eq(roadmapNodes.isCompleted, false),
						),
					);

				const completedCount = roadmap.nodes.filter(
					(n) => n.isCompleted,
				).length;

				await tx
					.insert(roadmapNodes)
					.values(formatNodesForInsert(adaptedNodes, ctx.user.id, roadmap.id, completedCount));

				// Reset status roadmap jadi active
				await tx
					.update(learningRoadmaps)
					.set({ currentStatus: "active", metadata: {} })
					.where(eq(learningRoadmaps.id, roadmap.id));

				return { success: true };
			});
		}),

	list: protectedProcedure.query(async ({ ctx }) => {
		return await ctx.db.query.learningRoadmaps.findMany({
			where: eq(learningRoadmaps.userId, ctx.user.id),
			orderBy: (roadmap, { desc }) => [desc(roadmap.createdAt)],
			with: {
				nodes: {
					orderBy: (node, { asc }) => [asc(node.orderIndex)],
				},
			},
		});
	}),

	getNodeContent: protectedProcedure
		.input(z.object({ roadmapId: z.string().min(1), nodeId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const { roadmap, node } = await getAccessibleRoadmapNode({
				ctx,
				roadmapId: input.roadmapId,
				nodeId: input.nodeId,
			});

			const lessonContent = await ensureLessonContent({
				ctx,
				roadmap,
				node: {
					...node,
					lessonContent: node.lessonContent as LessonContent | null,
				},
			});

			return { nodeId: node.id, lessonContent };
		}),

	getTutorSession: protectedProcedure
		.input(z.object({ nodeId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			await getAccessibleRoadmapNode({ ctx, nodeId: input.nodeId });

			const session = await ctx.db.query.tutorSessions.findFirst({
				where: and(
					eq(tutorSessions.nodeId, input.nodeId),
					eq(tutorSessions.userId, ctx.user.id),
				),
			});

			return session?.chatHistory ?? [];
		}),

	askTutor: protectedProcedure
		.input(
			z.object({
				roadmapId: z.string().min(1),
				nodeId: z.string().min(1),
				message: z.string().trim().min(1).max(3000),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { roadmap, node } = await getAccessibleRoadmapNode({
				ctx,
				roadmapId: input.roadmapId,
				nodeId: input.nodeId,
			});

			const lessonContent = await ensureLessonContent({
				ctx,
				roadmap,
				node: {
					...node,
					lessonContent: node.lessonContent as LessonContent | null,
				},
			});

			const session = await ctx.db.query.tutorSessions.findFirst({
				where: and(
					eq(tutorSessions.nodeId, input.nodeId),
					eq(tutorSessions.userId, ctx.user.id),
				),
			});

			const updatedHistory = [
				...(session?.chatHistory ?? []),
				{ role: "user" as const, content: input.message },
			];

			const prompt = updatedHistory
				.map((message) => `${message.role === "user" ? "Learner" : "Tutor"}: ` + message.content)
				.join("\n");

			const answer = await aiService.generateText(
				prompt,
				buildTutorInstruction({
					goalDescription: roadmap.goalDescription,
					node,
					lessonContent,
				}),
			);

			const chatHistory = [
				...updatedHistory,
				{ role: "assistant" as const, content: answer },
			];

			await ctx.db
				.insert(tutorSessions)
				.values({
					id: session?.id ?? nanoid(),
					userId: ctx.user.id,
					nodeId: input.nodeId,
					chatHistory,
				})
				.onConflictDoUpdate({
					target: tutorSessions.id,
					set: { chatHistory },
				});

			return { answer, chatHistory };
		}),

	finishNode: protectedProcedure
		.input(z.object({ roadmapId: z.string().min(1), nodeId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			await getAccessibleRoadmapNode({
				ctx,
				roadmapId: input.roadmapId,
				nodeId: input.nodeId,
			});

			await ctx.db
				.update(roadmapNodes)
				.set({ isCompleted: true, completedAt: new Date() })
				.where(eq(roadmapNodes.id, input.nodeId));

			const roadmapCompleted = await syncRoadmapCompletion({ ctx, roadmapId: input.roadmapId });

			return { success: true, roadmapCompleted };
		}),

	reopenNode: protectedProcedure
		.input(z.object({ roadmapId: z.string().min(1), nodeId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			await getAccessibleRoadmapNode({
				ctx,
				roadmapId: input.roadmapId,
				nodeId: input.nodeId,
			});

			await ctx.db
				.update(roadmapNodes)
				.set({ isCompleted: false, completedAt: null })
				.where(eq(roadmapNodes.id, input.nodeId));

			await syncRoadmapCompletion({ ctx, roadmapId: input.roadmapId });

			return { success: true };
		}),

	getDashboard: protectedProcedure.query(async ({ ctx }) => {
		return await ctx.db.query.learningRoadmaps.findMany({
			where: eq(learningRoadmaps.userId, ctx.user.id),
			orderBy: (roadmap, { desc }) => [desc(roadmap.createdAt)],
			with: {
				nodes: {
					orderBy: (node, { asc }) => [asc(node.orderIndex)],
				},
			},
		});
	}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const data = await ctx.db.query.learningRoadmaps.findFirst({
				where: and(
					eq(learningRoadmaps.id, input.id),
					eq(learningRoadmaps.userId, ctx.user.id),
				),
				with: {
					nodes: {
						orderBy: (node, { asc }) => [asc(node.orderIndex)],
					},
				},
			});

			if (!data) throw new Error("Roadmap tidak ditemukan.");
			return { ...data, nodes: deriveNodeProgression(data.nodes) };
		}),
});
