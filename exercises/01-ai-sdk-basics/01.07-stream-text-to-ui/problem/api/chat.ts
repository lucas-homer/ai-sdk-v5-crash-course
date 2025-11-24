import { google } from '@ai-sdk/google';
import {
  createUIMessageStreamResponse,
  streamText,
  convertToModelMessages,
  type ModelMessage,
  type UIMessage,
} from 'ai';

export const POST = async (req: Request): Promise<Response> => {
  const body = await req.json();

  // get the UIMessage[] from the body
  const messages: UIMessage[] = body.messages;

  // convert the UIMessage[] to ModelMessage[]
  const modelMessages: ModelMessage[] =
    convertToModelMessages(messages);

  // pass the modelMessages to streamText
  const streamTextResult = streamText({
    model: google('gemini-2.0-flash'),
    messages: modelMessages,
  });

  // create a UIMessageStream from the streamTextResult
  const stream = streamTextResult.toUIMessageStream();

  return createUIMessageStreamResponse({
    stream,
  });
};
