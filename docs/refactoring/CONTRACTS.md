# Refactoring Contracts

These contracts are the behavior that refactoring work must preserve unless the user explicitly approves a contract change. When a task touches a contract, add characterization tests or manual verification notes before changing implementation structure.

## Contract Change Rule

A contract change requires:

- Explicit user approval.
- A migration or compatibility story.
- Updated docs in this directory and user-facing docs when relevant.
- Verification that old supported flows either still work or fail with a clear intentional error.

## C-001 Persisted Config And Browser Storage

Protected behavior:

- Existing layout and device data must continue to load from current browser storage keys:
  - `hass.darkMode`
  - `hass.layout.hideWidgetBorders`
  - `hass.layout.font`
  - `hass.layout.pages`
  - `hass.layout.fullRefreshEvery`
  - `hass.savedDevices`
  - `hass.activeDeviceId`
- Session-scoped Home Assistant connection data uses `hass.homeAssistant`.
- The legacy local-storage `hass.homeAssistant` migration into session storage must remain compatible.
- `normalizeBuildConfig` must continue accepting legacy single-page options such as `pageName`, `showClock`, `showWeather`, `showProgress`, `showSwitch`, and `progressValue`.
- Saved device records keep the shape `{ id, name, ip, lastSeen }`.

Primary files:

- `app/page.tsx`
- `hooks/use-local-storage.ts`
- `lib/layout-config.ts`
- `lib/home-assistant.ts`

## C-002 Layout Model And Firmware Header ABI

Protected behavior:

- `BuildConfig`, `PageConfig`, and `WidgetConfig` meanings remain stable.
- Generated `generated_ui_config.h` keeps enum values and struct fields compatible with firmware consumers unless an explicit migration is approved.
- Page types remain mapped to firmware page enum values:
  - `standard`
  - `overview`
  - `weather-focus`
  - `media-player`
- Widget types remain mapped to firmware widget enum values:
  - `clock`
  - `weather`
  - `progress`
  - `switch`
  - `button`
  - `slider`
  - `thermostat`
  - `text`
  - `title`
- Text widget MQTT modes remain `text` and `notify`.
- Media player pages support up to four Home Assistant media entities.

Primary files:

- `lib/layout-config.ts`
- `app/api/firmware/build/route.ts`
- `firmware/src/main.cpp`
- `firmware/src/ui/**/*.inc`

## C-003 Firmware Build API And Artifact Export

Protected behavior:

- `POST /api/firmware/build` accepts the current build payload and returns JSON with `ok`, `stage` on failure, `error`, optional `details`, `log`, and success metadata including `buildId`, `pageCount`, `widgetCount`, and `artifacts`.
- Missing device Home Assistant URL/token validation remains clear and happens before PlatformIO build.
- Invalid or duplicate exposed MQTT text widget names fail validation before PlatformIO build.
- PlatformIO environment remains `m5papers3`.
- Exported artifact names remain:
  - `bootloader.bin`
  - `partitions.bin`
  - `firmware.bin`
- Artifact storage remains compatible with local mode and add-on mode:
  - local: `.firmware-artifacts` under `process.cwd()`
  - add-on: `/data/eink-hass-frame/.firmware-artifacts` unless overridden by `EINK_HASS_FRAME_DATA_DIR`

Primary files:

- `app/api/firmware/build/route.ts`
- `lib/server/firmware-artifacts.ts`
- `lib/server/home-assistant-runtime.ts`
- `Dockerfile`
- `firmware/platformio.ini`

## C-004 Web Serial Manifest And First Flash

Protected behavior:

- `GET /api/firmware/manifest` returns an ESP Web Tools-compatible manifest.
- Manifest parts preserve paths and offsets:
  - `bootloader.bin` at `0`
  - `partitions.bin` at `32768`
  - `firmware.bin` at `65536`
- Manifest continues to set `improv: true` and `new_install_improv_wait_time`.
- Ingress path rewriting must keep manifest artifact URLs usable through Home Assistant ingress.
- Browser first-flash flow continues to use Web Serial-compatible artifacts.

Primary files:

- `app/api/firmware/manifest/route.ts`
- `app/api/firmware/artifacts/[name]/route.ts`
- `components/dashboard/usb-flash.tsx`
- `components/dashboard/usb-install-button.tsx`
- `scripts/start-addon.mjs`

## C-005 OTA Update Flow

Protected behavior:

- Web app OTA proxy accepts `deviceIp` and optional `dryRun` at `POST /api/device/ota`.
- Direct upload remains the preferred OTA path via device endpoint `POST /api/ota/upload` with multipart field `update`.
- Legacy URL OTA fallback remains available via device endpoint `POST /api/ota` with JSON `firmwareUrl`.
- Dry run reports artifact readiness and firmware URL availability without starting an update.
- `POST /api/device/health` checks `http://<device>/api/health`.
- Loopback-host safeguards for legacy OTA fallback remain intact.

Primary files:

- `app/api/device/ota/route.ts`
- `app/api/device/health/route.ts`
- `components/dashboard/ota-flash.tsx`
- `firmware/src/main.cpp`

## C-006 Home Assistant Integration

Protected behavior:

- In add-on mode, server-side Home Assistant requests can use Supervisor core API and `SUPERVISOR_TOKEN`.
- Device firmware builds must use a LAN-reachable Home Assistant URL and long-lived token.
- `POST /api/home-assistant/entities` searches and filters entity summaries by query, widget type, or domains.
- `POST /api/home-assistant/states` returns selected states, weather forecasts, hourly companion sensors, and thermostat history when requested.
- `POST /api/home-assistant/entity-presence` validates existing entity IDs.
- Weather, media player, slider, switch/button, progress, and thermostat mapping semantics remain stable.

Primary files:

- `lib/home-assistant.ts`
- `lib/server/home-assistant.ts`
- `lib/server/home-assistant-runtime.ts`
- `app/api/home-assistant/*/route.ts`
- `firmware/src/main.cpp`

## C-007 MQTT Topics, Payloads, And Discovery

Protected behavior:

- Default topic prefix remains `m5papers3/<device-slug>` when no custom prefix is configured.
- Availability payloads remain `online` and `offline`.
- Page command topic remains `<prefix>/page/set`; accepted payloads include page name, page number, `next`, and `previous`.
- Page state topics remain `<prefix>/page/state` and `<prefix>/page/index`.
- Dark mode command topic remains `<prefix>/dark_mode/set`; accepted payloads include boolean-like values and `toggle`.
- Dark mode state topic remains `<prefix>/dark_mode/state` with `ON` or `OFF`.
- Telemetry topics remain under:
  - `power/usb_power_connected`
  - `power/battery_level`
  - `status/wifi_connected`
  - `status/home_assistant_connected`
  - `diagnostics/wifi_rssi`
  - `diagnostics/uptime_seconds`
  - `diagnostics/free_heap_bytes`
  - `diagnostics/free_psram_bytes`
  - `diagnostics/ip_address`
  - `diagnostics/firmware_version`
  - `diagnostics/build_id`
  - `diagnostics/last_mqtt_error`
  - `diagnostics/last_home_assistant_error`
- Text widget topics remain:
  - `<prefix>/widgets/text/<mqttName>/state`
  - `<prefix>/widgets/text/<mqttName>/set`
  - `<prefix>/widgets/notify/<mqttName>/set`
  - legacy text command subscriptions where currently supported
- Home Assistant discovery topic structure and payload fields remain compatible.
- Retained stale discovery cleanup continues to work.

Primary files:

- `firmware/src/main.cpp`
- `lib/layout-config.ts`
- `app/api/firmware/build/route.ts`

## C-008 Device-Local Web And Automation Endpoints

Protected behavior:

- Device-local routes remain available:
  - `GET /`
  - `GET /api/health`
  - `POST /api/mqtt`
  - `POST /api/page`
  - `POST /api/dark-mode`
  - `POST /api/ota`
  - `POST /api/ota/upload`
  - `GET /api/automation-switch`
  - `POST /api/automation-switch`
- Device root page continues to expose MQTT setup, page control, dark mode control, topic display, and OTA guidance.
- Automation switch endpoint continues to target the primary switch widget behavior.

Primary files:

- `firmware/src/main.cpp`

## C-009 Add-On, Docker, And Ingress Packaging

Protected behavior:

- Home Assistant add-on `config.yaml` schema keys remain:
  - `device_home_assistant_url`
  - `device_home_assistant_token`
- Add-on ingress remains enabled on port `8099`.
- Optional direct UI port remains `8099/tcp`.
- Add-on startup continues through `scripts/start-addon.mjs`.
- Ingress response rewriting keeps `/_next/`, `/api/`, `/mock/`, and `/favicon.ico` usable under ingress paths.
- Runtime data defaults remain compatible:
  - `HOME_ASSISTANT_ADDON=1`
  - `EINK_HASS_FRAME_DATA_DIR=/data/eink-hass-frame`
  - `PLATFORMIO_CORE_DIR=/data/.platformio`

Primary files:

- `config.yaml`
- `Dockerfile`
- `scripts/start-addon.mjs`
- `lib/server/ingress.ts`
- `lib/runtime-info.ts`
- `app/api/runtime-info/route.ts`

## C-010 Firmware Runtime Behavior

Protected behavior:

- Boot, Wi-Fi credential loading, Improv serial provisioning, and retry loops remain compatible.
- Display refresh behavior remains predictable; avoid unnecessary full refreshes.
- Touch input behavior and page navigation remain compatible.
- Home Assistant websocket plus periodic polling behavior remain compatible.
- MQTT reconnect, last-will, retained telemetry, and discovery behavior remain compatible.
- OTA success and failure screens remain readable on device.
- Memory use remains conservative; avoid heap-heavy abstractions in firmware refactors.

Primary files:

- `firmware/src/main.cpp`
- `firmware/src/ui/**/*.inc`
- `firmware/include/device_config.h`

## C-011 Test Runner And Repository Hygiene

Protected behavior:

- Playwright tests remain under `tests/` and run through `bun run test:e2e`.
- Bun unit tests should run without importing Playwright specs once task `RF-001` is complete.
- Generated or local state artifacts should not be committed:
  - `.next/`
  - `node_modules/`
  - `firmware/.pio/`
  - `.platformio/`
  - `playwright-report/`
  - `test-results/`
  - `firmware/include/generated_*`

Primary files:

- `package.json`
- `.gitignore`
- `.dockerignore`
- `playwright.config.ts`
- `.github/workflows/*`

## C-012 Firmware Maintainability And DRY Refactor Goal

Refactoring goal:

- Firmware cleanup refactors should make the code easier to read, reason about, and safely modify. Clean structure, named responsibilities, and DRY behavior are the primary goals.
- Prefer named helpers, small fixed data tables, and single-source selection or formatting logic when they remove repeated branch-heavy code without hiding behavior. Font selection, theme/display text selection, topic construction, and root-page rendering are explicit candidates for this treatment.
- Treat source line counts and firmware binary size as review signals to record and explain, not hard pass/fail gates. A small increase can be acceptable when it buys clearer structure, and a smaller patch is not acceptable if it becomes cryptic or harder to maintain.
- Avoid line-count games: do not minify HTML, CSS, or C++ formatting; do not pack unrelated work into one-liners; and do not add indirection whose only benefit is fewer lines.
- For firmware cleanup tasks, record before/after size signals when practical:
  - total hand-written firmware lines under `firmware/src` and `firmware/include`, excluding generated headers and fonts
  - `firmware/src/main.cpp` line count
  - PlatformIO firmware binary size from `cd firmware && pio run -e m5papers3`
- If a readability refactor reduces `main.cpp` but increases total hand-written firmware lines or binary size, record the tradeoff and add a focused follow-up only when the growth appears to come from avoidable duplication, branch sprawl, or helper overhead.
- Keep memory use conservative; avoid heap-heavy abstractions in firmware refactors.
- Contract-preserving readability and DRY improvements must not change MQTT, OTA, Home Assistant, display refresh, provisioning, Web Serial, or device-local endpoint behavior.

Primary files:

- `docs/refactoring/REFACTORING_PLAN.md`
- `firmware/src/main.cpp`
- `firmware/src/**/*.cpp`
- `firmware/src/**/*.h`
- `firmware/src/ui/**/*.inc`
