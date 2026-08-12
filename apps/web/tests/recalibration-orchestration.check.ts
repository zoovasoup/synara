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

let roadmapRefreshCalls = 0;
const destinations: string[] = [];
await runRecalibrationOrchestration({
	inFlight: { current: null },
	recalibrate: async () => ({
		currentNodeId: "replacement-2",
		replacementCount: 3,
	}),
	refresh: async () => {
		roadmapRefreshCalls += 1;
	},
	onComplete: () => {
		destinations.push("/dashboard/courses/course-1");
	},
});
assertEqual(roadmapRefreshCalls, 1, "Recalibration route refresh");
assertEqual(
	destinations,
	["/dashboard/courses/course-1"],
	"Recalibration returns to roadmap after refresh",
);

console.log("Recalibration UI orchestration check passed (Scenario K).")
