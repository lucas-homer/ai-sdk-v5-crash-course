import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText } from "ai";
import { evalite } from "evalite";

evalite("Capitals", {
	data: () => [
		{
			input: "What is the capital of France?",
			expected: "Paris",
		},
		{
			input: "What is the capital of Germany?",
			expected: "Berlin",
		},
		{
			input: "What is the capital of Italy?",
			expected: "Rome",
		},
	],
	task: async (input) => {
		const capitalResult = await streamText({
			model: google("gemini-2.5-flash-lite"),
			prompt: `
      You are an AI assistant that finds the capital of a country.
      ${input}
      Respond with the name of the capital.
      `,
		});

		return capitalResult.text;
	},
	scorers: [
		{
			name: "includes",
			scorer: ({ input, output, expected }) => {
				return output.includes(expected!) ? 1 : 0;
			},
		},
	],
});
