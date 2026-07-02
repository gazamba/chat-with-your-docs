/**
 * Rough USD cost estimation for observability. Prices are per 1M tokens and are
 * approximate — good enough for per-request cost logging, not billing.
 */
const PRICES: Record<string, { input: number; output: number }> = {
  "text-embedding-3-small": { input: 0.02, output: 0 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export function estimateCostUsd(model: string, usage: TokenUsage): number {
  const price = PRICES[model];
  if (!price) return 0;
  const input = ((usage.inputTokens ?? 0) / 1_000_000) * price.input;
  const output = ((usage.outputTokens ?? 0) / 1_000_000) * price.output;
  return input + output;
}

/** Convenience for embedding-only cost (input tokens only). */
export function embeddingCostUsd(tokens: number): number {
  return estimateCostUsd("text-embedding-3-small", { inputTokens: tokens });
}
