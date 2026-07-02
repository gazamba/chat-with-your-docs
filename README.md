# Chat with your docs

A local-first RAG app: upload documents and ask questions, getting grounded
answers with inline citations. Next.js + Postgres/pgvector + Drizzle, OpenAI
embeddings, and Claude for streamed answers.

## Quick start (Docker)

1. Create your env file and add the two API keys:
   ```bash
   cp .env.example .env
   # edit .env → set OPENAI_API_KEY and ANTHROPIC_API_KEY
   # DATABASE_URL: leave the default for Docker, or paste a Neon URL
   ```
2. Bring everything up (app + Postgres/pgvector); migrations run on start:
   ```bash
   docker compose up --build
   ```
3. Open http://localhost:3000 — health check at http://localhost:3000/api/health

## Local development

Requires Node ≥ 18, pnpm 9, and Docker (for the database).

```bash
docker compose up -d db        # Postgres + pgvector
pnpm install
pnpm db:migrate                # create tables, extension, HNSW index
pnpm dev                       # http://localhost:3000
```

## Tests & eval

```bash
pnpm test        # unit tests (+ integration when .env has DB + API keys)
pnpm run eval    # ingests sample docs, prints retrieval / accuracy / groundedness
```

## Architecture overview

Turborepo monorepo. One Next.js app for API + UI; the RAG/data logic lives in
framework-agnostic packages so other apps (e.g. an agents app) can reuse them.

```
apps/web            Next.js App Router — API routes + UI + eval + integration tests
packages/db         @repo/db  — Drizzle schema, postgres-js client, pgvector migration
packages/rag        @repo/rag — extract · chunk · embed · store · retrieve · llm ·
                                prompt · judge · logger · config · cost   (no React/Next)
packages/*-config   shared eslint / typescript config
```

**Ingestion** (`POST /api/documents`): validate type/size → extract text (PDF via
unpdf, txt/md decoded) → boundary-aware chunking (~2000 chars, ~200 overlap) →
batched OpenAI `text-embedding-3-small` (1536-d) → bulk-insert chunks → mark the
document `ready` (or `error`). Status is shown per-document in the sidebar.

**Query** (`POST /api/chat`): embed the question → pgvector top-k by cosine
distance (HNSW `vector_cosine_ops`) → dedupe + cap context → grounded system
prompt → Claude Sonnet streamed via the Vercel AI SDK. The API streams
newline-delimited JSON (`sources`, then `delta` tokens) so the UI renders
inline numbered citations that open the source passage.

```
Upload ─▶ extract ─▶ chunk ─▶ embed ─▶ store (document + chunk[vector 1536])
                                              │
Question ─▶ embed ─▶ pgvector top-k ◀─────────┘─▶ grounded prompt ─▶ Claude ─▶ stream + sources
```

**Data model** — one Postgres datastore for metadata *and* embeddings:
`document(id, filename, mime, size, char_count, chunk_count, status, error_message,
content, created_at)` and `chunk(id, document_id → cascade, chunk_index, content,
embedding vector(1536))` with an HNSW index on `embedding`.

The same `DATABASE_URL` works for the local `pgvector/pgvector:pg16` container and
for a Neon connection string.

<!--
The sections below are intentionally left for the repo owner to write.
-->

## Productionizing, scaling & deployment (AWS / GCP / Azure / Cloudflare)

Not ready for prod. This is just a mvp with no auth, security, cron job, secret manager, cloud provider, etc.

## RAG / LLM approach & decisions

Models

Answering LLM — Claude Sonnet 4.6. Streamed via the Vercel AI SDK at temperature: 0 so answers stay faithful to the retrieved passages and tokens render live in the UI. Sonnet is the sweet spot of quality, latency, and cost for grounded Q&A over a handful of passages.

Eval judge — Claude Haiku 4.5. Grading answers for groundedness is a cheap, high-volume task, so the eval harness uses the smaller, faster model as an LLM-as-judge.

Embeddings — OpenAI text-embedding-3-small (1536-d), batched. Strong quality-per-dollar; 1536 dimensions index cleanly in pgvector; embedding calls are batched to keep request sizes bounded and cost down.

Vector database

Postgres + pgvector — one datastore for metadata and embeddings. Documents and their chunks live in the same database, giving relational integrity (foreign key, cascade delete), transactional ingestion, and vector search in one place with no extra infrastructure. Similarity uses an HNSW index with vector_cosine_ops (cosine distance, ORDER BY embedding <=> query). The same DATABASE_URL works locally (Docker pgvector) and against Neon.

Orchestration framework

Vercel AI SDK + a hand-rolled pipeline. The RAG flow (extract → chunk → embed → retrieve → prompt) is written explicitly in a framework-agnostic @repo/rag package, using the AI SDK for the pieces that benefit from it: streamText (streamed answers), embedMany (batched embeddings), and generateObject (structured judge). This keeps the logic transparent and debuggable and lets the same core be reused by other apps.

Prompt & context management

Grounded system prompt: answer only from the numbered context, cite each claim by number [n], reply with a fixed refusal line when the context is insufficient, stay concise, and use simple Markdown. Numbered context → citations: each retrieved passage is labelled [1..k] so the model's [n] citations map 1:1 to a passage the UI can open. Context is bounded: retrieve top-k = 5, over-fetch ×3, remove near-duplicate chunks (word-set Jaccard), then cap by chunk count and total characters. Chunking is recursive and boundary-aware (~2000 chars, ~200 overlap), backing up to paragraph/sentence/line breaks so passages don't split mid-thought.

Guardrails

Anti-hallucination refusal is the core guardrail — enforced both in the prompt and by a deterministic short-circuit that returns the refusal when retrieval finds nothing. Upload validation checks file type and size and resolves MIME from the declared type or extension. Rate limiting caps chat and upload requests per client. Context dedupe + caps prevent redundant or oversized prompts.

Quality

Eval harness (npm run eval) ingests 3 sample docs and runs ~10 Q&A pairs, reporting retrieval hit-rate, answer accuracy, and groundedness (Haiku as judge) as a score table — including out-of-scope questions that must be refused. Tests cover the chunker (boundary/overlap behaviour) and the grounded-prompt builder as unit tests, plus an integration test that ingests a fixture, retrieves the right chunk, checks the answer contains the expected fact, and confirms an out-of-scope question is refused.

Observability

Structured logging with pino, carrying a request id across ingest → retrieve → LLM, plus per-request latency, token counts, and estimated USD cost (per-model price table). A /api/health endpoint checks database connectivity and that the pgvector extension is available.

## Key technical decisions

I decided to use Next.js which is a great framework to build full stack applications, specially monorepo. Also, can easily expand to be used only as frontend app. 

## Engineering standards (followed, and some skipped)

Type end to end for better maintainabilitty, linting, test, evals, db migration versioning, etc.

Lack of CI/CD as we don't have the app deployed, no auth, no caching, etc.

## How AI tools were used in development

Claude code, Anthropic models.

## What I'd do differently with more time

I would add auth, deploy to vercel and make useful the whole app. It's just a very simple app to showcase what's needed.
