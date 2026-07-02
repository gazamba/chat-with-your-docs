import { RAG_CONFIG } from "./config";

export interface ChunkOptions {
  targetChars?: number;
  overlapChars?: number;
}

/** Natural break points, strongest boundary first. */
const SEPARATORS = ["\n\n", ". ", "\n"] as const;

/**
 * Find a natural break within [from, to). Returns the index just *after* the
 * separator (so it becomes a clean chunk boundary), or -1 if none is found.
 * Stronger boundaries (paragraph > sentence > line) win over closer weaker ones.
 */
function findBreak(text: string, from: number, to: number): number {
  for (const sep of SEPARATORS) {
    // Keep the whole separator inside the window so `end` never exceeds `to`.
    const idx = text.lastIndexOf(sep, to - sep.length);
    if (idx >= from) return idx + sep.length;
  }
  return -1;
}

/**
 * Recursive, boundary-aware, character-based chunker.
 *
 * Targets ~`targetChars` per chunk with ~`overlapChars` of overlap between
 * neighbours. When a chunk would not reach the end of the text, we back up to
 * the last natural break in the *second half* of the window so we don't split
 * mid-sentence. Guards against infinite loops when a slice is shorter than the
 * overlap.
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const targetChars = options.targetChars ?? RAG_CONFIG.chunking.targetChars;
  const overlapChars = options.overlapChars ?? RAG_CONFIG.chunking.overlapChars;

  const normalized = text.replace(/\r\n/g, "\n").trim();
  const n = normalized.length;
  if (n === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < n) {
    let end = Math.min(start + targetChars, n);

    // Not at EOF: prefer to end on a natural break in the window's second half.
    if (end < n) {
      const windowMid = start + Math.floor((end - start) / 2);
      const breakAt = findBreak(normalized, windowMid, end);
      if (breakAt > start) end = breakAt;
    }

    const piece = normalized.slice(start, end).trim();
    if (piece) chunks.push(piece);

    if (end >= n) break;

    // Advance with overlap; guarantee forward progress even for tiny slices.
    const nextStart = end - overlapChars;
    start = nextStart > start ? nextStart : end;
  }

  return chunks;
}
