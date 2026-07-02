import { desc, eq } from "drizzle-orm";
import {
  db,
  documents,
  chunks,
  type Document,
  type NewDocument,
} from "@repo/db";

/** Insert bulk chunk rows in bounded batches (keeps bind-param counts sane). */
const CHUNK_INSERT_BATCH = 200;

/** Columns for list views — excludes the potentially large `content` field. */
const DOCUMENT_LIST_COLUMNS = {
  id: documents.id,
  filename: documents.filename,
  mime: documents.mime,
  size: documents.size,
  charCount: documents.charCount,
  chunkCount: documents.chunkCount,
  status: documents.status,
  errorMessage: documents.errorMessage,
  createdAt: documents.createdAt,
} as const;

export type DocumentSummary = Omit<Document, "content">;

export async function createDocument(
  meta: Pick<NewDocument, "filename" | "mime" | "size">,
): Promise<string> {
  const [row] = await db
    .insert(documents)
    .values({ ...meta, status: "processing" })
    .returning({ id: documents.id });
  return row!.id;
}

export interface ChunkInput {
  chunkIndex: number;
  content: string;
  embedding: number[];
}

export async function saveChunks(
  documentId: string,
  items: ChunkInput[],
): Promise<void> {
  for (let i = 0; i < items.length; i += CHUNK_INSERT_BATCH) {
    const batch = items.slice(i, i + CHUNK_INSERT_BATCH);
    await db.insert(chunks).values(batch.map((c) => ({ ...c, documentId })));
  }
}

export async function markReady(
  documentId: string,
  stats: { charCount: number; chunkCount: number; content: string },
): Promise<void> {
  await db
    .update(documents)
    .set({ status: "ready", ...stats })
    .where(eq(documents.id, documentId));
}

export async function markError(
  documentId: string,
  message: string,
): Promise<void> {
  await db
    .update(documents)
    .set({ status: "error", errorMessage: message.slice(0, 500) })
    .where(eq(documents.id, documentId));
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  return db
    .select(DOCUMENT_LIST_COLUMNS)
    .from(documents)
    .orderBy(desc(documents.createdAt));
}

/** Full document row including `content` — powers the source-passage panel. */
export async function getDocument(
  documentId: string,
): Promise<Document | undefined> {
  const [row] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  return row;
}

export async function deleteDocument(documentId: string): Promise<void> {
  // Chunks are removed via ON DELETE CASCADE.
  await db.delete(documents).where(eq(documents.id, documentId));
}
