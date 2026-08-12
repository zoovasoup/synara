import { z } from "zod";
import { serverEnvSchema } from "@gemastik/env/server";

import { lessonBodySchema } from "../src/domain/lesson-content";
import { calculateStagnationScore } from "../src/domain/stagnation-score";
import { createAiService } from "../src/services/ai.service";

function assertEqual<T>(actual: T, expected: T, label: string) {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(
			`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
		);
	}
}

const baseEnv = {
	DATABASE_URL: "postgresql://user:password@localhost:5432/synara",
	BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
	BETTER_AUTH_URL: "http://localhost:3001",
	CORS_ORIGIN: "http://localhost:3001",
	NODE_ENV: "test" as const,
};
assertEqual(
	serverEnvSchema.safeParse({ ...baseEnv, AI_MODE: "mock" }).success,
	true,
	"AI env mock mode without Gemini key",
);
assertEqual(
	serverEnvSchema.safeParse({ ...baseEnv, AI_MODE: "gemini" }).success,
	false,
	"AI env Gemini mode requires key",
);
const defaultModeEnv = serverEnvSchema.parse({
	...baseEnv,
	GEMINI_API_KEY: "test-key",
});
assertEqual(defaultModeEnv.AI_MODE, "gemini", "AI env safe default");

const generatedNodeSchema = z.object({
	title: z.string().trim().min(1),
	difficulty_level: z.number().int().min(1).max(10),
	estimated_time: z.number().int().positive(),
	content_type: z.enum(["video", "reading", "hands-on", "socratic"]),
	success_criteria: z.array(z.string().trim().min(1)).min(1),
});
const roadmapSchema = z.object({
	nodes: z.array(generatedNodeSchema).min(1).max(5),
});
const recalibrationSchema = z.object({
	nodes: z.array(generatedNodeSchema).min(3).max(5),
});
const validationSchema = z.object({
	ai_response: z.string().min(1),
	competency_score: z.number().min(0).max(100),
	stumble_count: z.number().int().min(0).max(1),
	sentiment_score: z.number().min(0).max(1),
});

let geminiCallCount = 0;
const mockAi = createAiService({
	mode: "mock",
	geminiGenerate: async () => {
		geminiCallCount += 1;
		throw new Error("Gemini must not run in mock mode.");
	},
});

const roadmap = roadmapSchema.parse(
	await mockAi.generateStructuredOutput(
		'User Goal: "Learn accessible interface design"',
		"You specialize in Micro-Curriculum Synthesis.",
	),
);
assertEqual(roadmap.nodes.length, 5, "AI A roadmap node count");
assertEqual(
	roadmap.nodes[0]?.title.includes("accessible interface design"),
	true,
	"AI A roadmap goal context",
);

const lesson = lessonBodySchema.parse(
	await mockAi.generateStructuredOutput(
		"Goal: Learn interface design\nNode title: Typography and Spacing",
		"You are a senior learning designer creating a compact lesson.",
	),
);
assertEqual(
	lesson.summary.includes("Typography and Spacing"),
	true,
	"AI B lesson node context",
);
assertEqual("resources" in lesson, false, "AI B lesson excludes resources");

const tutorPrompt = "Learner: How do I choose a readable type scale?";
const tutorInstruction =
	"The active roadmap node is: Typography and Spacing. Do not grade the learner.";
const tutorAnswer = await mockAi.generateText(tutorPrompt, tutorInstruction);
const repeatedTutorAnswer = await mockAi.generateText(
	tutorPrompt,
	tutorInstruction,
);
assertEqual(tutorAnswer, repeatedTutorAnswer, "AI C deterministic Tutor");
assertEqual(
	tutorAnswer.includes("Typography and Spacing"),
	true,
	"AI C Tutor node context",
);
assertEqual(
	/score|grade|mastered/i.test(tutorAnswer),
	false,
	"AI C Tutor remains non-evaluative",
);

const validationInstruction = "You are the Socratic Validator for Synara.";
const passingValidation = validationSchema.parse(
	await mockAi.generateStructuredOutput(
		JSON.stringify([
			{ role: "user", content: "Here is my explanation. [mock-pass]" },
		]),
		validationInstruction,
	),
);
assertEqual(
	passingValidation.competency_score >= 80,
	true,
	"AI D mock pass",
);

const failedValidations = await Promise.all(
	[1, 2].map(async (attempt) =>
		validationSchema.parse(
			await mockAi.generateStructuredOutput(
				JSON.stringify([
					{
						role: "user",
						content: `Attempt ${attempt}. [mock-fail]`,
					},
				]),
				validationInstruction,
			),
		),
	),
);
assertEqual(
	failedValidations.every((attempt) => attempt.competency_score < 80),
	true,
	"AI E mock fail",
);
const failureCount = failedValidations.filter(
	(attempt) => attempt.competency_score < 80,
).length;
const stagnation = calculateStagnationScore({
	socraticFailureCount: failureCount,
	timeRatios: [],
	tutorTurnCount: 0,
	backtrackCount: 0,
	effortScore: 5,
});
assertEqual(
	stagnation.hardTriggers.repeatedSocraticFailure,
	true,
	"AI F existing repeated-failure trigger",
);

const recalibration = recalibrationSchema.parse(
	await mockAi.generateStructuredOutput(
		JSON.stringify({
			originalLearningGoal: "Learn accessible interface design",
			problematicNode: { title: "Typography and Spacing" },
		}),
		"Generate a replacement path of 3-5 nodes for the unfinished portion.",
	),
);
assertEqual(recalibration.nodes.length, 3, "AI G replacement node count");
assertEqual(
	recalibration.nodes.every((node) =>
		node.title.includes("Typography and Spacing"),
	),
	true,
	"AI G replacement problem context",
);

assertEqual(geminiCallCount, 0, "AI H Gemini provider isolation");

console.log("AI mock checks passed (AI A-H).")
