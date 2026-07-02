import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@repo/db";
import { requestLogger } from "@repo/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe. Confirms the database is reachable and that the
 * pgvector extension is installed (embeddings are unusable without it).
 */
export async function GET() {
  const log = requestLogger(crypto.randomUUID(), { route: "health" });
  const startedAt = performance.now();

  try {
    await db.execute(sql`select 1`);
    const ext = await db.execute(
      sql`select 1 from pg_extension where extname = 'vector'`,
    );
    const vectorReady = ext.length > 0;

    const latencyMs = Math.round(performance.now() - startedAt);
    const body = {
      status: vectorReady ? "ok" : "degraded",
      db: "up" as const,
      pgvector: vectorReady,
      latencyMs,
    };
    log.info(body, "health check");
    return NextResponse.json(body, { status: vectorReady ? 200 : 503 });
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startedAt);
    log.error({ err: error, latencyMs }, "health check failed");
    return NextResponse.json(
      { status: "error", db: "down", pgvector: false, latencyMs },
      { status: 503 },
    );
  }
}
