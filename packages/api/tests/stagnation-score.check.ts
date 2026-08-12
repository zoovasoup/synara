import { getProgressionAfterCompletion } from "../src/domain/node-progression";
import {
	calculateStagnationScore,
	calculateTimeRatio,
	shouldRecordAdaptiveAttempt,
	shouldRequireRecalibration,
} from "../src/domain/stagnation-score";

function assertEqual<T>(actual: T, expected: T, label: string) {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(
			`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
		);
	}
}

const noSignals = {
	socraticFailureCount: 0,
	timeRatios: [],
	tutorTurnCount: 0,
	backtrackCount: 0,
	effortScore: null,
};

const scoreA = calculateStagnationScore(noSignals);
assertEqual({ score: scoreA.score, level: scoreA.level }, { score: 0, level: "none" }, "Score A");

const scoreB = calculateStagnationScore({ ...noSignals, socraticFailureCount: 1 });
assertEqual(scoreB.breakdown.socraticFailure, 15, "Score B");

const scoreC = calculateStagnationScore({ ...noSignals, socraticFailureCount: 2 });
assertEqual(scoreC.score, 30, "Score C score");
assertEqual(scoreC.hardTriggers.repeatedSocraticFailure, true, "Score C hard trigger");

const timeRatioD = calculateTimeRatio({ activeStudySeconds: 34 * 60, estimatedTimeMinutes: 20 });
const scoreD = calculateStagnationScore({ ...noSignals, timeRatios: [timeRatioD] });
assertEqual(scoreD.breakdown.timeRatio, 10, "Score D");

const scoreE = calculateStagnationScore({ ...noSignals, timeRatios: [2.2] });
assertEqual(scoreE.breakdown.timeRatio, 20, "Score E exclusive tier");

const scoreF = calculateStagnationScore({ ...noSignals, timeRatios: [2.1, 2.2] });
assertEqual(scoreF.breakdown.timeRatio, 40, "Score F cumulative tiers");
assertEqual(scoreF.hardTriggers.repeatedExcessiveTimeRatio, true, "Score F hard trigger");

const scoreG = calculateStagnationScore({ ...noSignals, tutorTurnCount: 5 });
const scoreGAfterMoreTurns = calculateStagnationScore({ ...noSignals, tutorTurnCount: 12 });
assertEqual(scoreG.breakdown.tutorInteraction, 10, "Score G threshold");
assertEqual(scoreGAfterMoreTurns.breakdown.tutorInteraction, 10, "Score G applied once");

const scoreH = calculateStagnationScore({ ...noSignals, backtrackCount: 2 });
assertEqual(scoreH.breakdown.backtrack, 10, "Score H");

const scoreI = calculateStagnationScore({ ...noSignals, effortScore: 7 });
assertEqual(scoreI.breakdown.effort, 10, "Score I");

const scoreJ = calculateStagnationScore({
	socraticFailureCount: 2,
	timeRatios: [2.1, 2.2],
	tutorTurnCount: 0,
	backtrackCount: 0,
	effortScore: null,
});
assertEqual(scoreJ.score, 70, "Score J score");
assertEqual(scoreJ.level, "recalibration", "Score J level");
assertEqual(scoreJ.hardTriggers.scoreThreshold, true, "Score J hard trigger");
assertEqual(scoreJ.recalibrationRequired, true, "Score J recalibration");

const masteryProgression = getProgressionAfterCompletion(
	[
		{ id: "current", orderIndex: 0, isCompleted: false },
		{ id: "next", orderIndex: 1, isCompleted: false },
	],
	"current",
);
assertEqual(
	shouldRequireRecalibration({ isMastered: true, stagnation: scoreJ }),
	false,
	"Score K mastery precedence",
);
assertEqual(
	masteryProgression,
	{ nextNodeId: "next", roadmapCompleted: false },
	"Score K next node",
);

assertEqual(
	shouldRecordAdaptiveAttempt({
		isCompleted: true,
		progressionState: "completed",
	}),
	false,
	"Score L completed review",
);

console.log("Stagnation Score checks passed (Scores A-L).")
