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
  stats: { charCount: number; chunkCount: number },
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

export async function listDocuments(): Promise<Document[]> {
  return db.select().from(documents).orderBy(desc(documents.createdAt));
}

export async function deleteDocument(documentId: string): Promise<void> {
  // Chunks are removed via ON DELETE CASCADE.
  await db.delete(documents).where(eq(documents.id, documentId));
}
