import { aiService } from "./ai.service";

export interface RecalibrateInput {
	goal: string;
	problematicNode: {
		title: string;
		difficultyLevel: number;
		successCriteria: string[];
	};
	learnerLevel?: string;
	completedNodeTitles: string[];
	recentSocraticMessages: {
		role: "user" | "assistant";
		content: string;
	}[];
	triggerReasons: string[];
	interventionLevel: string;
	behavioralSummary: {
		socraticFailureCount: number;
		repeatedExcessiveTimeRatio: boolean;
		highEffort: boolean;
		tutorHeavy: boolean;
		backtracking: boolean;
	};
}

export const roadmapService = {
	async generateInitialRoadmap(goal: string) {
		const systemInstruction = `
      You are the Gradio Engine, a Senior Pedagogical Architect specialized in Micro-Curriculum Synthesis. 
      Your mission is to decompose a complex learning goal into an atomic, verifiable roadmap.

      OUTPUT FORMAT:
      - Respond ONLY with a valid JSON object. No markdown, no conversational text.
      - The root object must have a single key "nodes" which is an array of objects.

      NODE SCHEMA:
      - title: Concise, action-oriented (e.g., "Containerizing Next.js").
      - difficulty_level: Integer 1-10 based on conceptual load.
      - estimated_time: Total minutes to complete.
      - content_type: Choose from [video, reading, hands-on, socratic].
      - success_criteria: Array of 2-3 specific, BINARY indicators. 
        - For 'hands-on': Must be verifiable via command output or file existence (e.g., "Dockerfile exists in root", "docker ps shows running container").
        - For 'socratic': Must focus on teaching-back/explanation of 'why' over 'what' (e.g., "User explains the security risk of root containers").

      PEDAGOGICAL CONSTRAINTS:
      - No redundant nodes.
      - Logical progression from foundational to complex.
      - Maximum 5 nodes per batch.
      - Ensure 'success_criteria' are objective enough for an automated agent to verify.
    
      Example structure:
      {
        "nodes": [
          {
            "title": "...",
            "difficulty_level": 5,
            "estimated_time": 30,
            "content_type": "video",
            "success_criteria": ["..."]
          }
        ]
      } 
      `;

		const prompt = `User Goal: "${goal}"`;

		try {
			const roadmap = await aiService.generateStructuredOutput(
				prompt,
				systemInstruction,
			);
			return roadmap;
		} catch (error) {
			console.error("ROADMAP_GENERATION_FAILED:", error);
			throw error;
		}
	},

	async recalibrateRoadmap({
		goal,
		problematicNode,
		learnerLevel,
		completedNodeTitles,
		recentSocraticMessages,
		triggerReasons,
		interventionLevel,
		behavioralSummary,
	}: RecalibrateInput) {
		const systemInstruction = [
			"You are Synara's adaptive curriculum engine.",
			"Generate a replacement path of 3-5 nodes for the unfinished portion of an existing linear roadmap.",
			"Preserve the learner's original goal and do not regenerate already completed material.",
			"Repair prerequisite gaps, reduce conceptual jumps, and prefer smaller guided steps around the problematic concept.",
			"Every success criterion must be explicit and testable.",
			"Respond ONLY with valid JSON and no markdown fences.",
			'Output schema: {"nodes":[{"title":"string","difficulty_level":1,"estimated_time":20,"content_type":"video|reading|hands-on|socratic","success_criteria":["string"]}]}',
		].join(" ");

		const prompt = JSON.stringify({
			originalLearningGoal: goal,
			learnerLevel: learnerLevel ?? "Not provided",
			problematicNode,
			completedNodeTitles,
			recentSocraticMessages,
			stagnation: {
				triggerReasons,
				interventionLevel,
				behavioralSummary,
			},
		});

		return await aiService.generateStructuredOutput(
			prompt,
			systemInstruction,
		);
	},
};
