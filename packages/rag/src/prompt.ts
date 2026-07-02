import type { RetrievedChunk } from "./retrieve";

/** Exact refusal text — the core anti-hallucination guardrail. */
export const INSUFFICIENT_CONTEXT_MESSAGE =
  "I don't have enough information in the documents to answer that.";

/** Render retrieved chunks into a labelled context block. */
export function buildContextBlock(sources: RetrievedChunk[]): string {
  return sources
    .map((s) => `Source: [${s.filename}]\n${s.content}`)
    .join("\n\n---\n\n");
}

/**
 * Grounded system prompt: answer only from context, cite by filename, and
 * refuse verbatim when the context is insufficient.
 */
export function groundedSystemPrompt(sources: RetrievedChunk[]): string {
  return [
    "You answer questions strictly from the provided document context.",
    "",
    "Rules:",
    "- Use ONLY the context below. Never rely on outside knowledge.",
    "- Cite the source of each claim inline using its filename in square brackets, e.g. [report.pdf].",
    `- If the context does not contain the answer, reply with exactly: "${INSUFFICIENT_CONTEXT_MESSAGE}"`,
    "- Be concise. Quote or closely paraphrase the source rather than embellishing.",
    "",
    "Context:",
    buildContextBlock(sources),
  ].join("\n");
}
