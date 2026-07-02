import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { RAG_CONFIG, requireEnv } from "./config";

export interface GroundednessVerdict {
  grounded: boolean;
  reasoning: string;
}

/**
 * LLM-as-judge (Haiku) used by the eval harness. An answer is "grounded" if
 * every claim is supported by the context, or it appropriately declines when
 * the context lacks the answer.
 */
export async function judgeGroundedness(params: {
  question: string;
  answer: string;
  context: string;
}): Promise<GroundednessVerdict> {
  requireEnv("ANTHROPIC_API_KEY");
  const { object } = await generateObject({
    model: anthropic(RAG_CONFIG.models.judge),
    schema: z.object({ grounded: z.boolean(), reasoning: z.string() }),
    prompt: [
      "You are grading a retrieval-augmented answer for GROUNDEDNESS.",
      "",
      "Context passages:",
      params.context || "(no context retrieved)",
      "",
      `Question: ${params.question}`,
      `Answer: ${params.answer}`,
      "",
      "Set grounded=true only if EITHER every factual claim in the answer is",
      "directly supported by the context, OR the answer appropriately declines",
      "(says it does not have enough information) when the context lacks the",
      "answer. Set grounded=false if the answer states facts not in the context.",
    ].join("\n"),
  });
  return object;
}
