# Multi-stage build for the monorepo web app.
# Local-first: the runner keeps the toolchain so it can run DB migrations on
# startup before serving. Image size is traded for operational simplicity.
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# --- deps: install with a warm, cacheable layer keyed on manifests only ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/rag/package.json packages/rag/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- build: compile the Next.js app ---
FROM deps AS build
COPY . .
RUN pnpm --filter web build

# --- runner: full workspace so `next start` + tsx migrations both work ---
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
# Apply migrations, then start the server.
CMD ["sh", "-c", "pnpm --filter @repo/db db:migrate && pnpm --filter web start"]
