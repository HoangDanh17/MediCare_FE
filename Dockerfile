# syntax=docker/dockerfile:1

# 1. Cài dependencies theo đúng bun.lock (tách layer để cache).
FROM docker.io/oven/bun:1.4.2-slim AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 2. Build Next.js (Turbopack mặc định ở Next 16).
FROM docker.io/oven/bun:1.4.2-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# 3. Runtime tối giản: chỉ Node + output standalone, chạy user không phải root.
FROM docker.io/library/node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# API_BASE_URL là server-only, truyền lúc chạy: docker run -e API_BASE_URL=...
CMD ["node", "server.js"]
