export type RecalibrationStatus =
	| "active"
	| "completed"
	| "recalibrating"
	| "needs_recalibration";

export type RecalibrationNodeSnapshot = {
	id: string;
	title: string;
	orderIndex: number;
	isCompleted: boolean;
};

export type RecalibrationMetadata = {
	reason?: string;
	lastNode?: string;
	triggerNodeId?: string;
	lastRecalibrationAt?: string;
	lastRecalibrationLogId?: string;
	[key: string]: unknown;
};

export class RecalibrationNotEligibleError extends Error {
	constructor() {
		super("This learning path is not waiting for recalibration.");
		this.name = "RecalibrationNotEligibleError";
	}
}

export function findRecalibrationTriggerNode<T extends RecalibrationNodeSnapshot>(
	nodes: readonly T[],
	metadata: RecalibrationMetadata | null,
) {
	const orderedNodes = [...nodes].sort(
		(left, right) => left.orderIndex - right.orderIndex,
	);
	const incompleteNodes = orderedNodes.filter((node) => !node.isCompleted);

	return (
		incompleteNodes.find((node) => node.id === metadata?.triggerNodeId) ??
		incompleteNodes.find((node) => node.title === metadata?.lastNode) ??
		incompleteNodes[0] ??
		null
	);
}

export function getReplacementStartIndex(
	nodes: readonly Pick<RecalibrationNodeSnapshot, "orderIndex" | "isCompleted">[],
) {
	const completedOrderIndexes = nodes
		.filter((node) => node.isCompleted)
		.map((node) => node.orderIndex);

	return completedOrderIndexes.length === 0
		? 0
		: Math.max(...completedOrderIndexes) + 1;
}

export function buildRecalibratedMetadata({
	metadata,
	logId,
	recalibratedAt,
}: {
	metadata: RecalibrationMetadata | null;
	logId: string;
	recalibratedAt: Date;
}) {
	const stableMetadata = { ...(metadata ?? {}) };
	delete stableMetadata.reason;
	delete stableMetadata.lastNode;
	delete stableMetadata.triggerNodeId;

	return {
		...stableMetadata,
		lastRecalibrationAt: recalibratedAt.toISOString(),
		lastRecalibrationLogId: logId,
	};
}

export async function runRecalibrationWorkflow<Context, Generated, Result>({
	claim,
	generate,
	replace,
	restoreRetryableState,
}: {
	claim: () => Promise<Context | null>;
	generate: (context: Context) => Promise<Generated>;
	replace: (context: Context, generated: Generated) => Promise<Result>;
	restoreRetryableState: () => Promise<void>;
}) {
	const context = await claim();

	if (!context) {
		throw new RecalibrationNotEligibleError();
	}

	try {
		const generated = await generate(context);
		return await replace(context, generated);
	} catch (error) {
		await restoreRetryableState();
		throw error;
	}
}
