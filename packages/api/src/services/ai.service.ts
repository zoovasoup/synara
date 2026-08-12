import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@gemastik/env/server";

export type AiMode = "gemini" | "mock";

type GeminiGenerate = (
	prompt: string,
	systemInstruction?: string,
) => Promise<string>;

type AiServiceOptions = {
	mode: AiMode;
	geminiApiKey?: string;
	geminiGenerate?: GeminiGenerate;
	logMode?: boolean;
};

const MODELS = [
	"gemini-3.1-flash-lite-preview",
	"gemini-2.5-flash-lite",
	"gemini-2.5-flash",
] as const;

type GeminiErrorCode =
	| "high_demand"
	| "rate_limited"
	| "model_not_found"
	| "invalid_api_key"
	| "bad_request"
	| "safety_blocked"
	| "invalid_json"
	| "unknown";

class GeminiServiceError extends Error {
	constructor(
		readonly code: GeminiErrorCode,
		message: string,
		readonly cause?: unknown,
	) {
		super(message);
		this.name = "GeminiServiceError";
	}
}

function getErrorMessage(error: unknown) {
	return error instanceof Error
		? error.message
		: String(error ?? "Unknown Gemini error");
}

function getCompactErrorDetails(error: unknown) {
	const message = getErrorMessage(error).replace(/\s+/g, " ").trim();
	return message.length > 240 ? message.slice(0, 240) + "..." : message;
}

function classifyGeminiError(error: unknown) {
	const message = getErrorMessage(error);

	if (
		message.includes("503") ||
		message.includes("Service Unavailable") ||
		message.includes("high demand")
	) {
		return new GeminiServiceError(
			"high_demand",
			"The AI service is busy. Wait briefly and try again.",
			error,
		);
	}

	if (
		message.includes("429") ||
		message.includes("RESOURCE_EXHAUSTED") ||
		message.includes("quota")
	) {
		return new GeminiServiceError(
			"rate_limited",
			"The AI service rate limit was reached. Wait briefly and try again.",
			error,
		);
	}

	if (message.includes("404") || message.includes("not found for API version")) {
		return new GeminiServiceError(
			"model_not_found",
			"The configured Gemini model is unavailable.",
			error,
		);
	}

	if (
		message.includes("API key not valid") ||
		message.includes("API_KEY_INVALID") ||
		message.includes("permission denied") ||
		message.includes("401")
	) {
		return new GeminiServiceError(
			"invalid_api_key",
			"The Gemini API configuration is invalid.",
			error,
		);
	}

	if (
		message.includes("SAFETY") ||
		message.includes("blocked") ||
		message.includes("RECITATION")
	) {
		return new GeminiServiceError(
			"safety_blocked",
			"The AI request was blocked. Revise the input and try again.",
			error,
		);
	}

	if (
		message.includes("400") ||
		message.includes("INVALID_ARGUMENT") ||
		message.includes("Bad Request")
	) {
		return new GeminiServiceError(
			"bad_request",
			"The AI request was invalid. Revise the input and try again.",
			error,
		);
	}

	return new GeminiServiceError(
		"unknown",
		"The Gemini request failed. Provider detail: " +
			getCompactErrorDetails(error),
		error,
	);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createGeminiGenerate(apiKey: string): GeminiGenerate {
	const client = new GoogleGenerativeAI(apiKey);

	return async (prompt, systemInstruction) => {
		let lastError: unknown;
		let delay = 2000;

		for (let attempt = 0; attempt < 3; attempt++) {
			const modelName = MODELS[attempt] ?? MODELS.at(-1)!;

			try {
				const model = client.getGenerativeModel({
					model: modelName,
					systemInstruction,
				});
				const result = await model.generateContent(prompt);
				const response = await result.response;
				return response.text().trim();
			} catch (error: unknown) {
				lastError = error;
				const classifiedError = classifyGeminiError(error);
				if (classifiedError.code === "high_demand" && attempt < 2) {
					console.warn(
						`[AI_RETRY] Attempt ${attempt + 1} failed. Retrying ${modelName} in ${delay}ms.`,
					);
					await sleep(delay);
					delay *= 2;
					continue;
				}
				break;
			}
		}

		throw lastError;
	};
}

function compactTopic(value: string) {
	const cleaned = value
		.replace(/^User Goal:\s*/i, "")
		.replace(/^['"]|['"]$/g, "")
		.replace(/\s+/g, " ")
		.trim();
	return cleaned.slice(0, 72) || "the learning goal";
}

function normalizeMockRecalibrationConcept(value: string) {
	let concept = compactTopic(value);
	let previous = "";

	while (concept !== previous) {
		previous = concept;
		concept = concept
			.replace(
				/\s*:\s*(?:prerequisite foundation|guided practice|applied practice|foundations)\s*$/i,
				"",
			)
			.replace(/^guided\s+(.+)\s+practice$/i, "$1")
			.replace(/^applying\s+(.+)$/i, "$1")
			.trim();
	}

	return concept.slice(0, 64) || "the challenging concept";
}

function extractLine(prompt: string, label: string) {
	const line = prompt
		.split("\n")
		.find((candidate) => candidate.toLowerCase().startsWith(label.toLowerCase()));
	return line?.slice(label.length).trim();
}

function createMockNodes(topic: string) {
	const focus = compactTopic(topic);
	return [
		{
			title: `${focus}: Foundations`,
			difficulty_level: 2,
			estimated_time: 20,
			content_type: "reading",
			success_criteria: [
				`Explain the core purpose of ${focus} in your own words`,
				`Identify two foundational ideas used in ${focus}`,
			],
		},
		{
			title: `${focus}: Core Concepts`,
			difficulty_level: 4,
			estimated_time: 25,
			content_type: "socratic",
			success_criteria: [
				`Compare the main concepts involved in ${focus}`,
				"Explain when each concept is useful",
			],
		},
		{
			title: `${focus}: Guided Practice`,
			difficulty_level: 5,
			estimated_time: 30,
			content_type: "hands-on",
			success_criteria: [
				`Complete one guided ${focus} exercise`,
				"Describe the reasoning behind each major step",
			],
		},
		{
			title: `${focus}: Applied Workflow`,
			difficulty_level: 6,
			estimated_time: 35,
			content_type: "hands-on",
			success_criteria: [
				`Build a small, complete example involving ${focus}`,
				"Check the result against explicit requirements",
			],
		},
		{
			title: `${focus}: Review and Validation`,
			difficulty_level: 7,
			estimated_time: 25,
			content_type: "socratic",
			success_criteria: [
				`Teach back the complete ${focus} workflow`,
				"Explain one tradeoff and one next improvement",
			],
		},
	];
}

function createMockStructuredOutput(prompt: string, systemInstruction = "") {
	if (systemInstruction.includes("Socratic Validator")) {
		let latestMessage = prompt;
		try {
			const history = JSON.parse(prompt) as { role?: string; content?: string }[];
			latestMessage = history.at(-1)?.content ?? prompt;
		} catch {
			// The deterministic fallback below still handles a plain-text prompt.
		}
		const passes = latestMessage.toLowerCase().includes("[mock-pass]");
		return {
			ai_response: passes
				? "Your explanation connects the idea to an application. You are ready to continue."
				: "Review the core idea, then explain why it works and give one concrete example.",
			competency_score: passes ? 88 : 55,
			stumble_count: passes ? 0 : 1,
			sentiment_score: 0.5,
		};
	}

	if (systemInstruction.includes("replacement path of 3-5 nodes")) {
		let problematicTitle = "the challenging concept";
		try {
			const context = JSON.parse(prompt) as {
				problematicNode?: { title?: string };
			};
			problematicTitle = context.problematicNode?.title ?? problematicTitle;
		} catch {
			// Keep the bounded fallback title.
		}
		const baseConcept = normalizeMockRecalibrationConcept(problematicTitle);
		return {
			nodes: [
				{
					title: `${baseConcept}: Foundations`,
					difficulty_level: 2,
					estimated_time: 15,
					content_type: "reading",
					success_criteria: ["Explain the prerequisite idea", "Identify the missing connection"],
				},
				{
					title: `Guided ${baseConcept} Practice`,
					difficulty_level: 3,
					estimated_time: 20,
					content_type: "hands-on",
					success_criteria: ["Complete the guided example", "Explain each step in the example"],
				},
				{
					title: `Applying ${baseConcept}`,
					difficulty_level: 4,
					estimated_time: 25,
					content_type: "socratic",
					success_criteria: ["Apply the concept to a new example", "Explain why the approach works"],
				},
			],
		};
	}

	if (systemInstruction.includes("senior learning designer")) {
		const nodeTitle = extractLine(prompt, "Node title:") ?? "Current learning step";
		return {
			summary: `This lesson builds a practical understanding of ${nodeTitle}.`,
			concepts: [
				`The purpose and vocabulary of ${nodeTitle}`,
				`How ${nodeTitle} connects to the wider learning goal`,
				`Common mistakes to avoid while applying ${nodeTitle}`,
			],
			steps: [
				`Describe ${nodeTitle} in plain language.`,
				`Work through one small example of ${nodeTitle}.`,
				`Check the example against the step's success criteria.`,
			],
			exercises: [
				`Create a short example that demonstrates ${nodeTitle}, then explain your decisions.`,
			],
		};
	}

	if (systemInstruction.includes("Micro-Curriculum Synthesis")) {
		return { nodes: createMockNodes(prompt) };
	}

	throw new Error("Mock AI received an unsupported structured-output request.");
}

function createMockText(prompt: string, systemInstruction = "") {
	const nodeTitle =
		systemInstruction.match(/active roadmap node is:\s*([^\n.]+)/i)?.[1]?.trim() ??
		"this step";
	const learnerQuestion =
		prompt
			.split("\n")
			.filter((line) => line.startsWith("Learner:"))
			.at(-1)
			?.slice("Learner:".length)
			.trim() ?? prompt.trim();

	return [
		`Let’s work through ${nodeTitle} using your question: “${learnerQuestion}”`,
		"Start by naming the part that feels unclear, then connect it to one concrete example.",
		"Try explaining that connection in one or two sentences, and I can help refine the reasoning.",
	].join("\n\n");
}

export function createAiService({
	mode,
	geminiApiKey,
	geminiGenerate,
	logMode = false,
}: AiServiceOptions) {
	let logged = false;
	let resolvedGeminiGenerate = geminiGenerate;

	const logModeOnce = () => {
		if (!logMode || logged) return;
		logged = true;
		console.info(`AI mode: ${mode}`);
	};

	const getGeminiGenerate = () => {
		if (resolvedGeminiGenerate) return resolvedGeminiGenerate;
		if (!geminiApiKey) {
			throw new GeminiServiceError(
				"invalid_api_key",
				"GEMINI_API_KEY is required when AI_MODE=gemini.",
			);
		}
		resolvedGeminiGenerate = createGeminiGenerate(geminiApiKey);
		return resolvedGeminiGenerate;
	};

	return {
		mode,

		async generateText(prompt: string, systemInstruction?: string) {
			logModeOnce();
			if (mode === "mock") {
				return createMockText(prompt, systemInstruction);
			}

			try {
				return await getGeminiGenerate()(prompt, systemInstruction);
			} catch (error: unknown) {
				const classifiedError = classifyGeminiError(error);
				console.error("AI_SERVICE_TEXT_ERROR:", classifiedError.message);
				throw classifiedError;
			}
		},

		async generateStructuredOutput(
			prompt: string,
			systemInstruction?: string,
		) {
			logModeOnce();
			if (mode === "mock") {
				return createMockStructuredOutput(prompt, systemInstruction);
			}

			try {
				const text = await getGeminiGenerate()(prompt, systemInstruction);
				const cleanJson = text.replace(/```json|```/g, "").trim();
				try {
					return JSON.parse(cleanJson) as unknown;
				} catch (parseError) {
					console.error("AI_JSON_PARSE_ERROR:", {
						responsePreview: text.slice(0, 1200),
					});
					throw new GeminiServiceError(
						"invalid_json",
						"Gemini returned invalid structured output. Try again.",
						parseError,
					);
				}
			} catch (error: unknown) {
				const classifiedError =
					error instanceof GeminiServiceError
						? error
						: classifyGeminiError(error);
				console.error(
					"AI_SERVICE_STRUCTURED_ERROR:",
					classifiedError.message,
				);
				throw classifiedError;
			}
		},
	};
}

export const aiService = createAiService({
	mode: env.AI_MODE,
	geminiApiKey: env.GEMINI_API_KEY,
	logMode: true,
});
