import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { aiService } from "../services/ai.service";
import { roadmapNodes, learningRoadmaps } from "@gemastik/db/schema/learning";
import { socraticSessions } from "@gemastik/db/schema/validation";
import { eq as drizzleEq, and as drizzleAnd } from "drizzle-orm";
import { nanoid } from "nanoid";

async function syncRoadmapCompletion({
	ctx,
	roadmapId,
}: {
	ctx: { db: typeof import("@gemastik/db").db; user: { id: string } };
	roadmapId: string;
}) {
	const nodes = await ctx.db.query.roadmapNodes.findMany({
		where: drizzleAnd(
			drizzleEq(roadmapNodes.roadmapId, roadmapId),
			drizzleEq(roadmapNodes.userId, ctx.user.id),
		),
	});

	const isCompleted =
		nodes.length > 0 && nodes.every((node) => node.isCompleted);

	await ctx.db
		.update(learningRoadmaps)
		.set({ currentStatus: isCompleted ? "completed" : "active" })
		.where(
			drizzleAnd(
				drizzleEq(learningRoadmaps.id, roadmapId),
				drizzleEq(learningRoadmaps.userId, ctx.user.id),
			),
		);

	return isCompleted;
}

export const validationRouter = createTRPCRouter({
	getSocraticSession: protectedProcedure
		.input(
			z.object({
				nodeId: z.string().min(1),
			}),
		)
		.query(async ({ ctx, input }) => {
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
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const node = await ctx.db.query.roadmapNodes.findFirst({
				where: drizzleAnd(
					drizzleEq(roadmapNodes.id, input.nodeId),
					drizzleEq(roadmapNodes.userId, ctx.user.id),
				),
			});

			if (!node) throw new Error("Node tidak ditemukan.");

			let session = await ctx.db.query.socraticSessions.findFirst({
				where: drizzleEq(socraticSessions.nodeId, input.nodeId),
			});

			const updatedHistory = session
				? [
						...(session.chatHistory as any[]),
						{ role: "user", content: input.message },
					]
				: [{ role: "user", content: input.message }];

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

			const aiResult = await aiService.generateStructuredOutput(
				JSON.stringify(updatedHistory),
				systemInstruction,
			);

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

				if (aiResult.competency_score >= 80) {
					await tx
						.update(roadmapNodes)
						.set({ isCompleted: true, completedAt: new Date() })
						.where(drizzleEq(roadmapNodes.id, node.id));

					await syncRoadmapCompletion({ ctx, roadmapId: node.roadmapId });
				}

				// --- Logic Rekalsibrasi (Threshold: Stumble > 3 atau Sentiment < 0.3) ---
				const isStuck = totalStumbles > 3;
				const isFrustrated = (aiResult.sentiment_score ?? 1) < 0.3;

				if (isStuck || isFrustrated) {
					await tx
						.update(learningRoadmaps)
						.set({
							currentStatus: "needs_recalibration",
							metadata: {
								reason: isStuck ? "cognitive_blockage" : "affective_burnout",
								lastNode: node.title,
							},
						})
						.where(drizzleEq(learningRoadmaps.id, node.roadmapId));

					return { ...aiResult, recalibrationRequired: true };
				}

				return { ...aiResult, recalibrationRequired: false };
			});
		}),
});
