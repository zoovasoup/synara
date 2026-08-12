import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { roadmapNodes } from "@gemastik/db/schema/learning";

import { getNodeProgressionState } from "../domain/node-progression";

export const LOCKED_NODE_MESSAGE =
	"This step is locked. Complete the previous step first.";

type NodeAccessContext = {
	db: typeof import("@gemastik/db").db;
	user: { id: string };
};

export async function getAccessibleRoadmapNode({
	ctx,
	nodeId,
	roadmapId,
}: {
	ctx: NodeAccessContext;
	nodeId: string;
	roadmapId?: string;
}) {
	const node = await ctx.db.query.roadmapNodes.findFirst({
		where: and(
			eq(roadmapNodes.id, nodeId),
			eq(roadmapNodes.userId, ctx.user.id),
			roadmapId ? eq(roadmapNodes.roadmapId, roadmapId) : undefined,
		),
		with: {
			roadmap: {
				with: {
					nodes: {
						orderBy: (roadmapNode, { asc }) => [
							asc(roadmapNode.orderIndex),
						],
					},
				},
			},
		},
	});

	if (!node || node.roadmap.userId !== ctx.user.id) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Roadmap step not found.",
		});
	}

	const progressionState = getNodeProgressionState(
		node.roadmap.nodes,
		node.id,
	);

	if (progressionState === "locked") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: LOCKED_NODE_MESSAGE,
		});
	}

	return {
		node,
		roadmap: node.roadmap,
		progressionState,
	};
}
