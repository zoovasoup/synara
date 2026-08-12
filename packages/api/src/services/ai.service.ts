import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@gemastik/env/server";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// --- SCRIPT CEK MODEL (Muncul di CMD pas bun dev) ---
// const checkModels = async () => {
// 	try {
// 		// Kita tembak langsung endpoint REST-nya Google
// 		const response = await fetch(
// 			`https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`,
// 		);
// 		const data = (await response.json()) as { models: { name: string }[] };

// 		if (data.models) {
// 			console.log("\n🚀 [AI_SERVICE] MODEL YANG TERSEDIA BUAT API KEY LO:");
// 			data.models.forEach((m) => {
// 				// Nama aslinya biasanya: 'models/gemini-1.5-flash'
// 				console.log(`- ${m.name}`);
// 			});
// 			console.log("------------------------------------------\n");
// 		} else {
// 			console.log("⚠️ Response Google aneh, cek API Key lo bener apa nggak.");
// 		}
// 	} catch (err) {
// 		console.error("❌ Gagal narik list model:", err);
// 	}
// };

// void checkModels();
// --------------------------------------------------

// Helper buat nunggu (delay)
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * List model dari yang paling diprioritaskan.
 * Kalau 2.5 Flash tumbang (503), kita retry model yang sama dengan backoff.
 * Fallback model sebelumnya sudah tidak tersedia di API v1beta dan bikin 404.
 */
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
	if (error instanceof Error) {
		return error.message;
	}

	return String(error ?? "Unknown Gemini error");
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
			"Server AI sedang penuh (High Demand). Silakan tunggu 10 detik lalu coba lagi.",
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
			"Kuota atau rate limit Gemini tercapai. Tunggu sebentar lalu coba lagi.",
			error,
		);
	}

	if (
		message.includes("404") ||
		message.includes("not found for API version")
	) {
		return new GeminiServiceError(
			"model_not_found",
			"Model Gemini yang dikonfigurasi tidak tersedia untuk API ini. Periksa nama model fallback di server.",
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
			"GEMINI_API_KEY tidak valid atau tidak punya akses ke model yang dipakai.",
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
			"Permintaan ke Gemini diblokir oleh safety filter. Coba ubah pertanyaan atau kurangi isi prompt yang sensitif.",
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
			"Request ke Gemini tidak valid. Biasanya karena prompt terlalu besar atau format input tidak didukung.",
			error,
		);
	}

	return new GeminiServiceError(
		"unknown",
		"Terjadi kegagalan saat menghubungi Gemini. Detail provider: " +
			getCompactErrorDetails(error),
		error,
	);
}

async function callGeminiWithRetry(
	prompt: string,
	systemInstruction?: string,
	retries = 3,
): Promise<string> {
	let lastError: any;
	let delay = 2000; // Mulai dengan 2 detik

	for (let i = 0; i < retries; i++) {
		// Retry model yang sama dengan exponential backoff saat service sedang sibuk.
		const modelName = i === 0 ? MODELS[0] : MODELS[1];

		try {
			const model = genAI.getGenerativeModel({
				model: modelName,
				systemInstruction,
			});

			const result = await model.generateContent(prompt);
			const response = await result.response;
			return response.text().trim();
		} catch (error: any) {
			lastError = error;
			const classifiedError = classifyGeminiError(error);
			const is503 = classifiedError.code === "high_demand";

			if (is503 && i < retries - 1) {
				console.warn(
					`[AI_RETRY] Attempt ${i + 1} failed (503). Retrying with ${modelName} in ${delay}ms...`,
				);
				await sleep(delay);
				delay *= 2; // Naik jadi 4s, lalu 8s
				continue;
			}

			// Jika bukan error 503 atau retry habis, langsung lempar ke catch luar
			break;
		}
	}

	throw lastError;
}

export const aiService = {
	async generateText(prompt: string, systemInstruction?: string) {
		try {
			return await callGeminiWithRetry(prompt, systemInstruction);
		} catch (error: unknown) {
			const classifiedError = classifyGeminiError(error);
			console.error(
				"AI_SERVICE_TEXT_ERROR:",
				classifiedError.message,
				classifiedError.cause ?? error,
			);
			throw classifiedError;
		}
	},

	async generateStructuredOutput(prompt: string, systemInstruction?: string) {
		try {
			const text = await callGeminiWithRetry(prompt, systemInstruction);

			// Logic buat bersihin markdown backticks
			const cleanJson = text.replace(/```json|```/g, "").trim();

			// Parsing dengan try-catch internal biar kalau AI ngaco nggak langsung crash
			try {
				return JSON.parse(cleanJson);
			} catch (parseError) {
				console.error("AI_JSON_PARSE_ERROR:", {
					responsePreview: text.slice(0, 1200),
					parseError,
				});
				throw new GeminiServiceError(
					"invalid_json",
					"Gemini mengembalikan format yang bukan JSON valid. Coba ulangi request atau perketat prompt/output schema.",
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
				classifiedError.cause ?? error,
			);
			throw classifiedError;
		}
	},
};
