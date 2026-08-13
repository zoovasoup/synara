import {
	curatedLearningSourceSeedSchema,
	curatedLearningSources,
} from "@gemastik/db/seeds/learning-sources";

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

function assert(condition: boolean, label: string) {
	if (!condition) throw new Error(label);
}

const corpusCandidates: LearningSourceCandidate[] = curatedLearningSources.map(
	(seed, index) => ({
		id: `corpus-${index + 1}`,
		...curatedLearningSourceSeedSchema.parse(seed),
		isVerified: true,
		isActive: true,
	}),
);

assertEqual(corpusCandidates.length, 22, "Corpus contains 22 sources");
assertEqual(
	new Set(corpusCandidates.map(({ url }) => url)).size,
	22,
	"Corpus URLs are unique",
);

function matchCorpus(
	topic: string,
	nodeTitle: string,
	learnerLevel = "Beginner",
	goalDescription?: string,
) {
	return selectCuratedLearningSources(corpusCandidates, {
		topic,
		nodeTitle,
		learnerLevel,
		goalDescription,
	});
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

const figmaMatches = matchCorpus(
	"UI/UX for Mobile Design",
	"Figma Interface & Basic Geometry",
	"Beginner",
	"Build a practical mobile UI/UX project",
);
assertEqual(figmaMatches[0]?.provider, "Figma", "Corpus UI/UX Figma ranking");
assert(
	figmaMatches.some(({ provider }) => provider === "Figma"),
	"Corpus UI/UX should include a Figma source",
);

const typographyMatches = matchCorpus(
	"UI/UX for Mobile Design",
	"Mobile Typography and Spacing",
);
assert(
	typographyMatches.some(({ title }) =>
		["Guide to text in Figma Design", "Guide to auto layout"].includes(title),
	),
	"Corpus typography/spacing should include Figma text or Auto Layout",
);

assertEqual(
	matchCorpus("React frontend", "React components, props, and state")[0]?.provider,
	"React",
	"Corpus React ranking",
);
assertEqual(
	matchCorpus("TypeScript", "TypeScript types and generics", "Intermediate")[0]?.provider,
	"TypeScript",
	"Corpus TypeScript ranking",
);

const backendMatches = matchCorpus(
	"Backend JavaScript",
	"Build a Node.js API with Express",
);
assert(
	backendMatches.some(({ provider }) =>
		["Node.js", "Express"].includes(provider),
	),
	"Corpus backend matching should include Node.js or Express",
);

assertEqual(
	matchCorpus(
		"PostgreSQL relational database",
		"SQL queries, joins, and transactions",
	)[0]?.provider,
	"PostgreSQL",
	"Corpus PostgreSQL ranking",
);
assert(
	matchCorpus(
		"TypeScript database",
		"Prisma ORM schema and migrations",
		"Intermediate",
	).some(({ provider }) => provider === "Prisma"),
	"Corpus ORM/schema matching should include Prisma",
);

assert(
	matchCorpus("Python programming", "Python syntax, variables, and loops").some(
		({ provider }) =>
			provider === "Python.org" || provider === "MIT OpenCourseWare",
	),
	"Corpus Python beginner matching",
);
assertEqual(
	matchCorpus("Python data analysis", "Analyze tabular data with pandas")[0]
		?.provider,
	"pandas",
	"Corpus pandas ranking",
);
assertEqual(
	matchCorpus("Containerization", "Build and run Docker containers")[0]
		?.provider,
	"Docker",
	"Corpus Docker ranking",
);
assertEqual(
	matchCorpus("GCP", "Deploy an application to Google Cloud")[0]?.provider,
	"Google Cloud",
	"Corpus Google Cloud ranking",
);
assertEqual(
	matchCorpus("Azure cloud", "Plan an Azure cloud environment")[0]?.provider,
	"Microsoft Learn",
	"Corpus Azure ranking",
);

const algorithmsMatches = matchCorpus(
	"Computer science",
	"Algorithms and data structures",
);
assert(
	algorithmsMatches.some(({ provider }) =>
		["Harvard University", "MIT OpenCourseWare"].includes(provider),
	),
	"Corpus algorithms/data-structures matching",
);
assertEqual(
	matchCorpus("Medieval manuscripts", "Watercolor pigment conservation"),
	[],
	"Corpus unrelated topic remains a zero match",
);

console.log(
	"Curated learning source checks passed (Sources A-J and 13 corpus scenarios).",
);
