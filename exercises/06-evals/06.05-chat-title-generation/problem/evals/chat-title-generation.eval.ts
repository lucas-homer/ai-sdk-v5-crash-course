import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { evalite } from "evalite";
import { readFileSync } from "fs";
import Papa from "papaparse";
import path from "path";
import { titleQualityScorer } from "./title-quality-scorer.ts";

const csvFile = readFileSync(
	path.join(import.meta.dirname, "../../titles-dataset.csv"),
	"utf-8",
);

const data = Papa.parse<{ Input: string; Output: string }>(csvFile, {
	header: true,
	skipEmptyLines: true,
});

const EVAL_DATA_SIZE = 15;

const dataForEvalite = data.data.slice(0, EVAL_DATA_SIZE).map((row) => ({
	input: row.Input,
	expected: row.Output,
}));

evalite("Chat Title Generation", {
	data: () => dataForEvalite,
	task: async (input) => {
		const result = await generateText({
			model: google("gemini-2.5-flash-lite-preview-09-2025"),
			prompt: `
			<task-context>
        You are a chat title generator.
      </task-context>
      <tone-context>
        Neutral. Direct. Succinct. Not catchy or cute, not funny, not serious.
      </tone-context>


      <rules>
        Keep title under 64 characters, excluding spaces..
        Do not include any first or second person pronouns.
        Do not include any emojis or special characters.
        Do not include any profanity or offensive language.
      </rules>
      <input>
        ${input}
      </input>
      `,
		});

		return result.text;
	},
	scorers: [
		{
			name: "Character Length (excluding spaces)",
			scorer: (result) => {
				const lengthWithoutSpaces = result.output.replace(/\s/g, "").length;
				return {
					score: lengthWithoutSpaces <= 64 ? 1 : 0,
					message: `Length without spaces: ${lengthWithoutSpaces}/64 characters`,
				};
			},
		},
		titleQualityScorer,
	],
});
