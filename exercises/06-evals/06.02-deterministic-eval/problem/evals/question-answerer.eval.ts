import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { evalite } from "evalite";

const links = [
	{
		title: "TypeScript 5.8",
		url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html",
	},
	{
		title: "TypeScript 5.7",
		url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html",
	},
	{
		title: "TypeScript 5.6",
		url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html",
	},
	{
		title: "TypeScript 5.5",
		url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html",
	},
	{
		title: "TypeScript 5.4",
		url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html",
	},
	{
		title: "TypeScript 5.3",
		url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-3.html",
	},
	{
		title: "TypeScript 5.2",
		url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html",
	},
	{
		title: "TypeScript 5.1",
		url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-1.html",
	},
	{
		title: "TypeScript 5.0",
		url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html",
	},
];

evalite("TS Release Notes", {
	data: () => [
		{
			input: "Tell me about the TypeScript 5.8 release",
		},
		{
			input: "Tell me about the TypeScript 5.2 release",
		},
	],
	task: async (input) => {
		const capitalResult = await generateText({
			model: google("gemini-2.5-flash-lite"),
			prompt: `
        You are a helpful assistant that can answer questions about TypeScript releases.

        <question>
        ${input}
        </question>

        <links>
        ${links.map((link) => `${link.title}: ${link.url}`).join("\n")}
        </links>

        <response>
        Provide a succinct answer (under 500 characters) that includes relevant markdown links from the list above.
        Format links as: [Link Text](URL)
        </response>
      `,
		});

		return capitalResult.text;
	},
	scorers: [
		{
			name: "Includes Markdown Links",
			scorer: ({ input, output, expected }) => {
				// Check if the output includes markdown links using regex
				// Markdown link format: [text](url)
				const markdownLinkRegex = /\[.+?\]\(.+?\)/;
				return markdownLinkRegex.test(output) ? 1 : 0;
			},
		},
		{
			name: "Output length",
			scorer: ({ input, output, expected }) => {
				// Check if the output is less than 500 characters
				return output.length < 500 ? 1 : 0;
			},
		},
	],
});
