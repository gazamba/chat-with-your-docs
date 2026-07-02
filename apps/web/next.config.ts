import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compile the workspace packages from TypeScript source.
  transpilePackages: ["@repo/db", "@repo/rag"],
  // Keep native/node-only deps out of the bundle.
  serverExternalPackages: ["postgres", "pino"],
};

export default nextConfig;
