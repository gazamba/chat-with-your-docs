import { chunkText } from "./chunk";
import { extractDocumentText } from "./extract";
import { embedTexts } from "./embed";
import { createDocument, saveChunks, markReady, markError } from "./store";
import type { AllowedMimeType } from "./config";
import { logger as defaultLogger, type Logger } from "./logger";

export interface IngestInput {
  filename: string;
  mimeType: AllowedMimeType;
  bytes: Uint8Array;
  log?: Logger;
}

export interface IngestResult {
  documentId: string;
  chunkCount: number;
  charCount: number;
  embeddingTokens: number;
}

/**
 * Inline ingestion pipeline: extract -> chunk -> embed -> store, flipping the
 * document row to `ready` or `error`. The row is created first so its status is
 * observable even if a later step throws.
 */
export async function ingestDocument({
  filename,
  mimeType,
  bytes,
  log = defaultLogger,
}: IngestInput): Promise<IngestResult> {
  const documentId = await createDocument({
    filename,
    mime: mimeType,
    size: bytes.length,
  });
  const startedAt = performance.now();

  try {
    const text = await extractDocumentText(bytes, mimeType);
    if (!text.trim()) throw new Error("No extractable text found in document");

    const pieces = chunkText(text);
    if (pieces.length === 0) throw new Error("Document produced no chunks");

    const { embeddings, tokens } = await embedTexts(pieces);
    await saveChunks(
      documentId,
      pieces.map((content, i) => ({
        chunkIndex: i,
        content,
        embedding: embeddings[i]!,
      })),
    );
    await markReady(documentId, {
      charCount: text.length,
      chunkCount: pieces.length,
      content: text,
    });

    log.info(
      {
        documentId,
        filename,
        chunkCount: pieces.length,
        charCount: text.length,
        embeddingTokens: tokens,
        ms: Math.round(performance.now() - startedAt),
      },
      "document ingested",
    );

    return {
      documentId,
      chunkCount: pieces.length,
      charCount: text.length,
      embeddingTokens: tokens,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markError(documentId, message);
    log.error({ documentId, filename, err: message }, "ingestion failed");
    throw err;
  }
}
