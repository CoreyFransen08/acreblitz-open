import { mastra } from "@/mastra";
import { toAISdkFormat } from "@mastra/ai-sdk";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import type { CoreMessage } from "ai";

export const maxDuration = 60;

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 10000;

/**
 * Check if an error is a rate limit error (429)
 */
function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === "object") {
    // Check for statusCode property
    if ("statusCode" in error && error.statusCode === 429) {
      return true;
    }
    // Check for status property
    if ("status" in error && error.status === 429) {
      return true;
    }
    // Check for response status
    if (
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "status" in error.response &&
      error.response.status === 429
    ) {
      return true;
    }
    // Check error message
    if ("message" in error && typeof error.message === "string") {
      if (
        error.message.includes("429") ||
        error.message.includes("rate limit") ||
        error.message.includes("Rate limit")
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Extract retry delay from error response headers or use exponential backoff
 */
function getRetryDelay(error: unknown, attempt: number): number {
  // Try to get retry-after from error response
  if (error && typeof error === "object") {
    // Check responseHeaders (AI SDK format)
    if ("responseHeaders" in error && error.responseHeaders) {
      const headers = error.responseHeaders as Record<string, string>;
      // retry-after-ms is more precise
      if (headers["retry-after-ms"]) {
        return Math.min(parseInt(headers["retry-after-ms"], 10), MAX_DELAY_MS);
      }
      // retry-after is in seconds
      if (headers["retry-after"]) {
        return Math.min(parseInt(headers["retry-after"], 10) * 1000, MAX_DELAY_MS);
      }
    }
  }

  // Exponential backoff with jitter as fallback
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 200; // Add up to 200ms jitter
  return Math.min(exponentialDelay + jitter, MAX_DELAY_MS);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Stream agent response with retry logic for rate limits
 */
async function streamWithRetry(
  agent: ReturnType<typeof mastra.getAgent>,
  messages: CoreMessage[],
  maxRetries: number = MAX_RETRIES
) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await agent.stream(messages);
    } catch (error) {
      lastError = error;

      // Only retry on rate limit errors
      if (!isRateLimitError(error)) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= maxRetries) {
        console.error(
          `Rate limit: Max retries (${maxRetries}) exceeded`,
          error
        );
        throw error;
      }

      // Calculate delay and wait
      const delay = getRetryDelay(error, attempt);
      console.log(
        `Rate limit hit. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
      );
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

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

  // Use retry wrapper to handle rate limits with exponential backoff
  const stream = await streamWithRetry(agent, sanitizedMessages);

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
