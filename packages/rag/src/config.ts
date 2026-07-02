/**
 * Central configuration for the RAG pipeline. Tunables live here so the
 * behaviour of chunking, retrieval and the models is easy to reason about.
 */
export const RAG_CONFIG = {
  embedding: {
    model: "text-embedding-3-small",
    dimensions: 1536,
    /** Max inputs per OpenAI embeddings request. */
    batchSize: 96,
  },
  models: {
    /** Streamed grounded answers. */
    answer: "claude-sonnet-4-6",
    /** Cheap LLM-as-judge used by the eval harness. */
    judge: "claude-haiku-4-5",
  },
  chunking: {
    targetChars: 2000,
    overlapChars: 200,
  },
  retrieval: {
    topK: 5,
    /** Hard cap on total context characters sent to the LLM. */
    maxContextChars: 12_000,
    /** Cosine-similarity threshold above which two chunks are near-duplicates. */
    dedupeSimilarity: 0.97,
  },
  upload: {
    maxBytes: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: [
      "application/pdf",
      "text/plain",
      "text/markdown",
    ] as const,
  },
} as const;

export type AllowedMimeType =
  (typeof RAG_CONFIG.upload.allowedMimeTypes)[number];

/** Read a required environment variable, throwing a clear error if missing. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
