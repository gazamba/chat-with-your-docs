import { extractText as extractPdfText, getDocumentProxy } from "unpdf";
import type { AllowedMimeType } from "./config";

/** Tidy extracted text: normalise newlines and collapse large blank gaps. */
function normalize(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+\n/g, "\n") // strip trailing intra-line whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract plain text from a supported document. PDFs are parsed with unpdf
 * (pdf.js under the hood); text/markdown are decoded as UTF-8.
 */
export async function extractDocumentText(
  bytes: Uint8Array,
  mimeType: AllowedMimeType,
): Promise<string> {
  if (mimeType === "application/pdf") {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractPdfText(pdf, { mergePages: true });
    return normalize(text);
  }
  // text/plain and text/markdown
  return normalize(new TextDecoder("utf-8").decode(bytes));
}
