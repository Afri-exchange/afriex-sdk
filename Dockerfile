# Build from the monorepo root:
#   docker build -t afriex-mcp-server .
#
# Lives at the repo root (not packages/mcp-server/) on purpose: this is a
# pnpm + Turborepo workspace, so @afriex/mcp-server can't be built in
# isolation — it depends on sibling packages (@afriex/sdk, @afriex/core,
# etc.) via "workspace:*" and every package's tsconfig.json extends the root
# tsconfig.base.json. The build context has to be the whole repo, and
# platforms that build straight from a Dockerfile (e.g. Coolify's Dockerfile
# build pack) use one "Base Directory" setting for both the build context and
# where they look for a file literally named `Dockerfile` — so root is the
# only placement that works without extra configuration.
#
# `turbo prune` trims the monorepo down to just this package and its
# dependency graph before installing/building, so the final image doesn't
# carry every package in the workspace.

FROM node:22-bookworm-slim AS base
RUN corepack enable

# ---- Prune the monorepo down to what @afriex/mcp-server actually needs ----
FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo@2.9.5
COPY . .
RUN turbo prune @afriex/mcp-server --docker

# ---- Install deps (cached separately from source so edits don't bust it) and build ----
FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
# turbo prune only carries files inside workspace packages — every package's
# tsconfig.json extends this root file via a relative path, so it has to be
# copied in separately from the original build context or tsc fails with
# "Cannot read file 'tsconfig.base.json'".
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm turbo run build --filter=@afriex/mcp-server

# ---- Minimal runtime image ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
# SQLite file for the custom OAuth provider (registered clients, refresh
# tokens, signing key). Mount a persistent volume at /data — losing this
# file invalidates every issued token and forces clients to re-register.
ENV OAUTH_DB_PATH=/data/afriex-mcp-oauth.db

RUN mkdir -p /data && chown node:node /data
COPY --from=installer --chown=node:node /app .

VOLUME ["/data"]
EXPOSE 3001
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Auth mode is controlled by AFRIEX_MCP_AUTH_MODE at deploy time (defaults to
# "api-key"), not baked in here, so the same image works for any mode —
# set AFRIEX_MCP_AUTH_MODE=oauth in the environment to enable OAuth.
CMD ["node", "packages/mcp-server/dist/index.js", "--http"]
