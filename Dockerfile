FROM node:20-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# ─── Copy workspace manifests (layer-cached when unchanged) ───────────────────
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all source packages required by the api-server
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

# ─── Install workspace dependencies ───────────────────────────────────────────
RUN pnpm install --frozen-lockfile

# ─── Install tiktok-live-connector ────────────────────────────────────────────
# This package is intentionally kept out of the pnpm lockfile because its
# transitive dep (es5-ext) runs a broken postinstall in restricted environments.
# On a normal VPS/Docker host this installs cleanly.
# The || true means the build continues even if install fails; in that case,
# set TIKTOK_MODE=demo or the server will emit a friendly error.
RUN cd artifacts/api-server && npm install tiktok-live-connector --ignore-scripts 2>&1 || \
    echo "⚠ WARNING: tiktok-live-connector install failed. TIKTOK_MODE=real will show an error to clients."

# ─── Build ────────────────────────────────────────────────────────────────────
RUN pnpm --filter @workspace/api-server run build

# ─── Runtime ──────────────────────────────────────────────────────────────────
EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080
# Set TIKTOK_MODE=real via docker-compose.yml or -e flag; default is demo
ENV TIKTOK_MODE=demo

CMD ["node", "--enable-source-maps", "/app/artifacts/api-server/dist/index.mjs"]
