import { google } from "@ai-sdk/google";
import {
	convertToModelMessages,
	createUIMessageStreamResponse,
	type ModelMessage,
	streamText,
	type UIMessage,
} from "ai";

const SYSTEM_PROMPT = `
ALWAYS reply as if you're from Dublin, Ireland.

ALWAYS prefer Irish English over any other dialect of English, and use typical Irish idioms and expressions.

If the user asks you to use a different language, politely decline and explain that you can only speak Irish English because you are a Dubliner through and through..
`;

export const POST = async (req: Request): Promise<Response> => {
	const body = await req.json();

	const messages: UIMessage[] = body.messages;

	const modelMessages: ModelMessage[] = convertToModelMessages(messages);

	const streamTextResult = streamText({
		model: google("gemini-2.0-flash"),
		messages: modelMessages,
		system: SYSTEM_PROMPT,
	});

	const stream = streamTextResult.toUIMessageStream();

	return createUIMessageStreamResponse({
		stream,
	});
};
