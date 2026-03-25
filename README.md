# E-Ink Home Assistant Frame

Next.js app + firmware workspace for managing M5PaperS3 e-ink devices with a minimal grayscale interface.

The repository can now also be used as a Home Assistant app folder for local installation through the Supervisor app store.

## Stack

- Next.js (App Router)
- Tailwind CSS
- shadcn-style component setup
- Playwright E2E tests
- Docker (multi-stage Bun image)
- PlatformIO firmware project using FastEPD

## Features

- Device dashboard for e-ink page configuration
- Home Assistant connection from the web configurator
- Entity search + binding for weather, progress, switch, slider, and thermostat widgets
- Live browser preview updates from bound Home Assistant entities
- Direct ESP-to-Home Assistant sync for bound widgets, including touch-driven service calls
- Page controls for widgets (clock, weather, progress)
- Theme controls (font profile + dark/light UI)
- Partial refresh policy controls
- One-click firmware build from web UI (`Build Firmware`)
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

To keep device Home Assistant credentials out of the browser UI/localStorage, set them as env vars before starting:

```bash
export DEVICE_HOME_ASSISTANT_URL="https://homeassistant.local:8123"
export DEVICE_HOME_ASSISTANT_TOKEN="your-long-lived-token"
docker compose up
```

The web build validates that device Home Assistant credentials are present
before compiling firmware. Wi-Fi is provisioned during the USB flashing flow.

For a production-style container build, use the `prod` profile:

```bash
docker compose --profile prod up --build eink-hass-frame-prod
```

## Home Assistant Add-on

This repository now includes a Home Assistant app definition at the repo root:

- `config.yaml` for Supervisor metadata and options
- `DOCS.md` for app usage notes
- `translations/en.yaml` for option labels

To install it as a local add-on:

1. Copy or clone this repository into `/addons/eink-hass-frame` on your Home Assistant host.
2. Reload the local app repository or restart Home Assistant.
3. Install `E-Ink HASS Frame` from the App Store.

In app mode:

- dashboard entity search and preview use the Supervisor Home Assistant proxy automatically
- firmware builds require device-facing Home Assistant URL/token values from app options
- Wi-Fi is provisioned during the USB flashing flow instead of being managed by the app
- firmware artifacts are stored under `/data/eink-hass-frame`
- the app uses internal port `8099` instead of the usual local dev port `3000`

## Playwright

```bash
bunx playwright install chromium
bun run test:e2e
```

## Firmware

See [`firmware/README.md`](./firmware/README.md) for FastEPD + PlatformIO setup.

### Local `pio run`

If you build firmware directly with PlatformIO (outside the web UI), you can still load optional fallback Wi-Fi credentials from `firmware/.env`.

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

The web app uploads the built firmware directly to `http://<device-ip>/api/ota/upload`.

For older devices that only support URL-based OTA, the server falls back to
calling `http://<device-ip>/api/ota` with a firmware URL derived from the
current app host when that host is LAN-reachable.

Implement secure OTA validation before production usage.

## Home Assistant

1. In standalone Docker or local development, enter your Home Assistant base URL and a long-lived access token in the dashboard.
2. In app mode, the dashboard uses the Supervisor proxy automatically, while firmware builds use the required device credentials from app options.
3. Search for entities directly inside widget cards and bind them to supported widget types.
4. Build firmware after configuring the connection if you want the device itself to subscribe to Home Assistant updates.

The browser stores the Home Assistant settings locally. Firmware builds embed the same URL and token so the device can fetch state updates and send service calls directly.
