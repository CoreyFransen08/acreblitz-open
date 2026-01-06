import { encodingForModel } from "js-tiktoken";

export interface TokenLogEntry {
  timestamp: Date;
  toolName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// Use GPT-4o compatible encoding
const encoder = encodingForModel("gpt-4o");

const tokenLog: TokenLogEntry[] = [];

/**
 * Count tokens in a string or object using tiktoken
 */
export function countTokens(data: unknown): number {
  const str = typeof data === "string" ? data : JSON.stringify(data);
  return encoder.encode(str).length;
}

/**
 * Log token usage for a tool call
 */
export function logToolTokens(
  toolName: string,
  input: unknown,
  output: unknown
): void {
  const inputTokens = countTokens(input);
  const outputTokens = countTokens(output);
  const totalTokens = inputTokens + outputTokens;

  const entry: TokenLogEntry = {
    timestamp: new Date(),
    toolName,
    inputTokens,
    outputTokens,
    totalTokens,
  };

  tokenLog.push(entry);

  // Log to console with color coding based on size
  if (outputTokens > 10000) {
    console.warn(
      `[TokenLogger] ⚠️ CRITICAL: ${toolName} - input: ${inputTokens}, output: ${outputTokens}, total: ${totalTokens}`
    );
  } else if (outputTokens > 5000) {
    console.warn(
      `[TokenLogger] ⚠️ WARNING: ${toolName} - input: ${inputTokens}, output: ${outputTokens}, total: ${totalTokens}`
    );
  } else {
    console.log(
      `[TokenLogger] ${toolName} - input: ${inputTokens}, output: ${outputTokens}, total: ${totalTokens}`
    );
  }
}

/**
 * Get all token log entries
 */
export function getTokenLog(): TokenLogEntry[] {
  return [...tokenLog];
}

/**
 * Clear the token log
 */
export function clearTokenLog(): void {
  tokenLog.length = 0;
}

/**
 * Get cumulative token totals
 */
export function getTotalTokens(): { input: number; output: number; total: number } {
  return tokenLog.reduce(
    (acc, entry) => ({
      input: acc.input + entry.inputTokens,
      output: acc.output + entry.outputTokens,
      total: acc.total + entry.totalTokens,
    }),
    { input: 0, output: 0, total: 0 }
  );
}

/**
 * Log a summary of token usage by tool
 */
export function logTokenSummary(): void {
  const byTool: Record<string, { calls: number; input: number; output: number }> = {};

  for (const entry of tokenLog) {
    if (!byTool[entry.toolName]) {
      byTool[entry.toolName] = { calls: 0, input: 0, output: 0 };
    }
    byTool[entry.toolName].calls++;
    byTool[entry.toolName].input += entry.inputTokens;
    byTool[entry.toolName].output += entry.outputTokens;
  }

  console.log("\n[TokenLogger] === Token Usage Summary ===");
  for (const [tool, stats] of Object.entries(byTool)) {
    console.log(
      `  ${tool}: ${stats.calls} calls, ${stats.input} input, ${stats.output} output`
    );
  }

  const totals = getTotalTokens();
  console.log(`  TOTAL: ${totals.input} input, ${totals.output} output, ${totals.total} combined`);
  console.log("==========================================\n");
}
