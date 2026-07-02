import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import {
  ingestDocument,
  retrieve,
  generateGroundedAnswer,
  deleteDocument,
  INSUFFICIENT_CONTEXT_MESSAGE,
} from "@repo/rag";

// Load the monorepo-root .env so DATABASE_URL + keys are available under vitest.
const rootEnv = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(rootEnv)) loadEnv({ path: rootEnv });

// Skipped unless the DB + both API keys are configured (keeps `npm test` green
// with no credentials; runs the real pipeline when they're present).
const configured = Boolean(
  process.env.DATABASE_URL &&
    process.env.OPENAI_API_KEY &&
    process.env.ANTHROPIC_API_KEY,
);

const FIXTURE = [
  "# Photosynthesis",
  "",
  "Photosynthesis is the process by which green plants convert sunlight, water,",
  "and carbon dioxide into glucose and oxygen. It takes place in the chloroplasts,",
  "which contain the green pigment chlorophyll.",
].join("\n");

describe.skipIf(!configured)("RAG pipeline (integration)", () => {
  let documentId: string | undefined;

  beforeAll(async () => {
    const bytes = new TextEncoder().encode(FIXTURE);
    const result = await ingestDocument({
      filename: "photosynthesis-int.md",
      mimeType: "text/markdown",
      bytes,
    });
    documentId = result.documentId;
    expect(result.chunkCount).toBeGreaterThan(0);
  }, 60_000);

  afterAll(async () => {
    if (documentId) await deleteDocument(documentId);
  });

  it("retrieves the right chunk for an in-scope question", async () => {
    const { sources } = await retrieve("What is photosynthesis?");
    expect(sources.length).toBeGreaterThan(0);
    expect(sources[0]!.filename).toBe("photosynthesis-int.md");
    const joined = sources.map((s) => s.content).join(" ").toLowerCase();
    expect(joined).toContain("chlorophyll");
  }, 60_000);

  it("answers a grounded question with the expected fact", async () => {
    const { sources } = await retrieve("What does photosynthesis produce?");
    const { text } = await generateGroundedAnswer({
      question: "What does photosynthesis produce?",
      sources,
    });
    expect(text.toLowerCase()).toMatch(/glucose|oxygen/);
  }, 60_000);

  it("refuses an out-of-scope question", async () => {
    const { sources } = await retrieve("Who won the 2018 FIFA World Cup?");
    const { text } = await generateGroundedAnswer({
      question: "Who won the 2018 FIFA World Cup?",
      sources,
    });
    expect(text).toContain(INSUFFICIENT_CONTEXT_MESSAGE);
  }, 60_000);
});
