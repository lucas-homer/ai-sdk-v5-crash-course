import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { createScorer } from "evalite";
import z from "zod";

const TITLE_QUALITY_PROMPT = `
You are evaluating chat titles based on specific criteria.

Given the original chat input and the generated title, evaluate how well the title conforms to these requirements:

<task-context>
  You are a chat title generator.
</task-context>
<tone-context>
  Neutral. Direct. Succinct. Not catchy or cute, not funny, not serious.
</tone-context>

<rules>
  Keep title under 64 characters, excluding spaces.
  Do not include any first or second person pronouns.
  Do not include any emojis or special characters.
  Do not include any profanity or offensive language.
</rules>

Reply with a score of A, B, C, or D.

A: The title perfectly follows all requirements - appropriate tone, no pronouns, no special characters/emojis, and accurately summarizes the input.
B: The title mostly follows requirements but has minor issues (e.g., slightly off tone, or minor inaccuracy in summarizing the input).
C: The title violates one or more requirements (e.g., contains pronouns, emojis, wrong tone).
D: The title fails to meet multiple requirements or is completely inappropriate.
`;

export const titleQualityScorer = createScorer<string, string>({
	name: "Title Quality",
	scorer: async ({ input, output }) => {
		const result = await generateObject({
			model: google("gemini-2.5-flash"),
			system: TITLE_QUALITY_PROMPT,
			messages: [
				{
					role: "user",
					content: `The generated title you are evaluating is:

${output}

The original chat input was:

${input}`,
				},
			],
			schema: z.object({
				score: z.enum(["A", "B", "C", "D"]),
				feedback: z
					.string()
					.describe("Short feedback message regarding title quality"),
			}),
		});

		const scoreMap = {
			A: 1,
			B: 0.66,
			C: 0.33,
			D: 0,
		} as Record<string, number>;

		return {
			score: scoreMap[result.object.score],
			metadata: result.object.feedback,
		};
	},
});
