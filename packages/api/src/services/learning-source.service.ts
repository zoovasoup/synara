import { and, eq } from "drizzle-orm";

import { learningSources } from "@gemastik/db/schema/learning";

import {
	selectCuratedLearningSources,
	type LearningSourceMatchContext,
} from "../domain/learning-source";

export async function matchCuratedLearningSources({
	db,
	context,
	limit = 3,
}: {
	db: typeof import("@gemastik/db").db;
	context: LearningSourceMatchContext;
	limit?: number;
}) {
	const candidates = await db.query.learningSources.findMany({
		where: and(
			eq(learningSources.isVerified, true),
			eq(learningSources.isActive, true),
		),
	});

	return selectCuratedLearningSources(candidates, context, limit);
}
