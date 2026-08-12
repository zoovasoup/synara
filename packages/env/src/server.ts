import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tarik 3 level ke atas: src -> env -> packages -> root
config({ path: join(__dirname, "../../../.env") });

const serverEnvShape = {
	DATABASE_URL: z.string().min(1),
	AI_MODE: z.enum(["gemini", "mock"]).default("gemini"),
	GEMINI_API_KEY: z.string().optional(),
	BETTER_AUTH_SECRET: z.string().min(32),
	BETTER_AUTH_URL: z.url(),
	CORS_ORIGIN: z.url(),
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
};

export const serverEnvSchema = z
	.object(serverEnvShape)
	.superRefine((value, ctx) => {
		if (
			value.AI_MODE === "gemini" &&
			!value.GEMINI_API_KEY?.trim()
		) {
			ctx.addIssue({
				code: "custom",
				path: ["GEMINI_API_KEY"],
				message: "GEMINI_API_KEY is required when AI_MODE=gemini.",
			});
		}
	});

export const env = createEnv({
	server: serverEnvShape,
	createFinalSchema: () => serverEnvSchema,
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
