import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

// Load the monorepo-root .env so `next dev`/`start` pick up DATABASE_URL and the
// API keys. Next only auto-loads env from the app directory; in Docker the vars
// come from the environment, so a missing file here is fine (dotenv no-ops and
// never overrides already-set vars).
loadEnv({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/db", "@repo/rag"],
  serverExternalPackages: ["postgres", "pino"],
};

export default nextConfig;
