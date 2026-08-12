export type StagnationLevel =
	| "none"
	| "light_support"
	| "remediation"
	| "recalibration";

export type StagnationTriggerReason =
	| "repeated_socratic_failure"
	| "repeated_excessive_time_ratio"
	| "stagnation_score_threshold";

export type StagnationScoreInput = {
	socraticFailureCount: number;
	timeRatios: readonly number[];
	tutorTurnCount: number;
	backtrackCount: number;
	effortScore: number | null;
};

function normalizeCount(value: number) {
	return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function getTimeRatioContribution(timeRatio: number) {
	if (!Number.isFinite(timeRatio) || timeRatio <= 1.5) {
		return 0;
	}

	return timeRatio <= 2 ? 10 : 20;
}

function getStagnationLevel(score: number): StagnationLevel {
	if (score >= 70) return "recalibration";
	if (score >= 50) return "remediation";
	if (score >= 30) return "light_support";
	return "none";
}

export function calculateTimeRatio({
	activeStudySeconds,
	estimatedTimeMinutes,
}: {
	activeStudySeconds: number;
	estimatedTimeMinutes: number;
}) {
	if (
		!Number.isFinite(activeStudySeconds) ||
		!Number.isFinite(estimatedTimeMinutes) ||
		activeStudySeconds <= 0 ||
		estimatedTimeMinutes <= 0
	) {
		return 0;
	}

	return activeStudySeconds / 60 / estimatedTimeMinutes;
}

export function calculateStagnationScore(input: StagnationScoreInput) {
	const socraticFailureCount = normalizeCount(input.socraticFailureCount);
	const tutorTurnCount = normalizeCount(input.tutorTurnCount);
	const backtrackCount = normalizeCount(input.backtrackCount);
	const timeRatios = input.timeRatios.filter(
		(timeRatio) => Number.isFinite(timeRatio) && timeRatio >= 0,
	);
	const effortScore =
		input.effortScore !== null && Number.isFinite(input.effortScore)
			? Math.min(9, Math.max(1, Math.round(input.effortScore)))
			: null;

	const breakdown = {
		socraticFailure: socraticFailureCount * 15,
		timeRatio: timeRatios.reduce(
			(total, timeRatio) => total + getTimeRatioContribution(timeRatio),
			0,
		),
		tutorInteraction: tutorTurnCount >= 5 ? 10 : 0,
		backtrack: backtrackCount >= 2 ? 10 : 0,
		effort: effortScore !== null && effortScore >= 7 ? 10 : 0,
	};

	const rawScore = Object.values(breakdown).reduce(
		(total, contribution) => total + contribution,
		0,
	);
	const score = Math.min(100, rawScore);
	const lastTwoTimeRatios = timeRatios.slice(-2);
	const hardTriggers = {
		repeatedSocraticFailure: socraticFailureCount >= 2,
		repeatedExcessiveTimeRatio:
			lastTwoTimeRatios.length === 2 &&
			lastTwoTimeRatios.every((timeRatio) => timeRatio > 2),
		scoreThreshold: score >= 70,
	};
	const triggerReasons: StagnationTriggerReason[] = [];

	if (hardTriggers.repeatedSocraticFailure) {
		triggerReasons.push("repeated_socratic_failure");
	}

	if (hardTriggers.repeatedExcessiveTimeRatio) {
		triggerReasons.push("repeated_excessive_time_ratio");
	}

	if (hardTriggers.scoreThreshold) {
		triggerReasons.push("stagnation_score_threshold");
	}

	return {
		score,
		level: getStagnationLevel(score),
		breakdown,
		hardTriggers,
		triggerReasons,
		recalibrationRequired: triggerReasons.length > 0,
	};
}

export function shouldRequireRecalibration({
	isMastered,
	stagnation,
}: {
	isMastered: boolean;
	stagnation: Pick<
		ReturnType<typeof calculateStagnationScore>,
		"recalibrationRequired"
	>;
}) {
	return !isMastered && stagnation.recalibrationRequired;
}

export function shouldRecordAdaptiveAttempt({
	isCompleted,
	progressionState,
}: {
	isCompleted: boolean;
	progressionState: "completed" | "current" | "locked" | null;
}) {
	return !isCompleted && progressionState === "current";
}
