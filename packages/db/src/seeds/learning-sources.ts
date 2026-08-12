import { z } from "zod";

import { learningSources } from "../schema/learning";

type Database = typeof import("../index").db;

const sourceUrlSchema = z
	.string()
	.trim()
	.url()
	.refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
		message: "Learning source URLs must use HTTP or HTTPS.",
	});

export const curatedLearningSourceSeedSchema = z.object({
	title: z.string().trim().min(1),
	provider: z.string().trim().min(1),
	url: sourceUrlSchema,
	sourceType: z.enum([
		"official_documentation",
		"open_courseware",
		"verified_tutorial",
	]),
	level: z.enum(["beginner", "intermediate", "advanced", "all"]),
	tags: z
		.array(z.string().trim().min(1))
		.min(1)
		.transform((tags) => [
			...new Set(tags.map((tag) => tag.toLowerCase().replace(/\s+/g, " "))),
		]),
	description: z.string().trim().min(1),
	verifiedAt: z.date(),
});

export type CuratedLearningSourceSeed = z.input<
	typeof curatedLearningSourceSeedSchema
>;

export const curatedLearningSources: CuratedLearningSourceSeed[] = [
	// Intentionally empty. Add only manually researched and verified sources here.
];

export async function seedCuratedLearningSources(database?: Database) {
	const sources = curatedLearningSources.map((source) =>
		curatedLearningSourceSeedSchema.parse(source),
	);

	if (sources.length === 0) {
		console.log("No curated learning sources configured; nothing to seed.");
		return { seededCount: 0 };
	}

	const databaseClient = database ?? (await import("../index")).db;

	await databaseClient.transaction(async (tx) => {
		for (const source of sources) {
			await tx
				.insert(learningSources)
				.values({
					id: crypto.randomUUID(),
					...source,
					isVerified: true,
					isActive: true,
				})
				.onConflictDoUpdate({
					target: learningSources.url,
					set: {
						title: source.title,
						provider: source.provider,
						sourceType: source.sourceType,
						level: source.level,
						tags: source.tags,
						description: source.description,
						isVerified: true,
						isActive: true,
						verifiedAt: source.verifiedAt,
						updatedAt: new Date(),
					},
				});
		}
	});

	console.log(`Seeded ${sources.length} curated learning source(s).`);
	return { seededCount: sources.length };
}

if (import.meta.main) {
	await seedCuratedLearningSources();
}
