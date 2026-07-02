import { streamText, generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { RAG_CONFIG, requireEnv } from "./config";
import { groundedSystemPrompt } from "./prompt";
import type { RetrievedChunk } from "./retrieve";

/** Claude model used for streamed grounded answers. */
export function answerModel() {
  requireEnv("ANTHROPIC_API_KEY");
  return anthropic(RAG_CONFIG.models.answer);
}

export interface AnswerParams {
  question: string;
  sources: RetrievedChunk[];
}

/**
 * Stream a grounded answer from Claude. Temperature 0 keeps answers faithful
 * to the retrieved context.
 */
export function streamGroundedAnswer({ question, sources }: AnswerParams) {
  return streamText({
    model: answerModel(),
    system: groundedSystemPrompt(sources),
    prompt: question,
    temperature: 0,
  });
}

/**
 * Non-streaming grounded answer — used by the eval harness and integration
 * tests where the full text is needed at once.
 */
export async function generateGroundedAnswer({
  question,
  sources,
}: AnswerParams) {
  const { text, usage } = await generateText({
    model: answerModel(),
    system: groundedSystemPrompt(sources),
    prompt: question,
    temperature: 0,
  });
  return { text, usage };
}
