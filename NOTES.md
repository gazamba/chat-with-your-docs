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

## Deliberately out of scope (noted limitations)

- No auth / multi-tenancy.
- Ingestion is inline in the request (no durable job queue); fine for local-first.
- Rate limiting is in-memory (per-process), not distributed.
