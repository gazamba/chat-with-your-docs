import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { RAG_CONFIG, requireEnv } from "./config";

function embeddingModel() {
  // Fail fast with a clear message rather than a provider-internal error.
  requireEnv("OPENAI_API_KEY");
  return openai.textEmbeddingModel(RAG_CONFIG.embedding.model);
}

function batch<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface EmbedResult {
  embeddings: number[][];
  tokens: number;
}

/** Embed many texts, batched to keep request sizes bounded. */
export async function embedTexts(texts: string[]): Promise<EmbedResult> {
  const model = embeddingModel();
  const embeddings: number[][] = [];
  let tokens = 0;

  for (const group of batch(texts, RAG_CONFIG.embedding.batchSize)) {
    const result = await embedMany({ model, values: group });
    embeddings.push(...result.embeddings);
    tokens += result.usage?.tokens ?? 0;
  }

  return { embeddings, tokens };
}

/** Embed a single query string. */
export async function embedQuery(
  text: string,
): Promise<{ embedding: number[]; tokens: number }> {
  const { embedding, usage } = await embed({
    model: embeddingModel(),
    value: text,
  });
  return { embedding, tokens: usage?.tokens ?? 0 };
}
