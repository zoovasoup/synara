import { deriveNodeProgression } from "../src/domain/node-progression";
import {
	buildRecalibratedMetadata,
	findRecalibrationTriggerNode,
	getReplacementStartIndex,
	RecalibrationNotEligibleError,
	runRecalibrationWorkflow,
	type RecalibrationMetadata,
} from "../src/domain/recalibration";
import {
	assertRoadmapAllowsIncompleteNodeActivity,
	assertRoadmapAllowsMastery,
	RECALIBRATION_PENDING_MESSAGE,
} from "../src/services/node-access.service";

function assertEqual<T>(actual: T, expected: T, label: string) {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(
			`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
		);
	}
}

type TestNode = {
	id: string;
	title: string;
	orderIndex: number;
	isCompleted: boolean;
};

const initialNodes: TestNode[] = [
	{ id: "a", title: "A", orderIndex: 0, isCompleted: true },
	{ id: "b", title: "B", orderIndex: 1, isCompleted: false },
	{ id: "c", title: "C", orderIndex: 2, isCompleted: false },
];
const stableMetadata: RecalibrationMetadata = {
	onboarding: { level: "Beginner" },
	originalPrompt: "Learn the original goal",
	generationStatus: "generated",
	reason: "stagnation_score",
	lastNode: "B",
	triggerNodeId: "b",
};

let activeRejected = false;
try {
	await runRecalibrationWorkflow({
		claim: async () => null,
		generate: async () => ["replacement"],
		replace: async () => ({ success: true }),
		restoreRetryableState: async () => undefined,
	});
} catch (error) {
	activeRejected = error instanceof RecalibrationNotEligibleError;
}
assertEqual(activeRejected, true, "Recalibration A eligibility");

let masteryGuardMessage = "";
try {
	assertRoadmapAllowsMastery("needs_recalibration");
} catch (error) {
	masteryGuardMessage = error instanceof Error ? error.message : "";
}
assertEqual(
	masteryGuardMessage,
	RECALIBRATION_PENDING_MESSAGE,
	"Recalibration A mastery guard",
);

let incompleteWriteBlocked = false;
try {
	assertRoadmapAllowsIncompleteNodeActivity({
		currentStatus: "recalibrating",
		isCompleted: false,
	});
} catch {
	incompleteWriteBlocked = true;
}
assertEqual(incompleteWriteBlocked, true, "Recalibration A incomplete write guard");
assertRoadmapAllowsIncompleteNodeActivity({
	currentStatus: "recalibrating",
	isCompleted: true,
});

const state: {
	status: string;
	nodes: TestNode[];
	metadata: RecalibrationMetadata;
	logs: {
		triggerNodeTitle: string;
		previousNodeTitles: string[];
		replacementNodeTitles: string[];
	}[];
} = {
	status: "needs_recalibration",
	nodes: structuredClone(initialNodes),
	metadata: structuredClone(stableMetadata),
	logs: [],
};
const transitions = [state.status];
const replacements = [
	{ id: "b1", title: "B1", isCompleted: false },
	{ id: "b2", title: "B2", isCompleted: false },
	{ id: "b3", title: "B3", isCompleted: false },
];

async function runSuccessfulWorkflow() {
	return await runRecalibrationWorkflow({
		claim: async () => {
			if (state.status !== "needs_recalibration") return null;
			state.status = "recalibrating";
			transitions.push(state.status);
			return { triggerNode: findRecalibrationTriggerNode(state.nodes, state.metadata) };
		},
		generate: async (context) => {
			if (!context.triggerNode) throw new Error("Missing trigger node");
			return { triggerNode: context.triggerNode, replacements };
		},
		replace: async (_context, generated) => {
			const completedNodes = state.nodes.filter((node) => node.isCompleted);
			const startIndex = getReplacementStartIndex(state.nodes);
			const previousNodeTitles = state.nodes
				.filter((node) => !node.isCompleted)
				.map((node) => node.title);

			state.nodes = [
				...completedNodes,
				...generated.replacements.map((node, index) => ({
					...node,
					orderIndex: startIndex + index,
				})),
			];
			state.logs.push({
				triggerNodeTitle: generated.triggerNode.title,
				previousNodeTitles,
				replacementNodeTitles: generated.replacements.map((node) => node.title),
			});
			state.metadata = buildRecalibratedMetadata({
				metadata: state.metadata,
				logId: "log-1",
				recalibratedAt: new Date("2026-08-12T00:00:00.000Z"),
			});
			state.status = "active";
			transitions.push(state.status);
			return { currentNodeId: generated.replacements[0]!.id };
		},
		restoreRetryableState: async () => {
			state.status = "needs_recalibration";
		},
	});
}

const result = await runSuccessfulWorkflow();
assertEqual(
	transitions,
	["needs_recalibration", "recalibrating", "active"],
	"Recalibration B transition",
);
assertEqual(result.currentNodeId, "b1", "Recalibration B current node");
assertEqual(state.nodes[0], initialNodes[0], "Recalibration C completed node");
assertEqual(
	state.nodes.map((node) => node.id),
	["a", "b1", "b2", "b3"],
	"Recalibration D replacement",
);
assertEqual(
	state.nodes.map((node) => node.orderIndex),
	[0, 1, 2, 3],
	"Recalibration D order indexes",
);
assertEqual(
	deriveNodeProgression(state.nodes).map((node) => node.progressionState),
	["completed", "current", "locked", "locked"],
	"Recalibration E progression",
);
assertEqual(
	{
		onboarding: state.metadata.onboarding,
		originalPrompt: state.metadata.originalPrompt,
		generationStatus: state.metadata.generationStatus,
	},
	{
		onboarding: stableMetadata.onboarding,
		originalPrompt: stableMetadata.originalPrompt,
		generationStatus: stableMetadata.generationStatus,
	},
	"Recalibration F metadata",
);
assertEqual(state.metadata.reason, undefined, "Recalibration F clears trigger metadata");
assertEqual(state.logs.length, 1, "Recalibration G log count");
assertEqual(
	state.logs[0],
	{
		triggerNodeTitle: "B",
		previousNodeTitles: ["B", "C"],
		replacementNodeTitles: ["B1", "B2", "B3"],
	},
	"Recalibration G log content",
);

let duplicateRejected = false;
try {
	await runSuccessfulWorkflow();
} catch (error) {
	duplicateRejected = error instanceof RecalibrationNotEligibleError;
}
assertEqual(duplicateRejected, true, "Recalibration H duplicate call");
assertEqual(state.logs.length, 1, "Recalibration H no duplicate log");

const generationFailureState = {
	status: "needs_recalibration",
	nodes: structuredClone(initialNodes),
	logs: [] as string[],
};
let generationFailed = false;
try {
	await runRecalibrationWorkflow({
		claim: async () => {
			generationFailureState.status = "recalibrating";
			return {};
		},
		generate: async () => {
			throw new Error("provider failed");
		},
		replace: async () => {
			generationFailureState.logs.push("false success");
			return {};
		},
		restoreRetryableState: async () => {
			generationFailureState.status = "needs_recalibration";
		},
	});
} catch {
	generationFailed = true;
}
assertEqual(generationFailed, true, "Recalibration I generation failure");
assertEqual(generationFailureState.status, "needs_recalibration", "Recalibration I retry state");
assertEqual(generationFailureState.nodes, initialNodes, "Recalibration I old path");
assertEqual(generationFailureState.logs, [], "Recalibration I no log");

const databaseFailureState = {
	status: "needs_recalibration",
	nodes: structuredClone(initialNodes),
	logs: [] as string[],
};
let databaseFailed = false;
try {
	await runRecalibrationWorkflow({
		claim: async () => {
			databaseFailureState.status = "recalibrating";
			return {};
		},
		generate: async () => replacements,
		replace: async () => {
			const transactionalNodes = databaseFailureState.nodes.filter(
				(node) => node.isCompleted,
			);
			transactionalNodes.push({
				id: "partial",
				title: "Partial",
				orderIndex: 1,
				isCompleted: false,
			});
			throw new Error("database failed before commit");
		},
		restoreRetryableState: async () => {
			databaseFailureState.status = "needs_recalibration";
		},
	});
} catch {
	databaseFailed = true;
}
assertEqual(databaseFailed, true, "Recalibration J database failure");
assertEqual(databaseFailureState.status, "needs_recalibration", "Recalibration J retry state");
assertEqual(databaseFailureState.nodes, initialNodes, "Recalibration J rollback");
assertEqual(databaseFailureState.logs, [], "Recalibration J no log");

console.log("Recalibration checks passed (Scenarios A-J).")
