import { google } from "@ai-sdk/google";
import {
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	type ModelMessage,
	streamObject,
	streamText,
	type UIMessage,
} from "ai";
import z from "zod";

export type MyMessage = UIMessage<
	never,
	{
		suggestions: string[];
	}
>;

export const POST = async (req: Request): Promise<Response> => {
	const body = await req.json();

	const messages: UIMessage[] = body.messages;

	const modelMessages: ModelMessage[] = convertToModelMessages(messages);

	const stream = createUIMessageStream<MyMessage>({
		execute: async ({ writer }) => {
			const streamTextResult = streamText({
				model: google("gemini-2.5-flash"),
				messages: modelMessages,
			});

			writer.merge(streamTextResult.toUIMessageStream());

			await streamTextResult.consumeStream();

			// TODO: Change the streamText call to streamObject,
			// since we'll need to use structured outputs to reliably
			// generate multiple suggestions
			const followupSuggestionsResult = streamObject({
				model: google("gemini-2.5-flash"),
				// TODO: Define the schema for the suggestions
				// using zod
				schema: z.object({
					suggestions: z.array(z.string()).describe("Array of suggestions"),
				}),
				messages: [
					...modelMessages,
					{
						role: "assistant",
						content: await streamTextResult.text,
					},
					{
						role: "user",
						content:
							"What question should I ask next? Return an array of suggestions, where each one should be only the question text.",
					},
				],
			});

			const dataPartId = crypto.randomUUID();

			// let fullSuggestion = "";

			for await (const chunk of followupSuggestionsResult.partialObjectStream) {
				writer.write({
					id: dataPartId,
					type: "data-suggestions",
					data: chunk?.suggestions?.filter((s) => s !== undefined) ?? [],
				});
			}
		},
	});

	return createUIMessageStreamResponse({
		stream,
	});
};
