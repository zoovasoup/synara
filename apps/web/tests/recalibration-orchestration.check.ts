import { runRecalibrationOrchestration } from "../src/lib/recalibration-orchestration";

function assertEqual<T>(actual: T, expected: T, label: string) {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(
			`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
		);
	}
}

let recalibrationCalls = 0;
let refreshCalls = 0;
const selectedNodeIds: string[] = [];
const inFlight = { current: null };

const run = () =>
	runRecalibrationOrchestration({
		inFlight,
		recalibrate: async () => {
			recalibrationCalls += 1;
			await Promise.resolve();
			return { currentNodeId: "replacement-1", replacementCount: 3 };
		},
		refresh: async () => {
			refreshCalls += 1;
		},
		selectCurrentNode: (nodeId) => {
			selectedNodeIds.push(nodeId);
		},
	});

const [firstResult, duplicateResult] = await Promise.all([run(), run()]);

assertEqual(recalibrationCalls, 1, "Recalibration K single mutation");
assertEqual(refreshCalls, 1, "Recalibration K single refresh");
assertEqual(selectedNodeIds, ["replacement-1"], "Recalibration K selection");
assertEqual(firstResult, duplicateResult, "Recalibration K shared result");

console.log("Recalibration UI orchestration check passed (Scenario K).")
