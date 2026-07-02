import { cosineDistance, eq, sql } from "drizzle-orm";
import { db, chunks, documents } from "@repo/db";
import { embedQuery } from "./embed";
import { RAG_CONFIG } from "./config";

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  /** Cosine similarity in [0, 1] (1 - cosine distance). */
  similarity: number;
}

/** Jaccard similarity over word sets — a cheap near-duplicate detector. */
function wordJaccard(a: string, b: string): number {
  const sa = new Set(a.toLowerCase().split(/\s+/));
  const sb = new Set(b.toLowerCase().split(/\s+/));
  let intersection = 0;
  for (const w of sa) if (sb.has(w)) intersection++;
  const union = sa.size + sb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function dropNearDuplicates(
  rows: RetrievedChunk[],
  threshold: number,
): RetrievedChunk[] {
  const kept: RetrievedChunk[] = [];
  for (const row of rows) {
    const dup = kept.some((k) => wordJaccard(k.content, row.content) >= threshold);
    if (!dup) kept.push(row);
  }
  return kept;
}

export interface RetrieveResult {
  sources: RetrievedChunk[];
  queryTokens: number;
}

/**
 * Embed the question and fetch the nearest chunks by cosine distance, then
 * remove near-duplicates and cap by count + total context characters.
 */
export async function retrieve(
  question: string,
  options: { topK?: number } = {},
): Promise<RetrieveResult> {
  const topK = options.topK ?? RAG_CONFIG.retrieval.topK;
  const { embedding, tokens } = await embedQuery(question);

  // pgvector cosine distance (`<=>`), ordered ascending = most similar first.
  const distance = cosineDistance(chunks.embedding, embedding);
  const rows = await db
    .select({
      chunkId: chunks.id,
      documentId: chunks.documentId,
      filename: documents.filename,
      chunkIndex: chunks.chunkIndex,
      content: chunks.content,
      similarity: sql<number>`1 - (${distance})`,
    })
    .from(chunks)
    .innerJoin(documents, eq(chunks.documentId, documents.id))
    .orderBy(distance)
    .limit(topK * 3); // over-fetch so dedupe/caps still yield ~topK

  const deduped = dropNearDuplicates(
    rows,
    RAG_CONFIG.retrieval.dedupeSimilarity,
  );

  const sources: RetrievedChunk[] = [];
  let totalChars = 0;
  for (const row of deduped) {
    if (sources.length >= topK) break;
    if (totalChars + row.content.length > RAG_CONFIG.retrieval.maxContextChars) {
      continue;
    }
    sources.push(row);
    totalChars += row.content.length;
  }

  return { sources, queryTokens: tokens };
}
