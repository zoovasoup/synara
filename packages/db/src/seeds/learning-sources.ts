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

const verifiedAt = new Date("2026-08-13T04:00:00.000Z");

export const curatedLearningSources: CuratedLearningSourceSeed[] = [
	{
		title: "Explore design files",
		provider: "Figma",
		url: "https://help.figma.com/hc/en-us/articles/15297425105303-Explore-design-files",
		sourceType: "official_documentation",
		level: "beginner",
		tags: ["figma", "ui", "ux", "interface", "frames", "layers", "components"],
		description: "Introduces the fundamentals of working with Figma Design files, including frames, layers, components, and basic design-file navigation.",
		verifiedAt,
	},
	{
		title: "Guide to text in Figma Design",
		provider: "Figma",
		url: "https://help.figma.com/hc/en-us/articles/360039956434-Guide-to-text-in-Figma-Design",
		sourceType: "official_documentation",
		level: "beginner",
		tags: ["figma", "ui", "typography", "text", "font", "line height", "interface"],
		description: "Explains how to create, edit, and style text in Figma Design, including typography and text-layer properties.",
		verifiedAt,
	},
	{
		title: "Guide to auto layout",
		provider: "Figma",
		url: "https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout",
		sourceType: "official_documentation",
		level: "intermediate",
		tags: ["figma", "ui", "auto layout", "layout", "spacing", "padding", "responsive", "interface"],
		description: "Explains Figma Auto Layout concepts including direction, spacing, padding, alignment, resizing, and responsive interface composition.",
		verifiedAt,
	},
	{
		title: "Guide to prototyping in Figma",
		provider: "Figma",
		url: "https://help.figma.com/hc/en-us/articles/360040314193-Guide-to-prototyping-in-Figma",
		sourceType: "official_documentation",
		level: "beginner",
		tags: ["figma", "ui", "ux", "prototype", "prototyping", "user flow", "interaction", "interface"],
		description: "Introduces interactive prototypes, flows, navigation, and testing interactions in Figma.",
		verifiedAt,
	},
	{
		title: "Learn web development",
		provider: "MDN Web Docs",
		url: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
		sourceType: "verified_tutorial",
		level: "beginner",
		tags: ["web", "frontend", "html", "css", "javascript", "accessibility", "responsive"],
		description: "A structured MDN learning path covering essential front-end development skills, practices, and web-platform foundations.",
		verifiedAt,
	},
	{
		title: "Dynamic scripting with JavaScript",
		provider: "MDN Web Docs",
		url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting",
		sourceType: "verified_tutorial",
		level: "beginner",
		tags: ["javascript", "web", "frontend", "scripting", "functions", "objects", "events"],
		description: "Covers core JavaScript language concepts and browser scripting fundamentals for web development.",
		verifiedAt,
	},
	{
		title: "Quick Start",
		provider: "React",
		url: "https://react.dev/learn",
		sourceType: "official_documentation",
		level: "beginner",
		tags: ["react", "jsx", "component", "components", "props", "state", "frontend"],
		description: "Introduces the core React concepts used in everyday applications, including components, JSX, data rendering, events, and state.",
		verifiedAt,
	},
	{
		title: "The TypeScript Handbook",
		provider: "TypeScript",
		url: "https://www.typescriptlang.org/docs/handbook/intro.html",
		sourceType: "official_documentation",
		level: "intermediate",
		tags: ["typescript", "types", "typing", "generics", "functions", "classes", "modules"],
		description: "A comprehensive guide to commonly used TypeScript syntax, type-system concepts, functions, objects, classes, and modules.",
		verifiedAt,
	},
	{
		title: "Getting Started",
		provider: "Next.js",
		url: "https://nextjs.org/docs/app/getting-started",
		sourceType: "official_documentation",
		level: "intermediate",
		tags: ["next.js", "nextjs", "react", "app router", "routing", "server components", "fullstack"],
		description: "Introduces the core concepts required to build applications with the Next.js App Router.",
		verifiedAt,
	},
	{
		title: "Introduction to Node.js",
		provider: "Node.js",
		url: "https://nodejs.org/learn",
		sourceType: "official_documentation",
		level: "beginner",
		tags: ["node.js", "nodejs", "javascript", "backend", "server", "runtime", "http"],
		description: "Introduces Node.js as a JavaScript runtime and explains foundational server-side and asynchronous execution concepts.",
		verifiedAt,
	},
	{
		title: "Installing Express",
		provider: "Express",
		url: "https://expressjs.com/en/5x/starter/installing/",
		sourceType: "official_documentation",
		level: "beginner",
		tags: ["express", "express.js", "node.js", "nodejs", "backend", "server", "api"],
		description: "Introduces the setup required to create a Node.js project using Express 5 and begin developing server applications.",
		verifiedAt,
	},
	{
		title: "Pro Git",
		provider: "Git",
		url: "https://git-scm.com/book/en/v2",
		sourceType: "verified_tutorial",
		level: "all",
		tags: ["git", "version control", "repository", "commit", "branch", "branching", "merge"],
		description: "Provides a structured guide to Git fundamentals, repositories, commits, remotes, branching, merging, and collaborative version-control workflows.",
		verifiedAt,
	},
	{
		title: "PostgreSQL Tutorial",
		provider: "PostgreSQL",
		url: "https://www.postgresql.org/docs/current/tutorial.html",
		sourceType: "official_documentation",
		level: "beginner",
		tags: ["postgresql", "postgres", "sql", "database", "relational", "query", "joins", "transactions"],
		description: "Introduces PostgreSQL, relational database concepts, SQL queries, joins, aggregate functions, foreign keys, and transactions.",
		verifiedAt,
	},
	{
		title: "Prisma ORM",
		provider: "Prisma",
		url: "https://www.prisma.io/docs/orm",
		sourceType: "official_documentation",
		level: "intermediate",
		tags: ["prisma", "orm", "database", "typescript", "schema", "migration", "query"],
		description: "Introduces Prisma ORM, its type-safe database client, schema model, migrations, and database-access workflow for Node.js and TypeScript.",
		verifiedAt,
	},
	{
		title: "Python For Beginners",
		provider: "Python.org",
		url: "https://www.python.org/about/gettingstarted/",
		sourceType: "official_documentation",
		level: "beginner",
		tags: ["python", "programming", "syntax", "functions", "variables", "loops"],
		description: "Provides an official starting point for learners who are beginning Python programming.",
		verifiedAt,
	},
	{
		title: "Getting started",
		provider: "pandas",
		url: "https://pandas.pydata.org/getting_started.html",
		sourceType: "official_documentation",
		level: "beginner",
		tags: ["pandas", "python", "data analysis", "dataframe", "tabular", "dataset"],
		description: "Provides the official starting point for learning pandas and working with tabular data in Python.",
		verifiedAt,
	},
	{
		title: "Introduction",
		provider: "Docker",
		url: "https://docs.docker.com/get-started/introduction/",
		sourceType: "verified_tutorial",
		level: "beginner",
		tags: ["docker", "container", "containers", "containerization", "image", "deployment", "devops"],
		description: "A beginner learning path covering containerization fundamentals, running containers, building images, and publishing images.",
		verifiedAt,
	},
	{
		title: "Get started with Google Cloud",
		provider: "Google Cloud",
		url: "https://docs.cloud.google.com/docs/get-started",
		sourceType: "official_documentation",
		level: "beginner",
		tags: ["google cloud", "gcp", "cloud", "devops", "deployment", "iam", "cloud infrastructure"],
		description: "Introduces Google Cloud setup and foundational workflows for application development, DevOps, administration, and data analysis.",
		verifiedAt,
	},
	{
		title: "Introduction to the Microsoft Cloud Adoption Framework",
		provider: "Microsoft Learn",
		url: "https://learn.microsoft.com/en-us/training/modules/cloud-adoption-framework/",
		sourceType: "verified_tutorial",
		level: "beginner",
		tags: ["azure", "cloud", "cloud adoption", "cloud-native", "infrastructure", "deployment"],
		description: "Introduces the Microsoft Cloud Adoption Framework and foundational concepts for planning and adopting cloud environments.",
		verifiedAt,
	},
	{
		title: "Introduction to Computer Science and Programming in Python",
		provider: "MIT OpenCourseWare",
		url: "https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/",
		sourceType: "open_courseware",
		level: "beginner",
		tags: ["python", "programming", "computer science", "computation", "algorithms", "problem solving"],
		description: "An introductory MIT course for learners with little or no programming experience, using Python to teach computation and problem solving.",
		verifiedAt,
	},
	{
		title: "CS50's Introduction to Computer Science",
		provider: "Harvard University",
		url: "https://cs50.harvard.edu/x/",
		sourceType: "open_courseware",
		level: "beginner",
		tags: ["computer science", "programming", "algorithms", "data structures", "python", "sql", "html", "css", "javascript"],
		description: "Harvard's introductory computer science course covering computational thinking, algorithms, data structures, programming, SQL, and web development.",
		verifiedAt,
	},
	{
		title: "Database Systems",
		provider: "MIT OpenCourseWare",
		url: "https://ocw.mit.edu/courses/6-5830-database-systems-fall-2023/",
		sourceType: "open_courseware",
		level: "advanced",
		tags: ["database", "dbms", "relational", "normalization", "query optimization", "transactions", "database systems"],
		description: "An MIT course covering relational data models, normalization, query optimization, transactions, and database-system foundations.",
		verifiedAt,
	},
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
