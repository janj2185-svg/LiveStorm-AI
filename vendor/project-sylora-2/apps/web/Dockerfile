FROM node:22-alpine AS deps
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S sylora && adduser -S sylora -G sylora

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/scripts ./scripts
COPY infrastructure/postgres/auth-schema.sql /auth-schema.sql

ENV AUTH_SCHEMA_PATH=/auth-schema.sql

RUN chmod +x ./scripts/docker-entrypoint.sh \
  && chown -R sylora:sylora /app /auth-schema.sql

USER sylora
EXPOSE 3000
ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
