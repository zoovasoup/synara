import { buildCuratedLessonContent } from "../src/domain/lesson-content";
import {
	mapLearnerLevel,
	selectCuratedLearningSources,
	type LearningSourceCandidate,
} from "../src/domain/learning-source";

function assertEqual<T>(actual: T, expected: T, label: string) {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(
			`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
		);
	}
}

function source(
	id: string,
	overrides: Partial<LearningSourceCandidate> = {},
): LearningSourceCandidate {
	return {
		id,
		title: `Synthetic source ${id}`,
		provider: "Synthetic test provider",
		url: `https://${id}.example.invalid/resource`,
		sourceType: "verified_tutorial",
		level: "all",
		tags: ["typescript"],
		description: "Synthetic test-only source metadata.",
		isVerified: true,
		isActive: true,
		...overrides,
	};
}

const context = {
	topic: "TypeScript",
	nodeTitle: "Understand TypeScript generics",
	learnerLevel: "Beginner",
	goalDescription: "Build type-safe applications",
};

const verifiedOnly = selectCuratedLearningSources(
	[
		source("eligible"),
		source("unverified", { isVerified: false }),
		source("inactive", { isActive: false }),
	],
	context,
);
assertEqual(
	verifiedOnly.map((item) => item.sourceId),
	["eligible"],
	"Source A verified and active filter",
);

const tagRanking = selectCuratedLearningSources(
	[
		source("title-overlap", {
			title: "TypeScript overview",
			tags: ["programming"],
		}),
		source("tag-overlap", {
			title: "Generic type parameters",
			tags: ["typescript", "generics"],
		}),
	],
	context,
);
assertEqual(tagRanking[0]?.sourceId, "tag-overlap", "Source B tag relevance");

const levelRanking = selectCuratedLearningSources(
	[
		source("advanced", { level: "advanced" }),
		source("all", { level: "all" }),
		source("beginner", { level: "beginner" }),
	],
	context,
);
assertEqual(
	levelRanking.map((item) => item.sourceId),
	["beginner", "all", "advanced"],
	"Source C learner level ranking",
);
assertEqual(mapLearnerLevel("Intermediate"), "intermediate", "Source C explicit level map");

const deterministicCandidates = [
	source("z", { title: "Z source", sourceType: "verified_tutorial" }),
	source("a", { title: "A source", sourceType: "official_documentation" }),
	source("m", { title: "M source", sourceType: "open_courseware" }),
];
const deterministicFirst = selectCuratedLearningSources(
	deterministicCandidates,
	context,
);
const deterministicSecond = selectCuratedLearningSources(
	deterministicCandidates,
	context,
);
assertEqual(deterministicFirst, deterministicSecond, "Source D deterministic ordering");

const maximumResults = selectCuratedLearningSources(
	Array.from({ length: 5 }, (_, index) => source(`maximum-${index}`)),
	context,
	3,
);
assertEqual(maximumResults.length, 3, "Source E maximum results");

const noMatch = selectCuratedLearningSources(
	[source("unrelated", { title: "Unrelated material", tags: ["biology"] })],
	context,
);
assertEqual(noMatch, [], "Source F no match");

const aiLessonBodyWithInventedResource = {
	summary: "A retained summary.",
	concepts: ["Concept one", "Concept two"],
	steps: ["Step one", "Step two"],
	exercises: ["Exercise one"],
	resources: [
		{
			title: "Invented AI resource",
			provider: "Invented AI provider",
			url: "https://invented.example.invalid",
		},
	],
};
const authoritativeResource = source("authoritative", {
	title: "Database source snapshot",
	provider: "Database provider snapshot",
	sourceType: "official_documentation",
	level: "beginner",
});
const attachedLesson = buildCuratedLessonContent({
	lessonBody: aiLessonBodyWithInventedResource,
	resources: selectCuratedLearningSources([authoritativeResource], context),
});
assertEqual(
	attachedLesson.resources.map(({ sourceId, title, provider, url }) => ({
		sourceId,
		title,
		provider,
		url,
	})),
	[
		{
			sourceId: authoritativeResource.id,
			title: authoritativeResource.title,
			provider: authoritativeResource.provider,
			url: authoritativeResource.url,
		},
	],
	"Source G AI resource fields ignored",
);

assertEqual(
	{
		summary: attachedLesson.summary,
		concepts: attachedLesson.concepts,
		steps: attachedLesson.steps,
		exercises: attachedLesson.exercises,
	},
	{
		summary: aiLessonBodyWithInventedResource.summary,
		concepts: aiLessonBodyWithInventedResource.concepts,
		steps: aiLessonBodyWithInventedResource.steps,
		exercises: aiLessonBodyWithInventedResource.exercises,
	},
	"Source H legacy body preservation",
);

const emptyCatalogLesson = buildCuratedLessonContent({
	lessonBody: aiLessonBodyWithInventedResource,
	resources: [],
});
assertEqual(emptyCatalogLesson.resources, [], "Source I empty catalog");
assertEqual(emptyCatalogLesson.summary, "A retained summary.", "Source I lesson usable");

const recalibratedNodeSources = selectCuratedLearningSources(
	[source("replacement", { tags: ["prerequisite", "generics"] })],
	{
		...context,
		nodeTitle: "Guided prerequisite for generics",
	},
);
assertEqual(
	recalibratedNodeSources.map((item) => item.sourceId),
	["replacement"],
	"Source J replacement node normal path",
);

console.log("Curated learning source checks passed (Sources A-J).");
