ARG BUILD_VERSION=dev
ARG BUILD_ARCH=amd64
ARG REPOSITORY_URL=https://github.com/holnburger/eink-hass-frame

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

FROM node:22-bookworm-slim AS runner
ARG BUILD_VERSION
ARG REPOSITORY_URL
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV PLATFORMIO_CORE_DIR=/app/.platformio
ENV PATH=/opt/platformio/bin:$PATH
LABEL org.opencontainers.image.title="eink-hass-frame" \
      org.opencontainers.image.description="Next.js dashboard and firmware builder for M5PaperS3 e-ink dashboards." \
      org.opencontainers.image.source="${REPOSITORY_URL}" \
      org.opencontainers.image.version="${BUILD_VERSION}"
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
  && python3 -m venv /opt/platformio \
  && /opt/platformio/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/platformio/bin/pip install --no-cache-dir platformio \
  && rm -rf /var/lib/apt/lists/* \
  && ln -sf /opt/platformio/bin/pio /usr/local/bin/pio \
  && ln -sf /opt/platformio/bin/platformio /usr/local/bin/platformio
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=deps /app/node_modules/@iconify-json ./node_modules/@iconify-json
COPY --from=deps /app/node_modules/@resvg ./node_modules/@resvg
COPY --from=builder /app/public ./public
COPY --from=builder /app/firmware ./firmware
COPY --from=builder /app/scripts ./scripts
EXPOSE 3000
CMD ["node", "server.js"]

FROM runner AS addon
ARG BUILD_VERSION
ARG BUILD_ARCH
ARG REPOSITORY_URL
ENV HOME_ASSISTANT_ADDON=1
ENV PORT=8099
ENV PLATFORMIO_CORE_DIR=/data/.platformio
ENV EINK_HASS_FRAME_DATA_DIR=/data/eink-hass-frame
LABEL io.hass.type="addon" \
      io.hass.version="${BUILD_VERSION}" \
      io.hass.arch="${BUILD_ARCH}" \
      org.opencontainers.image.title="eink-hass-frame-addon" \
      org.opencontainers.image.source="${REPOSITORY_URL}" \
      org.opencontainers.image.version="${BUILD_VERSION}"
EXPOSE 8099
CMD ["node", "scripts/start-addon.mjs"]
