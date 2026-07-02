import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

// Load env from the nearest .env when run directly (Docker passes env instead).
for (const path of [".env", "../../.env"]) {
  if (existsSync(path)) {
    loadEnv({ path });
    break;
  }
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
const sql = postgres(url, { max: 1 });

try {
  await migrate(drizzle(sql), { migrationsFolder });
  console.log("[db] migrations applied");
} finally {
  await sql.end();
}
