import { google } from "@ai-sdk/google";
import { tavily } from "@tavily/core";
import {
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	type ModelMessage,
	streamObject,
	streamText,
	type UIMessage,
	type UIMessageStreamWriter,
} from "ai";
import { z } from "zod";

export type MyMessage = UIMessage<
	unknown,
	{
		queries: string[];
		plan: string;
	}
>;

const generateQueriesForTavily = (modelMessages: ModelMessage[]) => {
	// TODO: Use streamObject to
	const PROMPT = `
    <task>generate a plan for the search,
    AND the queries to search the web for information.
    </task>
    <rules>
    The plan should identify the groups of information required
    to answer the question.
    The plan should list pieces of information that are required
    to answer the question, then consider how to break down the
    information into queries.
   Generate 3-5 queries that are relevant to the conversation history.
    </rules>

    <task-output>

    Reply as a JSON object with the following properties:
    - plan: A string describing the plan for the queries.
    - queries: An array of strings, each representing a query.
    </task-output>`;
	const queriesResult = streamObject({
		model: google("gemini-2.5-flash"),
		messages: modelMessages,
		system: PROMPT,
		schema: z.object({
			plan: z
				.string()
				.describe("A string describing the plan for the queries."),
			queries: z
				.array(z.string())
				.min(3)
				.max(5)
				.describe("An array of strings, each representing a query."),
		}),
	});

	return queriesResult;
};

const displayQueriesInFrontend = async (
	queriesResult: ReturnType<typeof generateQueriesForTavily>,
	writer: UIMessageStreamWriter<MyMessage>,
) => {
	const queriesPartId = crypto.randomUUID();
	const planPartId = crypto.randomUUID();

	for await (const part of queriesResult.partialObjectStream) {
		// TODO: Stream the queries and plan to the frontend
		if (part.queries) {
			writer.write({
				id: queriesPartId,
				type: "data-queries",
				data: part.queries.filter((q): q is string => q !== undefined),
			});
		}

		if (part.plan) {
			writer.write({
				id: planPartId,
				type: "data-plan",
				data: part.plan,
			});
		}
	}
};

const callTavilyToGetSearchResults = async (queries: string[]) => {
	const tavilyClient = tavily({
		apiKey: process.env.TAVILY_API_KEY,
	});

	const searchResults = await Promise.all(
		queries.map(async (query) => {
			const response = await tavilyClient.search(query, {
				maxResults: 5,
			});

			return {
				query,
				response,
			};
		}),
	);

	return searchResults;
};

const streamFinalSummary = async (
	searchResults: Awaited<ReturnType<typeof callTavilyToGetSearchResults>>,
	messages: ModelMessage[],
	writer: UIMessageStreamWriter<MyMessage>,
) => {
	// TODO: Use streamText to generate a final response to the user.
	// The response should be a summary of the search results,
	// and the sources of the information.
	const answerResult = streamText({
		model: google("gemini-2.5-flash"),
		messages: [
			...messages,
			{
				role: "user",
				content: `
Generate a comprehensive summary of the search results to answer the user's question.

Here are the search results:

${searchResults
	.map(
		(result) => `
Query: ${result.query}

Results:
${result.response.results
	.map(
		(r, i) => `
${i + 1}. ${r.title}
   URL: ${r.url}
   Content: ${r.content}
`,
	)
	.join("\n")}
`,
	)
	.join("\n---\n")}

Instructions:
- Synthesize the information from all search results into a coherent answer
- Include relevant citations by mentioning the source titles and URLs
- Focus on directly answering the user's question
- If there are conflicting information, mention the different perspectives
				`,
			},
		],
	});

	writer.merge(
		// NOTE: We send sendStart: false because we've already
		// sent the 'start' message part to the frontend.
		answerResult.toUIMessageStream({ sendStart: false }),
	);
};

export const POST = async (req: Request): Promise<Response> => {
	const body: { messages: MyMessage[] } = await req.json();
	const { messages } = body;

	const modelMessages = convertToModelMessages(messages);

	const stream = createUIMessageStream<MyMessage>({
		execute: async ({ writer }) => {
			const queriesResult = generateQueriesForTavily(modelMessages);

			await displayQueriesInFrontend(queriesResult, writer);

			const scrapedPages = await callTavilyToGetSearchResults(
				(await queriesResult.object).queries,
			);

			await streamFinalSummary(scrapedPages, modelMessages, writer);
		},
	});

	return createUIMessageStreamResponse({
		stream,
	});
};
