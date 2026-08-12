import { z } from "zod";

import {
	LEARNING_SOURCE_LEVELS,
	LEARNING_SOURCE_TYPES,
	type CuratedLessonResource,
} from "./learning-source";

export const lessonBodySchema = z.object({
	summary: z.string().trim().min(1),
	concepts: z.array(z.string().trim().min(1)).min(2),
	steps: z.array(z.string().trim().min(1)).min(2),
	exercises: z.array(z.string().trim().min(1)).min(1),
});

export const curatedLessonResourceSchema = z.object({
	sourceId: z.string().trim().min(1),
	title: z.string().trim().min(1),
	provider: z.string().trim().min(1),
	url: z.url(),
	sourceType: z.enum(LEARNING_SOURCE_TYPES),
	level: z.enum(LEARNING_SOURCE_LEVELS),
	description: z.string().trim().min(1),
});

export const lessonContentSchema = lessonBodySchema.extend({
	resourceModelVersion: z.literal(1),
	resources: z.array(curatedLessonResourceSchema),
});

export type LessonBody = z.infer<typeof lessonBodySchema>;
export type LessonContent = z.infer<typeof lessonContentSchema>;

export function buildCuratedLessonContent({
	lessonBody,
	resources,
}: {
	lessonBody: unknown;
	resources: CuratedLessonResource[];
}): LessonContent {
	return lessonContentSchema.parse({
		...lessonBodySchema.parse(lessonBody),
		resourceModelVersion: 1,
		resources,
	});
}
