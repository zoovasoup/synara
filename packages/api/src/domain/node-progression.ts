export type ProgressionNode = {
	id: string;
	orderIndex: number;
	isCompleted: boolean;
};

export type NodeProgressionState = "completed" | "current" | "locked";

export type NodeWithProgression<T extends ProgressionNode> = T & {
	progressionState: NodeProgressionState;
};

export function deriveNodeProgression<T extends ProgressionNode>(
	nodes: readonly T[],
): NodeWithProgression<T>[] {
	let currentNodeFound = false;

	return [...nodes]
		.sort((left, right) => left.orderIndex - right.orderIndex)
		.map((node) => {
			let progressionState: NodeProgressionState;

			if (node.isCompleted) {
				progressionState = "completed";
			} else if (!currentNodeFound) {
				progressionState = "current";
				currentNodeFound = true;
			} else {
				progressionState = "locked";
			}

			return { ...node, progressionState };
		});
}

export function getNodeProgressionState(
	nodes: readonly ProgressionNode[],
	nodeId: string,
): NodeProgressionState | null {
	return (
		deriveNodeProgression(nodes).find((node) => node.id === nodeId)
			?.progressionState ?? null
	);
}

export function getProgressionAfterCompletion(
	nodes: readonly ProgressionNode[],
	completedNodeId: string,
) {
	const nextProgression = deriveNodeProgression(
		nodes.map((node) =>
			node.id === completedNodeId ? { ...node, isCompleted: true } : node,
		),
	);

	return {
		nextNodeId:
			nextProgression.find((node) => node.progressionState === "current")?.id ??
			null,
		roadmapCompleted:
			nextProgression.length > 0 &&
			nextProgression.every((node) => node.isCompleted),
	};
}
