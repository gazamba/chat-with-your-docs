# Engineering notes & decisions

Short log of non-obvious choices and deliberate simplifications. The full
architecture write-up lives in the README (owner-authored).

## Structure

- **Turborepo monorepo**, kept so more apps/packages can be added later.
  - `apps/web` — the Next.js RAG app (API routes + UI + eval + integration tests).
  - `packages/db` (`@repo/db`) — Drizzle schema, `postgres-js` client, pgvector migration.
  - `packages/rag` (`@repo/rag`) — extract · chunk · embed · store · retrieve · llm ·
    prompt · logger · config. Pure-ish domain logic, unit-tested here.
  - `packages/{eslint-config,typescript-config}` — shared config (from create-turbo).
- Removed the create-turbo demo placeholders (`apps/docs`, `packages/ui`); the real
  shared packages above replace them. A shared `@repo/ui` can return when a second app
  needs shared components — deferred to avoid premature abstraction.

## Database

- One datastore for metadata **and** embeddings: Postgres + pgvector.
- Driver is `drizzle-orm/postgres-js`, chosen because the **same code path works for both**
  the local `pgvector/pgvector:pg16` container and a **Neon** `DATABASE_URL` (TCP + SSL).
  `neon-http` was avoided since it only talks to Neon and would break local Docker.
- `prepare: false` on the client for compatibility with pooled connections (Neon pgbouncer).
- Migration handwritten (`packages/db/drizzle/0000_init.sql`) so the pgvector extension and
  the HNSW `vector_cosine_ops` index are created deterministically.

## Retrieval & answers

- Chunking is recursive/boundary-aware (~2000 chars, ~200 overlap), backing up to
  the last natural break (paragraph > sentence > line) so chunks don't split
  mid-sentence.
- Retrieval over-fetches (topK×3), removes near-duplicates (word Jaccard), then
  caps by count and total context chars.
- Citations are **numbered** (`[1]`, `[2]`) rather than `[filename]` so the UI can
  map each citation to a specific passage (multiple chunks can share a filename).
- `document.content` stores the full extracted text so the source panel can show
  the whole document with the cited passage highlighted.
- Anti-hallucination: the grounded prompt refuses verbatim when context is
  insufficient, and the chat route short-circuits to that refusal on zero retrieval.

## Observability & eval

- pino structured logs carry a request id across ingest → retrieve → LLM, plus
  latency, token counts, and an estimated USD cost per request.
- `eval/` harness reports retrieval hit-rate, answer accuracy, and groundedness
  (Haiku as LLM-as-judge) over a fixed Q&A set across the sample docs.

## Deliberately out of scope (noted limitations)

- No auth / multi-tenancy.
- Ingestion is inline in the request (no durable job queue); fine for local-first.
- Rate limiting is in-memory (per-process), not distributed.
