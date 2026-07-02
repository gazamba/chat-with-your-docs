export type DocumentStatus = "processing" | "ready" | "error";

/** Full document including its extracted text (source-panel detail view). */
export interface DocumentDetail extends DocumentDTO {
  content: string | null;
}

/** A retrieved source chunk returned alongside a chat answer. */
export interface Source {
  chunkId: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

/** Document as serialised by the API (dates become ISO strings over JSON). */
export interface DocumentDTO {
  id: string;
  filename: string;
  mime: string;
  size: number;
  charCount: number;
  chunkCount: number;
  status: DocumentStatus;
  errorMessage: string | null;
  createdAt: string;
}
