import { describe, it, expect } from "vitest";
import {
  buildContextBlock,
  groundedSystemPrompt,
  INSUFFICIENT_CONTEXT_MESSAGE,
} from "../src/prompt";
import type { RetrievedChunk } from "../src/retrieve";

const sources: RetrievedChunk[] = [
  {
    chunkId: "c1",
    documentId: "d1",
    filename: "eiffel.txt",
    chunkIndex: 0,
    content: "The Eiffel Tower is 330 metres tall.",
    similarity: 0.82,
  },
  {
    chunkId: "c2",
    documentId: "d2",
    filename: "paris.md",
    chunkIndex: 3,
    content: "Paris is the capital of France.",
    similarity: 0.71,
  },
];

describe("buildContextBlock", () => {
  it("numbers each chunk and labels it with its filename and content", () => {
    const block = buildContextBlock(sources);
    expect(block).toContain("[1] Source: eiffel.txt");
    expect(block).toContain("The Eiffel Tower is 330 metres tall.");
    expect(block).toContain("[2] Source: paris.md");
    expect(block).toContain("---"); // separator between chunks
  });
});

describe("groundedSystemPrompt", () => {
  it("embeds the grounding rules and the verbatim refusal message", () => {
    const prompt = groundedSystemPrompt(sources);
    expect(prompt).toContain("Use ONLY the numbered context below");
    expect(prompt).toContain("square brackets");
    expect(prompt).toContain("[1]");
    expect(prompt).toContain(INSUFFICIENT_CONTEXT_MESSAGE);
    expect(prompt).toContain("The Eiffel Tower is 330 metres tall.");
  });

  it("still instructs refusal when there is no context", () => {
    const prompt = groundedSystemPrompt([]);
    expect(prompt).toContain(INSUFFICIENT_CONTEXT_MESSAGE);
  });
});
