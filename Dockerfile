FROM oven/bun:1.2 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM python:3.12-slim AS dev
WORKDIR /app
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
RUN pip install --no-cache-dir platformio
COPY --from=deps /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.2 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM python:3.12-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN pip install --no-cache-dir platformio
COPY --from=deps /usr/local/bin/bun /usr/local/bin/bun
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/firmware ./firmware
COPY --from=builder /app/scripts/generate-mdi-icons.cjs ./scripts/generate-mdi-icons.cjs
COPY --from=builder /app/scripts/start-addon.mjs ./scripts/start-addon.mjs
EXPOSE 3000
CMD ["bun", "server.js"]

FROM runner AS addon
ENV HOME_ASSISTANT_ADDON=1
ENV PORT=8099
ENV PLATFORMIO_CORE_DIR=/data/.platformio
ENV EINK_HASS_FRAME_DATA_DIR=/data/eink-hass-frame
EXPOSE 8099
CMD ["bun", "scripts/start-addon.mjs"]
