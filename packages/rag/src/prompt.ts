import type { RetrievedChunk } from "./retrieve";

/** Exact refusal text — the core anti-hallucination guardrail. */
export const INSUFFICIENT_CONTEXT_MESSAGE =
  "I don't have enough information in the documents to answer that.";

/**
 * Render retrieved chunks into a numbered context block. Sources are numbered
 * [1], [2], ... so the model can cite them compactly and the UI can map each
 * citation back to its passage.
 */
export function buildContextBlock(sources: RetrievedChunk[]): string {
  return sources
    .map((s, i) => `[${i + 1}] Source: ${s.filename}\n${s.content}`)
    .join("\n\n---\n\n");
}

/**
 * Grounded system prompt: answer only from context, cite by source number, and
 * refuse verbatim when the context is insufficient.
 */
export function groundedSystemPrompt(sources: RetrievedChunk[]): string {
  return [
    "You answer questions strictly from the provided document context.",
    "",
    "Rules:",
    "- Use ONLY the numbered context below. Never rely on outside knowledge.",
    "- Cite the source of each claim inline using its number in square brackets, e.g. [1] or [2]. Cite every claim.",
    `- If the context does not contain the answer, reply with exactly: "${INSUFFICIENT_CONTEXT_MESSAGE}"`,
    "- Be concise. Quote or closely paraphrase the source rather than embellishing.",
    "",
    "Context:",
    buildContextBlock(sources),
  ].join("\n");
}
