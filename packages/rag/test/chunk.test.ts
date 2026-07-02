import { describe, it, expect } from "vitest";
import { chunkText } from "../src/chunk";

/** Build "w0 w1 w2 ..." with a period every 10 words to create sentence breaks. */
function makeText(wordCount: number): string {
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(`w${i}${(i + 1) % 10 === 0 ? "." : ""}`);
  }
  return words.join(" ");
}

describe("chunkText", () => {
  it("returns nothing for empty/whitespace input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n  ")).toEqual([]);
  });

  it("returns a single trimmed chunk when text fits the target", () => {
    const text = "A short document.";
    expect(chunkText(text, { targetChars: 2000 })).toEqual([text]);
  });

  it("keeps every chunk within the target size", () => {
    const text = makeText(400);
    const chunks = chunkText(text, { targetChars: 200, overlapChars: 40 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(200);
  });

  it("produces chunks that are substrings of the source (no corruption)", () => {
    const text = makeText(400);
    for (const c of chunkText(text, { targetChars: 200, overlapChars: 40 })) {
      expect(text.includes(c)).toBe(true);
    }
  });

  it("loses no content — every word appears in some chunk", () => {
    const text = makeText(400);
    const chunks = chunkText(text, { targetChars: 200, overlapChars: 40 });
    const seen = new Set(chunks.flatMap((c) => c.split(/\s+/)));
    for (let i = 0; i < 400; i++) {
      // words may carry a trailing period from sentence boundaries
      expect(seen.has(`w${i}`) || seen.has(`w${i}.`)).toBe(true);
    }
  });

  it("overlaps neighbouring chunks (shares at least one word)", () => {
    const chunks = chunkText(makeText(400), { targetChars: 200, overlapChars: 60 });
    for (let i = 1; i < chunks.length; i++) {
      const prev = new Set(chunks[i - 1]!.split(/\s+/));
      const shares = chunks[i]!.split(/\s+/).some((w) => prev.has(w));
      expect(shares).toBe(true);
    }
  });

  it("prefers paragraph boundaries when backing up", () => {
    const para1 = "x".repeat(120);
    const para2 = "y".repeat(120);
    const [first] = chunkText(`${para1}\n\n${para2}`, {
      targetChars: 180,
      overlapChars: 20,
    });
    // Should end at the paragraph break, not mid-way through para2.
    expect(first).toBe(para1);
  });

  it("terminates when overlap >= slice length (infinite-loop guard)", () => {
    const text = "z".repeat(500);
    const chunks = chunkText(text, { targetChars: 100, overlapChars: 150 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((c) => c.length <= 100)).toBe(true);
  });
});
