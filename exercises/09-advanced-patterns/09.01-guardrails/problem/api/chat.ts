import { google } from "@ai-sdk/google";
import {
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	generateText,
	type ModelMessage,
	streamText,
	type UIMessage,
} from "ai";
import { GUARDRAIL_SYSTEM } from "./guardrail-prompt.ts";

export const POST = async (req: Request): Promise<Response> => {
	const body = await req.json();

	const messages: UIMessage[] = body.messages;

	const modelMessages: ModelMessage[] = convertToModelMessages(messages);

	const stream = createUIMessageStream<UIMessage>({
		execute: async ({ writer }) => {
			console.time("Guardrail Time");
			// TODO: Use generateText to call a model, passing in the modelMessages
			// and the GUARDRAIL_SYSTEM prompt.
			//
			const guardrailResult = await generateText({
				model: google("gemini-2.5-flash-lite"),
				system: GUARDRAIL_SYSTEM,
				messages: modelMessages,
			});

			console.timeEnd("Guardrail Time");

			console.log("guardrailResult", guardrailResult.text.trim());

			// TODO: If the guardrailResult is '0', write a standard reply
			// to the frontend using text-start, text-delta, and text-end
			// parts. Then, do an early return to prevent the rest of the
			// stream from running.
			// (make sure you trim the guardrailResult.text before checking it)
			if (guardrailResult.text.trim() === "0") {
				const textId = crypto.randomUUID();
				writer.write({
					type: "text-start",
					id: textId,
				});
				writer.write({
					type: "text-delta",
					id: textId,
					delta:
						"I'm sorry, but I'm not sure how to help you with that. Please try asking me something else.",
				});
				writer.write({
					type: "text-end",
					id: textId,
				});
				return;
			}

			const streamTextResult = streamText({
				model: google("gemini-2.5-flash"),
				messages: modelMessages,
			});

			writer.merge(streamTextResult.toUIMessageStream());
		},
	});

	return createUIMessageStreamResponse({
		stream,
	});
};
