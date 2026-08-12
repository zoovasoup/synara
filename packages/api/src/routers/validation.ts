import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { aiService } from "../services/ai.service";
import {
	roadmapNodes,
	learningRoadmaps,
	tutorSessions,
} from "@gemastik/db/schema/learning";
import { learningLogs } from "@gemastik/db/schema/profile";
import { socraticSessions } from "@gemastik/db/schema/validation";
import { eq as drizzleEq, and as drizzleAnd } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getProgressionAfterCompletion } from "../domain/node-progression";
import { getAccessibleRoadmapNode } from "../services/node-access.service";
import {
	calculateStagnationScore,
	calculateTimeRatio,
	shouldRecordAdaptiveAttempt,
	shouldRequireRecalibration,
} from "../domain/stagnation-score";

const socraticEvaluationSchema = z.object({
	ai_response: z.string().trim().min(1),
	competency_score: z.coerce.number().min(0).max(100),
	stumble_count: z.coerce.number().int().min(0).max(1),
	sentiment_score: z.coerce.number().min(0).max(1),
});

export const validationRouter = createTRPCRouter({
	getSocraticSession: protectedProcedure
		.input(
			z.object({
				nodeId: z.string().min(1),
			}),
		)
		.query(async ({ ctx, input }) => {
			await getAccessibleRoadmapNode({ ctx, nodeId: input.nodeId });

			const session = await ctx.db.query.socraticSessions.findFirst({
				where: drizzleAnd(
					drizzleEq(socraticSessions.nodeId, input.nodeId),
					drizzleEq(socraticSessions.userId, ctx.user.id),
				),
			});

			return session ?? null;
		}),

	submitSocratic: protectedProcedure
		.input(
			z.object({
				nodeId: z.string().min(10),
				message: z.string().min(2),
				attemptId: z.string().trim().min(8).max(128),
				activeStudySeconds: z.number().int().min(0).max(604_800),
				backtrackDelta: z.number().int().min(0).max(100),
				effortScore: z.number().int().min(1).max(9),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { node, roadmap, progressionState } =
				await getAccessibleRoadmapNode({
				ctx,
				nodeId: input.nodeId,
			});

			const [session, learningLog, tutorSession] = await Promise.all([
				ctx.db.query.socraticSessions.findFirst({
					where: drizzleAnd(
						drizzleEq(socraticSessions.nodeId, input.nodeId),
						drizzleEq(socraticSessions.userId, ctx.user.id),
					),
				}),
				ctx.db.query.learningLogs.findFirst({
					where: drizzleAnd(
						drizzleEq(learningLogs.nodeId, input.nodeId),
						drizzleEq(learningLogs.userId, ctx.user.id),
					),
				}),
				ctx.db.query.tutorSessions.findFirst({
					where: drizzleAnd(
						drizzleEq(tutorSessions.nodeId, input.nodeId),
						drizzleEq(tutorSessions.userId, ctx.user.id),
					),
				}),
			]);

			const tutorTurnCount =
				tutorSession?.chatHistory.filter((message) => message.role === "user")
					.length ?? 0;

			if (learningLog?.lastAttemptId === input.attemptId) {
				const storedStagnation = calculateStagnationScore({
					socraticFailureCount: learningLog.socraticFailureCount,
					timeRatios: learningLog.timeRatios,
					tutorTurnCount,
					backtrackCount: learningLog.backtrackCount,
					effortScore: learningLog.effortScore,
				});
				const storedProgression = node.isCompleted
					? getProgressionAfterCompletion(roadmap.nodes, node.id)
					: { nextNodeId: node.id, roadmapCompleted: false };

				return {
					ai_response: session?.aiFeedbackSummary ?? "Attempt already recorded.",
					competency_score: session?.competencyScore ?? 0,
					stumble_count: session?.stumbleCount ?? 0,
					sentiment_score: session?.sentimentScore ?? 0,
					...storedProgression,
					recalibrationRequired:
						!node.isCompleted &&
						roadmap.currentStatus === "needs_recalibration",
					interventionLevel: learningLog.interventionLevel,
					stagnation: storedStagnation,
				};
			}

			if (
				!shouldRecordAdaptiveAttempt({
					isCompleted: node.isCompleted,
					progressionState,
				})
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Only the current incomplete step can be validated.",
				});
			}

			const updatedHistory = session
				? [
						...session.chatHistory,
						{ role: "user" as const, content: input.message },
					]
				: [{ role: "user" as const, content: input.message }];

			const systemInstruction = `
				You are the Socratic Validator for Synara. Evaluate understanding of "${node.title}".
				Success Criteria: ${node.successCriteria.join("; ")}. 

				Output ONLY raw JSON with this exact schema:
				{
					"ai_response": "string (your socratic response)",
					"competency_score": number (0-100 based on success criteria met),
					"stumble_count": 0 or 1 (1 if user is repeating mistakes or clearly stuck),
					"sentiment_score": number (0.0 to 1.0)
				}

				SCORING RULES for sentiment_score:
				- 0.0: Frustrated, angry, or "I give up" attitude.
				- 0.5: Neutral, factual, or simple answers (Default).
				- 1.0: Excited, motivated, or deep engagement.

				Current user sentiment is crucial. If they are neutral, give 0.5.
			`;

			const aiResult = socraticEvaluationSchema.parse(
				await aiService.generateStructuredOutput(
					JSON.stringify(updatedHistory),
					systemInstruction,
				),
			);
			const isMastered = aiResult.competency_score >= 80;
			const masteryProgression = isMastered
				? getProgressionAfterCompletion(roadmap.nodes, node.id)
				: { nextNodeId: node.id, roadmapCompleted: false };
			const timeRatio = calculateTimeRatio({
				activeStudySeconds: input.activeStudySeconds,
				estimatedTimeMinutes: node.estimatedTime,
			});
			const timeRatios = [
				...(learningLog?.timeRatios ?? []),
				Number(timeRatio.toFixed(4)),
			];
			const socraticFailureCount =
				(learningLog?.socraticFailureCount ?? 0) + (isMastered ? 0 : 1);
			const backtrackCount =
				(learningLog?.backtrackCount ?? 0) + input.backtrackDelta;
			const stagnation = calculateStagnationScore({
				socraticFailureCount,
				timeRatios,
				tutorTurnCount,
				backtrackCount,
				effortScore: input.effortScore,
			});
			const recalibrationRequired = shouldRequireRecalibration({
				isMastered,
				stagnation,
			});

			return await ctx.db.transaction(async (tx) => {
				const totalStumbles =
					(session?.stumbleCount ?? 0) + (aiResult.stumble_count ?? 0);
				const nextChatHistory = [
					...updatedHistory,
					{ role: "assistant" as const, content: aiResult.ai_response },
				];

				await tx
					.insert(socraticSessions)
					.values({
						id: session?.id ?? nanoid(),
						nodeId: node.id,
						userId: ctx.user.id,
						chatHistory: nextChatHistory,
						competencyScore: aiResult.competency_score,
						stumbleCount: totalStumbles,
						sentimentScore: aiResult.sentiment_score ?? 0,
						aiFeedbackSummary: aiResult.ai_response,
					})
					.onConflictDoUpdate({
						target: socraticSessions.id,
						set: {
							chatHistory: nextChatHistory,
							competencyScore: aiResult.competency_score,
							stumbleCount: totalStumbles,
							sentimentScore: aiResult.sentiment_score ?? 0,
							aiFeedbackSummary: aiResult.ai_response,
						},
					});

				await tx
					.insert(learningLogs)
					.values({
						id: learningLog?.id ?? nanoid(),
						userId: ctx.user.id,
						nodeId: node.id,
						timeSpent:
							(learningLog?.timeSpent ?? 0) + input.activeStudySeconds,
						socraticFailureCount,
						timeRatios,
						backtrackCount,
						effortScore: input.effortScore,
						stagnationScore: stagnation.score,
						interventionLevel: stagnation.level,
						triggerReasons: stagnation.triggerReasons,
						lastAttemptId: input.attemptId,
						stumbleCount: totalStumbles,
						sentimentScore: aiResult.sentiment_score,
					})
					.onConflictDoUpdate({
						target: [learningLogs.userId, learningLogs.nodeId],
						set: {
							timeSpent:
								(learningLog?.timeSpent ?? 0) + input.activeStudySeconds,
							socraticFailureCount,
							timeRatios,
							backtrackCount,
							effortScore: input.effortScore,
							stagnationScore: stagnation.score,
							interventionLevel: stagnation.level,
							triggerReasons: stagnation.triggerReasons,
							lastAttemptId: input.attemptId,
							stumbleCount: totalStumbles,
							sentimentScore: aiResult.sentiment_score,
							updatedAt: new Date(),
						},
					});

				if (isMastered) {
					await tx
						.update(roadmapNodes)
						.set({ isCompleted: true, completedAt: new Date() })
						.where(drizzleEq(roadmapNodes.id, node.id));

					await tx
						.update(learningRoadmaps)
						.set({
							currentStatus: masteryProgression.roadmapCompleted
								? "completed"
								: "active",
							metadata: {
								...(roadmap.metadata ?? {}),
								reason: undefined,
								lastNode: undefined,
							},
						})
						.where(
							drizzleAnd(
								drizzleEq(learningRoadmaps.id, node.roadmapId),
								drizzleEq(learningRoadmaps.userId, ctx.user.id),
							),
						);
				}

				if (recalibrationRequired) {
					await tx
						.update(learningRoadmaps)
						.set({
							currentStatus: "needs_recalibration",
							metadata: {
								...(roadmap.metadata ?? {}),
								reason: "stagnation_score",
								lastNode: node.title,
							},
						})
						.where(
							drizzleAnd(
								drizzleEq(learningRoadmaps.id, node.roadmapId),
								drizzleEq(learningRoadmaps.userId, ctx.user.id),
							),
						);

				}

				return {
					...aiResult,
					...masteryProgression,
					recalibrationRequired,
					interventionLevel: stagnation.level,
					stagnation,
				};
			});
		}),
});
