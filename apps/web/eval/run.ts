/**
 * Eval harness: ingest the sample docs, run a fixed Q&A set, and report
 * retrieval hit-rate, answer accuracy, and groundedness (Haiku as judge).
 *
 *   pnpm eval        (from repo root, via turbo)
 *   pnpm --filter web eval
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import {
  ingestDocument,
  retrieve,
  generateGroundedAnswer,
  judgeGroundedness,
  buildContextBlock,
  listDocuments,
  deleteDocument,
  INSUFFICIENT_CONTEXT_MESSAGE,
  requireEnv,
} from "@repo/rag";

// Load the monorepo-root .env for DATABASE_URL + API keys.
const rootEnv = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(rootEnv)) loadEnv({ path: rootEnv });

requireEnv("DATABASE_URL");
requireEnv("OPENAI_API_KEY");
requireEnv("ANTHROPIC_API_KEY");

interface QA {
  question: string;
  expectDoc?: string;
  expectFacts?: string[];
  expectRefusal?: boolean;
}

interface Row {
  question: string;
  hit: boolean | null;
  accurate: boolean;
  grounded: boolean;
}

const docsDir = fileURLToPath(new URL("./docs", import.meta.url));
const qaPath = fileURLToPath(new URL("./fixtures/qa.json", import.meta.url));

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "n/a";
  return `${((numerator / denominator) * 100).toFixed(0)}%`;
}

function mark(value: boolean | null): string {
  if (value === null) return " - ";
  return value ? " ✓ " : " ✗ ";
}

async function main() {
  const qas = JSON.parse(readFileSync(qaPath, "utf8")) as QA[];
  const files = readdirSync(docsDir).filter((f) => f.endsWith(".md"));

  // Re-ingest cleanly: drop any prior copies of these docs first.
  const existing = await listDocuments();
  for (const doc of existing) {
    if (files.includes(doc.filename)) await deleteDocument(doc.id);
  }
  const ingestedIds: string[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(
      readFileSync(fileURLToPath(new URL(`./docs/${file}`, import.meta.url))),
    );
    const result = await ingestDocument({
      filename: file,
      mimeType: "text/markdown",
      bytes,
    });
    ingestedIds.push(result.documentId);
  }
  console.log(`\nIngested ${files.length} docs: ${files.join(", ")}\n`);

  const rows: Row[] = [];
  for (const qa of qas) {
    const { sources } = await retrieve(qa.question);
    const context = buildContextBlock(sources);
    const { text } = await generateGroundedAnswer({
      question: qa.question,
      sources,
    });

    const hit = qa.expectRefusal
      ? null
      : sources.some((s) => s.filename === qa.expectDoc);
    const accurate = qa.expectRefusal
      ? text.includes(INSUFFICIENT_CONTEXT_MESSAGE)
      : (qa.expectFacts ?? []).some((f) =>
          text.toLowerCase().includes(f.toLowerCase()),
        );
    const { grounded } = await judgeGroundedness({
      question: qa.question,
      answer: text,
      context,
    });

    rows.push({ question: qa.question, hit, accurate, grounded });
  }

  // --- score table ---
  const qWidth = Math.max(...rows.map((r) => r.question.length), 8);
  const header = `${"Question".padEnd(qWidth)} | Hit | Acc | Grnd`;
  console.log(header);
  console.log("-".repeat(header.length));
  for (const r of rows) {
    console.log(
      `${r.question.padEnd(qWidth)} |${mark(r.hit)}|${mark(r.accurate)}|${mark(r.grounded)}`,
    );
  }

  const inScope = rows.filter((r) => r.hit !== null);
  console.log(`\nRetrieval hit-rate: ${pct(inScope.filter((r) => r.hit).length, inScope.length)} (in-scope questions)`);
  console.log(`Answer accuracy:    ${pct(rows.filter((r) => r.accurate).length, rows.length)}`);
  console.log(`Groundedness:       ${pct(rows.filter((r) => r.grounded).length, rows.length)} (Haiku judge)\n`);

  // Cleanup: remove the docs we ingested for the eval.
  for (const id of ingestedIds) await deleteDocument(id);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
