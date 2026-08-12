import {
	deriveNodeProgression,
	getProgressionAfterCompletion,
} from "../src/domain/node-progression";
import {
	getAccessibleRoadmapNode,
	LOCKED_NODE_MESSAGE,
} from "../src/services/node-access.service";

type TestNode = {
	id: string;
	orderIndex: number;
	isCompleted: boolean;
};

function assertEqual<T>(actual: T, expected: T, label: string) {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(
			`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
		);
	}
}

function states(nodes: TestNode[]) {
	return deriveNodeProgression(nodes).map((node) => node.progressionState);
}

const allIncomplete: TestNode[] = [
	{ id: "a", orderIndex: 0, isCompleted: false },
	{ id: "b", orderIndex: 1, isCompleted: false },
	{ id: "c", orderIndex: 2, isCompleted: false },
];

assertEqual(
	states(allIncomplete),
	["current", "locked", "locked"],
	"Scenario A",
);

assertEqual(
	states([
		{ ...allIncomplete[0]!, isCompleted: true },
		allIncomplete[1]!,
		allIncomplete[2]!,
	]),
	["completed", "current", "locked"],
	"Scenario B",
);

const allCompleted = allIncomplete.map((node) => ({
	...node,
	isCompleted: true,
}));
assertEqual(
	states(allCompleted),
	["completed", "completed", "completed"],
	"Scenario C states",
);
assertEqual(
	getProgressionAfterCompletion(allCompleted, "c"),
	{ nextNodeId: null, roadmapCompleted: true },
	"Scenario C completion",
);

function createNodeAccessContext(nodes: TestNode[], targetNodeId: string) {
	const targetNode = nodes.find((node) => node.id === targetNodeId);
	if (!targetNode) {
		throw new Error("Test target node was not found.");
	}

	return {
		db: {
			query: {
				roadmapNodes: {
					findFirst: async () => ({
						...targetNode,
						userId: "user-1",
						roadmapId: "roadmap-1",
						roadmap: {
							id: "roadmap-1",
							userId: "user-1",
							nodes,
						},
					}),
				},
			},
		} as unknown as typeof import("@gemastik/db").db,
		user: { id: "user-1" },
	};
}

for (const procedure of [
	"learning.getNodeContent",
	"learning.askTutor",
	"validation.submitSocratic",
]) {
	let rejectedMessage = "";

	try {
		await getAccessibleRoadmapNode({
			ctx: createNodeAccessContext(allIncomplete, "b"),
			nodeId: "b",
			roadmapId: "roadmap-1",
		});
	} catch (error) {
		rejectedMessage = error instanceof Error ? error.message : "";
	}

	assertEqual(rejectedMessage, LOCKED_NODE_MESSAGE, `Scenario D ${procedure}`);
}

const afterFirstMastery = getProgressionAfterCompletion(allIncomplete, "a");
assertEqual(
	afterFirstMastery,
	{ nextNodeId: "b", roadmapCompleted: false },
	"Scenario E transition",
);
assertEqual(
	states(allIncomplete.map((node) => (node.id === "a" ? { ...node, isCompleted: true } : node))),
	["completed", "current", "locked"],
	"Scenario E states",
);

assertEqual(
	getProgressionAfterCompletion(
		[
			{ id: "a", orderIndex: 0, isCompleted: true },
			{ id: "b", orderIndex: 1, isCompleted: true },
			{ id: "c", orderIndex: 2, isCompleted: false },
		],
		"c",
	),
	{ nextNodeId: null, roadmapCompleted: true },
	"Scenario F",
);

assertEqual(deriveNodeProgression([]), [], "Draft roadmap");

console.log("Node progression checks passed (Scenarios A-F and draft roadmap).")
