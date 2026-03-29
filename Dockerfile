FROM oven/bun:1.3.10 AS deps
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

FROM oven/bun:1.3.10 AS builder
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
ENV PLATFORMIO_CORE_DIR=/app/.platformio
RUN pip install --no-cache-dir platformio
COPY --from=deps /usr/local/bin/bun /usr/local/bin/bun
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=deps /app/node_modules/@iconify-json ./node_modules/@iconify-json
COPY --from=deps /app/node_modules/@resvg ./node_modules/@resvg
COPY --from=builder /app/public ./public
COPY --from=builder /app/firmware ./firmware
COPY --from=builder /app/scripts ./scripts
EXPOSE 3000
CMD ["bun", "server.js"]

FROM runner AS addon
ENV HOME_ASSISTANT_ADDON=1
ENV PORT=8099
ENV PLATFORMIO_CORE_DIR=/data/.platformio
ENV EINK_HASS_FRAME_DATA_DIR=/data/eink-hass-frame
EXPOSE 8099
CMD ["bun", "scripts/start-addon.mjs"]
