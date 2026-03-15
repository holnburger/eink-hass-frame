# E-Ink Home Assistant Frame

Next.js app + firmware workspace for managing M5PaperS3 e-ink devices with a minimal grayscale interface.

## Stack

- Next.js (App Router)
- Tailwind CSS
- shadcn-style component setup
- Playwright E2E tests
- Docker (multi-stage Bun image)
- PlatformIO firmware project using FastEPD

## Features

- Device dashboard for e-ink page configuration
- Page controls for widgets (clock, weather, progress)
- Theme controls (font profile + dark/light UI)
- Partial refresh policy controls
- One-click firmware build from web UI (`Build Firmware`)
- Optional Wi-Fi credentials embedded at build time for first-boot auto-connect
- Optional secure Wi-Fi credential injection via server env vars (`FIRMWARE_WIFI_SSID`, `FIRMWARE_WIFI_PASSWORD`)
- USB first-flash from browser (Web Serial via `esp-web-tools`)
- Automatic device IP detection from serial logs after Wi-Fi connect
- OTA update trigger form for subsequent firmware upgrades

## Local Development

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

```bash
docker compose up
```

App runs at [http://localhost:3000](http://localhost:3000).

This is now the live development setup:

- source changes are mounted directly into the container
- Next.js runs in dev mode with hot reload
- firmware artifacts and caches stay inside named Docker volumes

You only need `docker compose up --build` again when dependencies or the Docker image itself changed.

To keep Wi-Fi credentials out of the browser UI/localStorage, set them as env vars before starting:

```bash
export FIRMWARE_WIFI_SSID="YourSSID"
export FIRMWARE_WIFI_PASSWORD="YourPassword"
docker compose up
```

For a production-style container build, use the `prod` profile:

```bash
docker compose --profile prod up --build eink-hass-frame-prod
```

## Playwright

```bash
bunx playwright install chromium
bun run test:e2e
```

## Firmware

See [`firmware/README.md`](./firmware/README.md) for FastEPD + PlatformIO setup.

### Local `pio run` with Wi-Fi credentials

If you build firmware directly with PlatformIO (outside the web UI), credentials can be loaded from `firmware/.env`.

```bash
cp firmware/.env.example firmware/.env
# edit firmware/.env
cd firmware
pio run -e m5papers3
```

`WIFI_SSID` / `WIFI_PASSWORD` are injected at compile-time via `firmware/tools/load_env.py`.

### USB Web Flashing

1. Start the container and open the dashboard.
2. Configure the page/theme options.
3. Click `Build Firmware` in the USB card.
4. After build success, click install and flash via USB.
5. Click `I finished flashing`, name the device, and save it as active for OTA.
6. Optionally connect serial to read boot/IP logs.

The web app build endpoint compiles firmware with PlatformIO and stores artifacts in backend storage (`/.firmware-artifacts`). Flashing uses backend API routes directly.

### OTA

The web app sends:

```json
{
  "firmwareUrl": "http://your-server.local/m5paper/firmware.bin"
}
```

to `http://<device-ip>/api/ota`.

Implement secure OTA validation before production usage.
