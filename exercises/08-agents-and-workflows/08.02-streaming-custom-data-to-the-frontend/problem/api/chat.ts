import { google } from "@ai-sdk/google";
import {
	createUIMessageStream,
	createUIMessageStreamResponse,
	// generateText,
	streamText,
	type UIMessage,
} from "ai";

// replace all instances of UIMessage with MyMessage
export type MyMessage = UIMessage<
	unknown,
	{
		// declare custom data parts here
		firstDraft: string;
		evaluation: string;
	}
>;

const formatMessageHistory = (messages: UIMessage[]) => {
	return messages
		.map((message) => {
			return `${message.role}: ${message.parts
				.map((part) => {
					if (part.type === "text") {
						return part.text;
					}

					return "";
				})
				.join("")}`;
		})
		.join("\n");
};

const WRITE_SLACK_MESSAGE_FIRST_DRAFT_SYSTEM = `You are writing a Slack message for a user based on the conversation history. Only return the Slack message, no other text.`;
const EVALUATE_SLACK_MESSAGE_SYSTEM = `You are evaluating the Slack message produced by the user.

  Evaluation criteria:
  - The Slack message should be written in a way that is easy to understand.
  - It should be appropriate for a professional Slack conversation.
`;
const WRITE_SLACK_MESSAGE_FINAL_SYSTEM = `You are writing a Slack message based on the conversation history, a first draft, and some feedback given about that draft.

  Return only the final Slack message, no other text.
`;

export const POST = async (req: Request): Promise<Response> => {
	// change to MyMessage[]
	const body: { messages: MyMessage[] } = await req.json();
	const { messages } = body;

	const stream = createUIMessageStream<MyMessage>({
		execute: async ({ writer }) => {
			// write a { type: 'start' } message via writer.write
			writer.write({ type: "start" });

			// change to streamText
			const firstDraftResult = streamText({
				model: google("gemini-2.5-flash-lite"),
				system: WRITE_SLACK_MESSAGE_FIRST_DRAFT_SYSTEM,
				prompt: `
          Conversation history:
          ${formatMessageHistory(messages)}
        `,
			});
			// write to the stream as custom data parts
			const firstDraftId = crypto.randomUUID();
			let firstDraft = "";
			for await (const chunk of firstDraftResult.textStream) {
				firstDraft += chunk;
				writer.write({
					type: "data-firstDraft",
					id: firstDraftId,
					data: firstDraft,
				});
			}

			// change to streamText
			const evaluationResult = streamText({
				model: google("gemini-2.5-flash-lite"),
				system: EVALUATE_SLACK_MESSAGE_SYSTEM,
				prompt: `
          Conversation history:
          ${formatMessageHistory(messages)}

          Slack message:
          ${firstDraftResult.text}
        `,
			});
			// write to the stream as custom data parts
			const evaluationId = crypto.randomUUID();
			let evaluation = "";
			for await (const chunk of evaluationResult.textStream) {
				evaluation += chunk;
				writer.write({
					type: "data-evaluation",
					id: evaluationId,
					data: evaluation,
				});
			}

			const finalSlackAttempt = streamText({
				model: google("gemini-2.5-flash-lite"),
				system: WRITE_SLACK_MESSAGE_FINAL_SYSTEM,
				prompt: `
          Conversation history:
          ${formatMessageHistory(messages)}

          First draft:
          ${firstDraftResult.text}

          Previous feedback:
          ${evaluationResult.text}
        `,
			});

			// merge the final slack attempt into the stream,
			// sending sendStart: false
			writer.merge(
				finalSlackAttempt.toUIMessageStream({
					sendStart: false,
				}),
			);
		},
	});

	return createUIMessageStreamResponse({
		stream,
	});
};
