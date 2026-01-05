import { mastra } from "@/mastra";
import { toAISdkFormat } from "@mastra/ai-sdk";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import type { CoreMessage } from "ai";

export const maxDuration = 60;

/**
 * Sanitize messages to remove orphaned tool results that would cause
 * OpenAI API errors. This happens when tool results reference call_ids
 * that aren't in the current conversation context.
 */
function sanitizeMessages(messages: CoreMessage[]): CoreMessage[] {
  // Collect all tool call IDs from assistant messages
  const toolCallIds = new Set<string>();

  for (const msg of messages) {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "tool-call" && part.toolCallId) {
          toolCallIds.add(part.toolCallId);
        }
      }
    }
  }

  // Filter messages to only include tool results with matching call IDs
  return messages
    .map((msg) => {
      if (msg.role === "tool" && Array.isArray(msg.content)) {
        const filteredContent = msg.content.filter(
          (part) =>
            part.type === "tool-result" && toolCallIds.has(part.toolCallId)
        );
        if (filteredContent.length === 0) {
          return null; // Remove entire message if no valid tool results
        }
        return { ...msg, content: filteredContent };
      }
      return msg;
    })
    .filter((msg): msg is CoreMessage => msg !== null);
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Sanitize messages to remove orphaned tool results
  const sanitizedMessages = sanitizeMessages(messages);

  const agent = mastra.getAgent("fieldMate");
  const stream = await agent.stream(sanitizedMessages);

  // Convert Mastra stream to AI SDK compatible format
  const aiSdkStream = toAISdkFormat(stream, { from: "agent" });

  // Use createUIMessageStream to properly handle the ReadableStream
  const uiMessageStream = createUIMessageStream({
    execute: async ({ writer }) => {
      const reader = aiSdkStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          writer.write(value);
        }
      } finally {
        reader.releaseLock();
      }
    },
  });

  return createUIMessageStreamResponse({ stream: uiMessageStream });
}
