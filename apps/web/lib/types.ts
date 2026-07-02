export type DocumentStatus = "processing" | "ready" | "error";

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
