export const LEARNING_SOURCE_TYPES = [
	"official_documentation",
	"open_courseware",
	"verified_tutorial",
] as const;

export const LEARNING_SOURCE_LEVELS = [
	"beginner",
	"intermediate",
	"advanced",
	"all",
] as const;

export type LearningSourceType = (typeof LEARNING_SOURCE_TYPES)[number];
export type LearningSourceLevel = (typeof LEARNING_SOURCE_LEVELS)[number];

export type LearningSourceCandidate = {
	id: string;
	title: string;
	provider: string;
	url: string;
	sourceType: LearningSourceType;
	level: LearningSourceLevel;
	tags: string[];
	description: string;
	isVerified: boolean;
	isActive: boolean;
};

export type LearningSourceMatchContext = {
	topic?: string | null;
	nodeTitle: string;
	learnerLevel?: string | null;
	goalDescription?: string | null;
};

export type CuratedLessonResource = Pick<
	LearningSourceCandidate,
	"title" | "provider" | "url" | "sourceType" | "level" | "description"
> & {
	sourceId: string;
};

const STOP_WORDS = new Set([
	"a",
	"an",
	"and",
	"advanced",
	"apply",
	"beginner",
	"commitment",
	"current",
	"for",
	"from",
	"goal",
	"hours",
	"in",
	"intermediate",
	"learn",
	"learning",
	"level",
	"of",
	"on",
	"preferred",
	"primary",
	"style",
	"the",
	"to",
	"weekly",
	"with",
]);

const SOURCE_TYPE_PRIORITY: Record<LearningSourceType, number> = {
	official_documentation: 0,
	open_courseware: 1,
	verified_tutorial: 2,
};

export function normalizeSourceTokens(...values: (string | null | undefined)[]) {
	const tokens = values
		.flatMap((value) =>
			(value ?? "")
				.toLowerCase()
				.normalize("NFKD")
				.replace(/[\u0300-\u036f]/g, "")
				.replace(/[^a-z0-9+#.]+/g, " ")
				.split(/\s+/),
		)
		.map((token) => token.replace(/^\.+|\.+$/g, ""))
		.filter((token) => token.length > 1 && !STOP_WORDS.has(token));

	return [...new Set(tokens)];
}

export function mapLearnerLevel(
	level: string | null | undefined,
): Exclude<LearningSourceLevel, "all"> | null {
	const normalized = level?.trim().toLowerCase();

	if (normalized === "beginner") return "beginner";
	if (normalized === "intermediate") return "intermediate";
	if (normalized === "advanced") return "advanced";

	return null;
}

function countOverlap(left: Set<string>, right: Set<string>) {
	let count = 0;
	for (const token of left) {
		if (right.has(token)) count += 1;
	}
	return count;
}

function getLevelScore(
	sourceLevel: LearningSourceLevel,
	learnerLevel: Exclude<LearningSourceLevel, "all"> | null,
) {
	if (sourceLevel === "all") return 2;
	if (!learnerLevel) return 0;
	if (sourceLevel === learnerLevel) return 4;

	if (
		(learnerLevel === "beginner" && sourceLevel === "advanced") ||
		(learnerLevel === "advanced" && sourceLevel === "beginner")
	) {
		return -2;
	}

	return 0;
}

export function selectCuratedLearningSources(
	candidates: LearningSourceCandidate[],
	context: LearningSourceMatchContext,
	limit = 3,
): CuratedLessonResource[] {
	const searchTokens = new Set(
		normalizeSourceTokens(
			context.topic,
			context.nodeTitle,
			context.goalDescription,
		),
	);
	const learnerLevel = mapLearnerLevel(context.learnerLevel);
	const maximumResults = Math.max(0, Math.min(3, Math.floor(limit)));

	return candidates
		.filter((source) => source.isVerified && source.isActive)
		.map((source) => {
			const tagTokens = new Set(normalizeSourceTokens(...source.tags));
			const titleTokens = new Set(normalizeSourceTokens(source.title));
			const tagOverlap = countOverlap(searchTokens, tagTokens);
			const titleOverlap = countOverlap(searchTokens, titleTokens);

			return {
				source,
				topicScore: tagOverlap * 12 + titleOverlap * 4,
				levelScore: getLevelScore(source.level, learnerLevel),
			};
		})
		.filter((result) => result.topicScore > 0)
		.sort((left, right) => {
			const scoreDifference =
				right.topicScore + right.levelScore -
				(left.topicScore + left.levelScore);
			if (scoreDifference !== 0) return scoreDifference;

			const typeDifference =
				SOURCE_TYPE_PRIORITY[left.source.sourceType] -
				SOURCE_TYPE_PRIORITY[right.source.sourceType];
			if (typeDifference !== 0) return typeDifference;

			const titleDifference = left.source.title.localeCompare(right.source.title);
			if (titleDifference !== 0) return titleDifference;

			const providerDifference = left.source.provider.localeCompare(
				right.source.provider,
			);
			if (providerDifference !== 0) return providerDifference;

			return left.source.id.localeCompare(right.source.id);
		})
		.slice(0, maximumResults)
		.map(({ source }) => ({
			sourceId: source.id,
			title: source.title,
			provider: source.provider,
			url: source.url,
			sourceType: source.sourceType,
			level: source.level,
			description: source.description,
		}));
}
