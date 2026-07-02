import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

// Cache the connection across dev hot-reloads and serverless invocations so we
// don't exhaust the pool.
const globalForDb = globalThis as unknown as {
  __ragSql?: postgres.Sql;
  __ragDb?: Db;
};

export function getSql(): postgres.Sql {
  if (!globalForDb.__ragSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    // `prepare: false` keeps us compatible with pooled connections (e.g. Neon).
    globalForDb.__ragSql = postgres(url, { max: 10, prepare: false });
  }
  return globalForDb.__ragSql;
}

export function getDb(): Db {
  if (!globalForDb.__ragDb) {
    globalForDb.__ragDb = drizzle(getSql(), { schema });
  }
  return globalForDb.__ragDb;
}

// Lazy proxy so importing `db` never opens a connection at module-eval time
// (which would break `next build`, where DATABASE_URL may be absent).
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});
