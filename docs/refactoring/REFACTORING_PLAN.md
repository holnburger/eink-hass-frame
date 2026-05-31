# Refactoring Plan

This plan is intentionally sequential. Pick one task ID, preserve the listed contracts, keep the patch small, verify it, then update this file before moving on.

Status values:

- `Not started`
- `In progress`
- `Blocked`
- `Done`
- `Skipped`

## Current Task List

| ID | Status | Title |
| --- | --- | --- |
| RF-001 | Done | Separate test runners and clean tracked local artifacts |
| RF-002 | Done | Add contract characterization tests for layout normalization |
| RF-003 | Done | Add contract characterization tests for generated firmware config |
| RF-004 | Done | Extract firmware build route services |
| RF-005 | Done | Centralize server-side device host and OTA helpers |
| RF-006 | Done | Extract dashboard state hooks from `app/page.tsx` |
| RF-007 | Done | Extract editor components from `app/page.tsx` |
| RF-008 | Done | Extract preview pure helpers and fix preview lint warning |
| RF-009 | Done | Split preview pages and widgets into focused modules |
| RF-010 | Done | Extract firmware pure utilities from `main.cpp` |
| RF-011 | Done | Introduce firmware MQTT module boundary |
| RF-012 | Done | Introduce firmware Home Assistant module boundary |
| RF-013 | Done | Introduce firmware OTA/webserver/provisioning boundaries |
| RF-014 | Done | Expand CI quality gates |
| RF-015 | Done | Shrink firmware MQTT discovery and command code |
| RF-016 | Done | Consolidate firmware Home Assistant entity sync and state mapping |
| RF-017 | Done | Centralize firmware HTTP, binary download, and OTA helpers |
| RF-018 | Done | Extract device web page rendering helpers |
| RF-019 | Done | Extract firmware display, text, and media-cover helpers |
| RF-020 | Done | Flatten touch handling and main loop orchestration |
| RF-021 | Done | Rebalance firmware cleanup around maintainability and DRY |
| RF-022 | Done | Simplify firmware font selection and text helper branching |

## RF-001 Separate Test Runners And Clean Tracked Local Artifacts

Status: Done

Goal:

Make the test commands predictable before production refactors. `bun test` currently loads Playwright specs and fails, while `bun test lib scripts` passes. Remove tracked local report/state artifacts from version control without touching production behavior.

Protected contracts:

- C-011 Test Runner And Repository Hygiene
- C-004 Web Serial Manifest And First Flash
- C-009 Add-On, Docker, And Ingress Packaging

Implementation notes:

- Add a unit-test script that only targets Bun unit tests, for example `test:unit`.
- Keep `test:e2e` as the Playwright command.
- Update ignores for `.platformio/`, `playwright-report/`, and `test-results/` if needed.
- Remove tracked local artifacts from the index only, not from the user's working files unless explicitly requested.
- Do not change app behavior.

Verification commands:

- `bun test lib scripts`
- `bun run lint`
- `bun run test:e2e` when browser dependencies are available
- `git status --short`

Definition of done:

- Unit tests can be run without loading Playwright specs.
- Existing Playwright command remains available.
- Local generated report/state files are no longer tracked.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-28.
- Added `test` and `test:unit` scripts so Bun unit tests run through `bun test lib scripts`.
- Renamed the Playwright spec to `tests/home.e2e.ts` and configured Playwright to match `*.e2e.ts`, so raw `bun test` no longer imports Playwright specs.
- Updated the e2e font-selection assertion to use the current `Mono` font option.
- Added ignores for `/.platformio/`, `/playwright-report/`, and `/test-results/`.
- Removed `.platformio/.cache/telemetry.json`, `.platformio/appstate.json`, `playwright-report/index.html`, and `test-results/.last-run.json` from the Git index only; the local files remain on disk.
- Verification: `bun test lib scripts` passed, `bun run test:unit` passed, raw `bun test` passed, `bun run lint` passed with the pre-existing `components/dashboard/device-preview.tsx` unused `darkMode` warning, `bun run test:e2e` passed, and `git status --short` shows the generated artifact removals plus the RF-001 edits.

## RF-002 Add Contract Characterization Tests For Layout Normalization

Status: Done

Goal:

Lock down current layout normalization behavior before moving UI/editor/build code.

Protected contracts:

- C-001 Persisted Config And Browser Storage
- C-002 Layout Model And Firmware Header ABI
- C-007 MQTT Topics, Payloads, And Discovery

Implementation notes:

- Add focused Bun tests for `normalizeBuildConfig`, `createPageOfType`, `createWidget`, MQTT text widget name/mode normalization, and legacy layout migration.
- Cover page type rules: `weather-focus` and `media-player` pages have no widgets; overview widgets convert unsupported switch/button shapes as current behavior dictates.
- Cover limits: `MAX_PAGES`, widget caps, and media player binding fallback from `homeAssistant` to `homeAssistantBindings`.
- Do not refactor implementation in this task unless a test needs a tiny export.

Verification commands:

- `bun test lib`
- `bun run lint`

Definition of done:

- Existing normalization behavior is covered by tests.
- Tests document the current compatibility behavior.
- No production behavior changes.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-28.
- Added `lib/layout-config.test.ts` characterization coverage for `createWidget`, `createPageOfType`, `normalizeBuildConfig`, text widget MQTT name/mode normalization, legacy single-page migration, page/widget limits, weather/media no-widget page rules, overview/standard button-switch conversion, and media-player `homeAssistant` to `homeAssistantBindings` fallback.
- No production behavior changes.
- Verification: `bun test lib` passed with 14 tests, and `bun run lint` passed with the pre-existing `components/dashboard/device-preview.tsx` unused `darkMode` warning.

## RF-003 Add Contract Characterization Tests For Generated Firmware Config

Status: Done

Goal:

Protect the generated C++ header ABI before splitting the build route.

Protected contracts:

- C-002 Layout Model And Firmware Header ABI
- C-003 Firmware Build API And Artifact Export
- C-007 MQTT Topics, Payloads, And Discovery

Implementation notes:

- Extract only the minimum needed to test generated firmware config output, if not already exported.
- Snapshot or assert key generated strings for page/widget enum mapping, text MQTT modes, media entity arrays, Home Assistant URL/token defines, and widget field order.
- Avoid running PlatformIO in these unit tests.
- Keep generated header field names and enum values stable.

Verification commands:

- `bun test lib app scripts`
- `bun run lint`

Definition of done:

- Generated config contract has tests that fail on accidental ABI drift.
- No PlatformIO build is required for the tests.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-28.
- Exported the existing `createGeneratedConfig` helper from `app/api/firmware/build/route.ts` as the minimal test seam.
- Added `app/api/firmware/build/route.test.ts` characterization coverage for generated firmware header defines, page/widget enum values, text MQTT mode enum values, `UiWidgetConfig` and `UiPageConfig` field order, page/widget initializer order, text MQTT fields, media player entity arrays capped at four, and Home Assistant URL/token escaping.
- No PlatformIO build is required by these tests.
- Verification: `bun test lib app scripts` passed with 19 tests, and `bun run lint` passed with the pre-existing `components/dashboard/device-preview.tsx` unused `darkMode` warning.

## RF-004 Extract Firmware Build Route Services

Status: Done

Goal:

Turn `app/api/firmware/build/route.ts` into a thin route over testable services.

Protected contracts:

- C-002 Layout Model And Firmware Header ABI
- C-003 Firmware Build API And Artifact Export
- C-006 Home Assistant Integration
- C-007 MQTT Topics, Payloads, And Discovery

Implementation notes:

- Extract pure config/header generation after RF-003 has coverage.
- Extract validation for device Home Assistant config and exposed MQTT text widgets.
- Extract asset generation orchestration.
- Extract PlatformIO command runner and artifact export.
- Preserve response shapes, stage names, status codes, artifact names, env defaults, and log summarization.

Verification commands:

- `bun test lib app scripts`
- `bun run lint`
- `bun run build`
- `cd firmware && pio run -e m5papers3` if PlatformIO is available

Definition of done:

- Route file is mostly request parsing and response mapping.
- Extracted helpers are covered by unit tests where practical.
- Firmware build still exports the same artifacts.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-28.
- Added `lib/server/firmware-build.ts` for the build payload type, generated firmware config output, text widget MQTT collection/validation helpers, device Home Assistant requirement checks, command log summarization, PlatformIO runtime setup, firmware asset generation, command execution, and artifact export.
- Updated `app/api/firmware/build/route.ts` to focus on request parsing, validation response mapping, build stage response mapping, and success metadata.
- Updated `app/api/firmware/build/route.test.ts` to import generated config helpers from the service module and cover the extracted text widget validation, missing Home Assistant requirement, and command log summary helpers.
- Preserved `/api/firmware/build` response stages, status codes, artifact names, PlatformIO environment `m5papers3`, generated header ABI, text widget MQTT entity semantics, and local/add-on artifact paths.
- Verification: `bun test lib app scripts` passed with 22 tests, `bun run lint` passed with the pre-existing `components/dashboard/device-preview.tsx` unused `darkMode` warning, `bun run build` passed, and `cd firmware && pio run -e m5papers3` passed.

## RF-005 Centralize Server-Side Device Host And OTA Helpers

Status: Done

Goal:

Remove duplication between device health and OTA proxy routes while preserving OTA behavior.

Protected contracts:

- C-005 OTA Update Flow
- C-008 Device-Local Web And Automation Endpoints

Implementation notes:

- Extract `normalizeDeviceHost`, host allow-list validation, loopback detection, timeout fetch helper, and shared device response shaping into a server helper.
- Preserve current validation strictness unless deliberately expanded with tests.
- Add unit tests for host normalization and loopback detection.
- Keep direct upload and legacy URL fallback behavior unchanged.

Verification commands:

- `bun test lib app`
- `bun run lint`
- Manual dry-run check of `POST /api/device/ota` when a built artifact exists

Definition of done:

- Health and OTA routes use shared helpers.
- Unit tests cover helper behavior.
- OTA response shapes and statuses remain compatible.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-28.
- Added `lib/server/device-proxy.ts` for device host normalization, host allow-listing, loopback detection, host port stripping, device URL creation, timeout fetches, and device response body truncation.
- Updated `app/api/device/health/route.ts` and `app/api/device/ota/route.ts` to use the shared helpers while preserving response shapes, statuses, direct upload behavior, legacy URL fallback behavior, and loopback-host safeguards.
- Added `lib/server/device-proxy.test.ts` coverage for current host normalization/validation strictness, loopback detection, host port stripping, device URL creation, and body truncation.
- Verification: `bun test lib app` passed with 24 tests, `bun run lint` passed with the pre-existing `components/dashboard/device-preview.tsx` unused `darkMode` warning, and `bun run build` passed.
- Manual dry-run check: `POST /api/device/ota` with `dryRun: true` returned `ok: true`, `uploadReady: false`, the expected missing-artifact message, and a LAN firmware URL. Positive `uploadReady: true` dry-run was skipped because `.firmware-artifacts/firmware.bin` is not present in the local artifacts directory.

## RF-006 Extract Dashboard State Hooks From `app/page.tsx`

Status: Done

Goal:

Reduce the `app/page.tsx` monolith by moving stateful side effects into focused hooks.

Protected contracts:

- C-001 Persisted Config And Browser Storage
- C-006 Home Assistant Integration
- C-009 Add-On, Docker, And Ingress Packaging

Implementation notes:

- Extract one hook at a time:
  - `useRuntimeInfo`
  - `useSavedDevices`
  - `useHomeAssistantLiveStates`
  - `useTextWidgetMqttValidation`
  - `useLayoutEditor`
- Keep storage keys unchanged.
- Keep polling interval and debounce timing unchanged unless a contract change is approved.
- Keep Home Assistant add-on/Supervisor fallback behavior unchanged.

Verification commands:

- `bun test lib hooks app`
- `bun run lint`
- `bun run build`
- `bun run test:e2e`

Definition of done:

- `app/page.tsx` no longer owns low-level persistence/polling details.
- Extracted hooks have tests where practical.
- Existing onboarding and active-device Playwright flows still pass.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-29.
- Added focused hooks for runtime info and ingress path resolution, legacy Home Assistant session config migration, saved device persistence/active-device state, Home Assistant live-state polling, MQTT text-widget entity validation, and layout editor state/mutations.
- Kept browser storage keys unchanged: `hass.darkMode`, `hass.layout.hideWidgetBorders`, `hass.layout.font`, `hass.layout.pages`, `hass.layout.fullRefreshEvery`, `hass.homeAssistant`, `hass.savedDevices`, and `hass.activeDeviceId`.
- Preserved Home Assistant add-on/Supervisor fallback behavior, `/api/runtime-info` lookup behavior, `/api/home-assistant/states` polling at 5000 ms, and `/api/home-assistant/entity-presence` validation debounce at 350 ms.
- Added hook-adjacent characterization tests for the persisted saved-device shape and text-widget MQTT validation entity IDs, empty names, and duplicate layout names.
- Verification: `bun test lib hooks app` passed with 28 tests, `bun run lint` passed with the pre-existing `components/dashboard/device-preview.tsx` unused `darkMode` warning, `bun run build` passed, and `bun run test:e2e` passed with 3 tests after freeing port 3000.

## RF-007 Extract Editor Components From `app/page.tsx`

Status: Done

Goal:

Move editor render trees out of `app/page.tsx` after state hooks are stable.

Protected contracts:

- C-001 Persisted Config And Browser Storage
- C-002 Layout Model And Firmware Header ABI
- C-006 Home Assistant Integration
- C-007 MQTT Topics, Payloads, And Discovery

Implementation notes:

- Move `SliderIconPickerDialog`, `EditablePageTab`, `EditableWidgetCard`, page controls, widget controls, and media player binding controls into focused components.
- Avoid behavior changes while moving.
- Keep drag/reorder semantics unchanged.
- Keep Home Assistant entity picker props and supported-domain filtering unchanged.
- Keep text widget validation UI behavior unchanged.

Verification commands:

- `bun run lint`
- `bun run build`
- `bun run test:e2e`

Definition of done:

- `app/page.tsx` reads as page composition plus hook usage.
- Editor components are named by responsibility.
- Existing Playwright editor flows pass.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-29.
- Added `components/dashboard/layout-editor-card.tsx` and moved the editor render tree, `SliderIconPickerDialog`, `EditablePageTab`, `EditableWidgetCard`, page controls, widget controls, media-player binding controls, drag/reorder UI, and text-widget validation UI out of `app/page.tsx`.
- Kept the existing layout model mutations, page/widget conversion behavior, media-player binding behavior, Home Assistant entity picker props, supported-domain filtering, drag/reorder semantics, and text-widget validation display behavior unchanged.
- `app/page.tsx` now wires dashboard hooks and renders top-level page sections while delegating editor UI to `LayoutEditorCard`.
- Verification: `bun run lint` passed with the pre-existing `components/dashboard/device-preview.tsx` unused `darkMode` warning, `bun run build` passed, and `bun run test:e2e` passed with 3 tests.

## RF-008 Extract Preview Pure Helpers And Fix Preview Lint Warning

Status: Done

Goal:

Start reducing `components/dashboard/device-preview.tsx` by extracting pure preview helpers and removing the known lint warning.

Protected contracts:

- C-001 Persisted Config And Browser Storage
- C-006 Home Assistant Integration

Implementation notes:

- Move pure fallback/formatting helpers into a preview helper module:
  - weather icon condition mapping
  - weather daily/hourly fallback generation
  - thermostat history fallback generation
  - media title truncation
  - chart point calculations if practical
- Add unit tests for extracted helpers.
- Remove or use the unused `darkMode` prop in `PreviewOverviewWeather`.
- Do not change visual layout intentionally in this task.

Verification commands:

- `bun test lib components`
- `bun run lint`
- `bun run build`
- `bun run test:e2e`

Definition of done:

- Preview helper behavior has focused tests.
- ESLint warning in `device-preview.tsx` is gone.
- Visual output is intended to be unchanged.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-29.
- Added `components/dashboard/preview-helpers.ts` for weather condition icon mapping, weather daily/hourly fallback data, thermostat history fallback data, media title truncation, rain chance mapping, and temperature point labels.
- Added focused tests in `components/dashboard/preview-helpers.test.ts` covering extracted helper behavior and existing fallback output shapes.
- Removed the unused `darkMode` prop from `PreviewOverviewWeather`, clearing the known `device-preview.tsx` lint warning without changing the rendered overview weather layout.
- Verification: `bun test lib components` passed with 25 tests, `bun run lint` passed with no warnings, `bun run build` passed, and `bun run test:e2e` passed with 3 tests.

## RF-009 Split Preview Pages And Widgets Into Focused Modules

Status: Done

Goal:

Split the preview monolith into maintainable page and widget components.

Protected contracts:

- C-001 Persisted Config And Browser Storage
- C-002 Layout Model And Firmware Header ABI
- C-006 Home Assistant Integration

Implementation notes:

- Split only after RF-008 helper tests exist.
- Suggested structure:
  - `components/dashboard/preview/device-preview.tsx`
  - `components/dashboard/preview/widgets/*`
  - `components/dashboard/preview/pages/*`
  - `components/dashboard/preview/helpers.ts`
- Keep props explicit and typed.
- Avoid changing visual design or live preview navigation behavior.

Verification commands:

- `bun test lib components`
- `bun run lint`
- `bun run build`
- `bun run test:e2e`

Definition of done:

- Main preview component delegates page/widget rendering.
- Component files have focused responsibilities.
- Existing preview-related Playwright checks pass.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-29.
- Added `components/dashboard/preview/page-renderer.tsx` for preview page and widget rendering, including overview pages, weather-focus pages, media-player pages, standard page widgets, and their private preview subcomponents.
- Reduced `components/dashboard/device-preview.tsx` to the device shell, active-page clamping, page header, and preview navigation controls; it now delegates active page content to `PreviewPageRenderer`.
- Kept preview props, active-page navigation, Home Assistant state resolution, media-player fallback behavior, weather fallback behavior, widget rendering decisions, and visual output intended to be unchanged.
- Verification: `bun test lib components` passed with 25 tests, `bun run lint` passed, `bun run build` passed, and `bun run test:e2e` passed with 3 tests.

## RF-010 Extract Firmware Pure Utilities From `main.cpp`

Status: Done

Goal:

Create low-risk firmware module boundaries by moving pure utility code out of `firmware/src/main.cpp`.

Protected contracts:

- C-002 Layout Model And Firmware Header ABI
- C-010 Firmware Runtime Behavior

Implementation notes:

- Move pure helpers first, such as string normalization, UTF-8 helpers, clamping, URL parsing, temperature formatting, and topic path normalization.
- Prefer `.h/.cpp` files under `firmware/src` or `firmware/include` with explicit APIs.
- Avoid heap-heavy abstractions.
- Keep includes compatible with PlatformIO Arduino build.
- Do not alter boot, networking, MQTT, display, or OTA behavior in this task.

Verification commands:

- `cd firmware && pio run -e m5papers3`
- `bun run lint` if TypeScript files are touched

Definition of done:

- A pure utility subset is outside `main.cpp`.
- Firmware compiles.
- No runtime contracts are intentionally changed.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-29.
- Added `firmware/src/firmware_utils.h` and `firmware/src/firmware_utils.cpp` for pure helper code previously embedded in `firmware/src/main.cpp`.
- Moved display-safe text normalization, UTF-8 codepoint/count/copy helpers, integer clamping, tenths temperature formatting, MQTT topic path normalization, port parsing, boolean command payload parsing, and diagnostic text normalization.
- Reviewed this first firmware slice for unnecessary duplicate utility code and branchy helper logic; kept behavior-equivalent parsing and normalization semantics rather than broadening accepted payloads or topic formats.
- Preserved generated UI config consumption, firmware header ABI assumptions, display behavior, MQTT topic/payload contracts, and runtime control flow.
- Verification: `cd firmware && pio run -e m5papers3` passed.

## RF-011 Introduce Firmware MQTT Module Boundary

Status: Done

Goal:

Move MQTT config, topic construction, discovery, telemetry publishing, and message dispatch toward a focused module boundary.

Protected contracts:

- C-007 MQTT Topics, Payloads, And Discovery
- C-008 Device-Local Web And Automation Endpoints
- C-010 Firmware Runtime Behavior

Implementation notes:

- Start by extracting topic/discovery document helpers with exact output preservation.
- Keep `PubSubClient` lifecycle and reconnect behavior unchanged until helpers are covered by compile/manual checks.
- Preserve retained topic cleanup and legacy text widget command subscriptions.
- Keep memory use conservative.

Verification commands:

- `cd firmware && pio run -e m5papers3`
- Manual MQTT smoke test when hardware/broker is available

Definition of done:

- MQTT-related code has a clearer boundary without changing topics or payloads.
- Firmware compiles.
- Manual test notes are recorded if automated verification is not feasible.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-29.
- Added `firmware/src/mqtt_helpers.h` and `firmware/src/mqtt_helpers.cpp` as the first focused MQTT helper boundary.
- Moved text-widget discovery object suffix construction, discovery registry entry parsing/deduplication/appending, and MQTT text-widget command payload normalization out of `firmware/src/main.cpp`.
- Reviewed the extracted MQTT helper slice for unnecessary duplicate line-scanning and branch-heavy payload handling; kept exact discovery registry and notify/text payload semantics.
- Preserved MQTT topic names, command payload handling, Home Assistant discovery object IDs/unique IDs, retained stale discovery cleanup behavior, device-local routes, and MQTT reconnect/subscription lifecycle.
- Verification: `cd firmware && pio run -e m5papers3` passed.
- Manual MQTT smoke test was not run because no hardware/broker session is available in this environment.

## RF-012 Introduce Firmware Home Assistant Module Boundary

Status: Done

Goal:

Move Home Assistant HTTP, websocket, entity mapping, forecast, and service-call code toward a focused module boundary.

Protected contracts:

- C-006 Home Assistant Integration
- C-010 Firmware Runtime Behavior

Implementation notes:

- Start with request helpers and entity state application helpers that can move with minimal coupling.
- Preserve websocket subscribe/auth behavior and polling intervals.
- Preserve service payloads for switch, button, slider, thermostat, and media controls.
- Watch stack and heap use carefully.

Verification commands:

- `cd firmware && pio run -e m5papers3`
- Manual Home Assistant smoke test when hardware is available

Definition of done:

- Home Assistant logic is less interleaved with rendering and loop code.
- Firmware compiles.
- Existing HA behavior is manually verified or documented as unverified.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-29.
- Added `firmware/src/home_assistant_helpers.h` and `firmware/src/home_assistant_helpers.cpp` as the first focused Home Assistant helper boundary.
- Moved Home Assistant URL parsing, base/API/websocket URL construction, base-path joining, entity domain extraction, and entity-domain checks out of `firmware/src/main.cpp`.
- Reviewed this helper slice for unnecessary duplicated entity-domain parsing and repeated URL assembly branches; kept request URLs, websocket path construction, entity matching semantics, service payloads, auth flow, subscription behavior, and polling intervals unchanged.
- Preserved C-006 Home Assistant integration behavior and C-010 firmware runtime behavior.
- Verification: `cd firmware && pio run -e m5papers3` passed.
- Manual Home Assistant smoke test was not run because no hardware/Home Assistant session is available in this environment.

## RF-013 Introduce Firmware OTA/Webserver/Provisioning Boundaries

Status: Done

Goal:

Separate device-local webserver endpoints, OTA handlers, Wi-Fi credential handling, and Improv serial provisioning from the main firmware loop.

Protected contracts:

- C-004 Web Serial Manifest And First Flash
- C-005 OTA Update Flow
- C-008 Device-Local Web And Automation Endpoints
- C-010 Firmware Runtime Behavior

Implementation notes:

- Keep endpoint paths and response payloads unchanged.
- Keep direct upload and legacy URL OTA behavior unchanged.
- Keep serial provisioning packet behavior unchanged.
- Avoid changing retry timings or display status screens unless explicitly requested.

Verification commands:

- `cd firmware && pio run -e m5papers3`
- Manual OTA dry-run/upload test when hardware is available
- Manual Web Serial provisioning test when hardware is available

Definition of done:

- Webserver/OTA/provisioning responsibilities are separated from core loop code.
- Firmware compiles.
- Hardware-dependent verification status is documented.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-29.
- Added `firmware/src/device_web_helpers.h` and `firmware/src/device_web_helpers.cpp` as the first focused device-local web helper boundary.
- Moved root-page HTML escaping and the legacy `/api/ota` JSON string-field extraction helper out of `firmware/src/main.cpp`.
- Reviewed this helper slice for unnecessary branchy endpoint utility code; kept the exact escaping and legacy JSON extraction behavior instead of broadening request parsing.
- Preserved device-local route paths and response shapes, direct OTA upload behavior, legacy URL OTA fallback behavior, Web Serial/Improv provisioning packet behavior, retry timing, and display status screen behavior.
- Verification: `cd firmware && pio run -e m5papers3` passed.
- Manual OTA dry-run/upload and Web Serial provisioning tests were not run because no hardware session is available in this environment.

## RF-014 Expand CI Quality Gates

Status: Done

Goal:

Make CI catch regressions before Docker image publishing.

Protected contracts:

- C-003 Firmware Build API And Artifact Export
- C-009 Add-On, Docker, And Ingress Packaging
- C-011 Test Runner And Repository Hygiene

Implementation notes:

- Add a CI workflow or pre-publish job for:
  - install
  - lint
  - unit tests
  - web build
  - optional Playwright
  - optional firmware compile if PlatformIO setup time is acceptable
- Keep publish workflow behavior unchanged unless intentionally coordinated.
- Use cache scopes that do not mask missing dependencies.

Verification commands:

- Local equivalent of new CI commands.
- GitHub Actions dry-run is not available locally; inspect workflow syntax carefully.

Definition of done:

- PR/push quality gates exist independently of image publishing.
- Existing publish workflow still publishes expected tags.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-29.
- Added `.github/workflows/ci.yml` with independent pull request and push gates for Bun dependency install, lint, unit tests, web build, and PlatformIO firmware compile.
- Kept `.github/workflows/publish-images.yml` unchanged so runner/add-on image publishing, tags, build targets, and cache scopes remain intact.
- Cached Bun download artifacts and PlatformIO package/platform caches without caching `node_modules` or firmware build output.
- Verification: `bun run lint`, `bun run test:unit`, `bun run build`, and `cd firmware && pio run -e m5papers3` passed locally.
- GitHub Actions dry-run was not available locally; workflow syntax and publish-workflow isolation were inspected manually.

Follow-up notes:

- Updated on 2026-05-30 after the clean GitHub Actions firmware compile exposed missing ignored generated headers.
- Added `scripts/prepare-firmware-build.ts` and `firmware:prepare` to generate `firmware/include/generated_ui_config.h` plus icon/media headers through the existing firmware build helpers before CI runs PlatformIO.
- Updated CI cache steps to `actions/cache@v5`, which runs on Node.js 24, to address the Node 20 deprecation warning source.
- Verification: `bun run firmware:prepare`, `cd firmware && pio run -e m5papers3 -t clean`, `cd firmware && pio run -e m5papers3`, `bun run lint`, `bun run test:unit`, and `bun run build` passed locally.

## RF-015 Shrink Firmware MQTT Discovery And Command Code

Status: Done

Goal:

Reduce the repeated MQTT discovery, telemetry, subscription, and command-handling code in `firmware/src/main.cpp` while preserving every topic, payload, retained message, discovery document, and reconnect behavior.

Protected contracts:

- C-007 MQTT Topics, Payloads, And Discovery
- C-008 Device-Local Web And Automation Endpoints
- C-010 Firmware Runtime Behavior

Implementation notes:

- Build on `firmware/src/mqtt_helpers.*`; do not replace the existing `PubSubClient` lifecycle in the same patch.
- Convert repeated binary sensor and sensor discovery publishing calls into small fixed `static const` spec arrays plus shared publish loops.
- Keep text widget discovery special-cases explicit: `text` and `notify` components, default entity IDs, legacy text command subscriptions, retained state topics, and stale discovery cleanup.
- Extract topic/state helpers only when their output is preserved exactly.
- Avoid heap-heavy abstractions and avoid changing MQTT reconnect timing, last-will behavior, or retained telemetry publishing.

Verification commands:

- `cd firmware && pio run -e m5papers3`
- Manual MQTT smoke test when hardware and a broker are available

Definition of done:

- MQTT discovery and command code is visibly smaller and less repetitive.
- `firmware/src/main.cpp` delegates more MQTT formatting/publishing detail to helpers.
- MQTT contract differences are not intentional.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-30.
- Added fixed MQTT discovery spec structs and shared publishing loops for binary sensors and sensors.
- Extracted text widget discovery publishing into a named helper while preserving `text`, `notify`, default entity IDs, command topics, retained state topics, and legacy notify text subscriptions.
- Extracted retained legacy discovery cleanup and command-topic subscription loops.
- Preserved MQTT topic names, payloads, Home Assistant discovery payload fields, retained stale discovery cleanup, reconnect/last-will behavior, device-local route behavior, and firmware runtime behavior.
- Verification: `cd firmware && pio run -e m5papers3` passed.
- Manual MQTT smoke test was not run because no hardware/broker session is available in this environment.

## RF-016 Consolidate Firmware Home Assistant Entity Sync And State Mapping

Status: Done

Goal:

Reduce duplicated Home Assistant entity collection, de-duplication, widget state mapping, forecast handling, thermostat history handling, and service-call setup without changing Home Assistant behavior.

Protected contracts:

- C-006 Home Assistant Integration
- C-010 Firmware Runtime Behavior

Implementation notes:

- Add a fixed-capacity unique entity list helper for the repeated entity ID collection loops in `syncAllHomeAssistantEntityStates`.
- Keep media player pages, weather focus pages, companion hourly sensors, widget bindings, and thermostat history requests in the same sync order unless a test or manual note justifies otherwise.
- Split large state-application branches into focused internal helpers for switch/button, progress, slider, thermostat, weather, weather-focus page, media-player page, and history mapping.
- Preserve websocket auth/subscribe behavior, polling intervals, service payloads, weather forecast request payloads, and thermostat mode semantics.
- Keep ArduinoJson document sizes and stack/heap usage conservative.

Verification commands:

- `cd firmware && pio run -e m5papers3`
- Manual Home Assistant smoke test when hardware and a Home Assistant instance are available

Definition of done:

- Home Assistant sync and state mapping read as named steps instead of one long mixed block.
- Entity de-duplication logic is centralized.
- Home Assistant contracts are preserved or explicitly documented as unverified where hardware is unavailable.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-30.
- Added a fixed-capacity `UniqueEntityList` helper to centralize Home Assistant entity de-duplication while preserving first-seen request order.
- Extracted weather hourly companion sensor ID collection into a named helper and kept companion sensor entity ID shapes unchanged.
- Split widget state mapping into focused helpers for switch/button, progress, slider, thermostat, and weather widgets.
- Preserved Home Assistant entity sync order, weather forecast request order, optional hourly companion sensor requests, thermostat history requests, widget state mapping semantics, polling/websocket behavior, and conservative fixed-capacity storage.
- Verification: `cd firmware && pio run -e m5papers3` passed, and `git diff --check` passed.
- Manual Home Assistant smoke test was not run because no hardware/Home Assistant session is available in this environment.

## RF-017 Centralize Firmware HTTP, Binary Download, And OTA Helpers

Status: Done

Goal:

Remove duplicated HTTP setup, secure/insecure request branching, binary body streaming, and OTA transfer handling while keeping OTA and media-cover behavior compatible.

Protected contracts:

- C-005 OTA Update Flow
- C-006 Home Assistant Integration
- C-010 Firmware Runtime Behavior

Implementation notes:

- Extract a small HTTP helper layer for timeout setup, optional Bearer auth, secure/insecure client selection, and response status handling.
- Share binary body streaming paths used by media cover download and URL OTA where practical, while preserving current size limits, timeout values, and failure strings.
- Keep direct multipart OTA upload flow unchanged except for extracting upload state helpers if needed.
- Preserve OTA status screens, reboot delays, direct upload preference, and legacy URL OTA fallback behavior.
- Avoid changing TLS verification policy in this refactor; security behavior can be a separate approved contract-changing task later.

Verification commands:

- `cd firmware && pio run -e m5papers3`
- Manual OTA URL fallback and direct upload test when hardware is available
- Manual media-cover download check when Home Assistant media entities are available

Definition of done:

- HTTP and OTA transfer logic has fewer duplicated secure/insecure branches.
- Existing OTA and media-cover behaviors compile and remain contract-compatible.
- Hardware-dependent verification status is recorded.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-30.
- Added a shared HTTP setup helper for timeout setup and secure/insecure client selection, plus a shared Home Assistant authorization header helper.
- Updated media-cover binary downloads and Home Assistant API requests to use the shared HTTP setup path while preserving existing insecure HTTPS behavior.
- Extracted legacy URL OTA streaming into a named helper while preserving direct upload behavior, OTA timeout, progress logging, error strings, and reboot/status-screen behavior.
- Kept legacy URL OTA on the plain-client path; HTTPS behavior was not broadened in this refactor.
- Verification: `cd firmware && pio run -e m5papers3` passed.
- Manual OTA and media-cover smoke tests were not run because no hardware/Home Assistant session is available in this environment.

## RF-018 Extract Device Web Page Rendering Helpers

Status: Done

Goal:

Move the on-device root page HTML construction and repeated response helpers out of `firmware/src/main.cpp` while preserving all device-local endpoint paths and response shapes.

Protected contracts:

- C-005 OTA Update Flow
- C-008 Device-Local Web And Automation Endpoints
- C-010 Firmware Runtime Behavior

Implementation notes:

- Extend `firmware/src/device_web_helpers.*` with root-page rendering helpers and small append helpers.
- Keep `handleRoot`, `handleMqttConfigSave`, `handlePageControl`, `handleDarkModeControl`, OTA handlers, and automation switch handlers behaviorally unchanged.
- Preserve the root page's MQTT setup form, page controls, dark mode controls, topic display, OTA guidance, notice/error query handling, and HTML escaping.
- Do not change route registration or HTTP status codes in this task.

Verification commands:

- `cd firmware && pio run -e m5papers3`
- Manual checks of `GET /`, `GET /api/health`, `POST /api/mqtt`, `POST /api/page`, `POST /api/dark-mode`, `POST /api/ota`, `POST /api/ota/upload`, and `/api/automation-switch` when hardware is available

Definition of done:

- Device web page assembly no longer dominates `main.cpp`.
- Device-local route contracts are preserved.
- Manual endpoint verification status is recorded.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-30.
- Added `DeviceRootPageContext` and `renderDeviceRootPage` in `firmware/src/device_web_helpers.*`.
- Reduced `handleRoot` to collecting live firmware state, building escaped page options, and sending the rendered page.
- Preserved the device root page MQTT setup form, page controls, dark mode controls, topic display, OTA guidance, notice/error query behavior, HTML escaping, route path, and response status/content type.
- Verification: `cd firmware && pio run -e m5papers3` passed.
- Manual device-local endpoint checks were not run because no hardware session is available in this environment.

## RF-019 Extract Firmware Display, Text, And Media-Cover Helpers

Status: Done

Goal:

Separate display text/font utilities, shared drawing helpers, icon/weather rendering helpers, and media-cover decode/cache helpers from the main firmware orchestration.

Protected contracts:

- C-002 Layout Model And Firmware Header ABI
- C-006 Home Assistant Integration
- C-010 Firmware Runtime Behavior

Implementation notes:

- Extract in thin slices: text/font helpers first, then dither/icon/weather helpers, then media-cover download/decode/cache helpers.
- Keep generated UI config consumption, custom font fallback order, text truncation behavior, gray/mono theme helpers, and FastEPD mode usage unchanged.
- Keep media-cover buffer size, PSRAM fallback allocation, JPEG decode crop/scale behavior, and cover fetch backoff unchanged.
- Avoid moving widget/page `.inc` rendering code until shared dependencies are clearly separated.

Verification commands:

- `cd firmware && pio run -e m5papers3`
- Manual display smoke test when hardware is available, covering standard, overview, weather-focus, media-player, and dark mode pages

Definition of done:

- Shared drawing and media-cover helpers live behind focused internal module boundaries.
- Page/widget rendering output is intended to be unchanged.
- Display refresh and memory-use contracts are preserved.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-30.
- Added `firmware/src/media_cover_helpers.h` and `firmware/src/media_cover_helpers.cpp`.
- Moved PSRAM-aware media-cover buffer allocation, packed 4-bpp buffer fill/write helpers, ordered gray quantization, and JPEG magic detection out of `firmware/src/main.cpp`.
- Kept media-cover buffer size, packed pixel format, ordered dithering matrix, PSRAM fallback allocation behavior, JPEG decode crop/scale behavior, and cover fetch backoff unchanged.
- Left the highly coupled FastEPD text/font and page/widget rendering helpers in `main.cpp` for a future smaller display-only task rather than broadening this patch.
- Verification: `cd firmware && pio run -e m5papers3` passed.
- Manual display smoke test was not run because no hardware session is available in this environment.

## RF-020 Flatten Touch Handling And Main Loop Orchestration

Status: Done

Goal:

Make touch input and the main loop read as small named steps while preserving all timing, refresh, navigation, widget action, network, MQTT, and Home Assistant behavior.

Protected contracts:

- C-007 MQTT Topics, Payloads, And Discovery
- C-008 Device-Local Web And Automation Endpoints
- C-010 Firmware Runtime Behavior

Implementation notes:

- Split touch mapping, navigation hits, media-player hits, switch/button hits, slider hits, and thermostat hits into small internal helpers.
- Keep touch coordinate mappings, debounce timing, expanded hit padding, optimistic redraw behavior, touch-idle full refresh scheduling, and serial log messages compatible.
- Split `loop()` into named steps for serial provisioning, connected network services, Wi-Fi retry, webserver polling, and display loop.
- Preserve Wi-Fi retry timing, MQTT telemetry interval, MQTT loop error handling, Home Assistant websocket loop, and Home Assistant polling intervals.

Verification commands:

- `cd firmware && pio run -e m5papers3`
- Manual touch smoke test when hardware is available, covering page navigation, media controls, switch/button, slider, thermostat mode, and thermostat temperature controls
- Manual Wi-Fi reconnect/MQTT/Home Assistant loop observation when hardware is available

Definition of done:

- Touch handling and `loop()` orchestration are easier to scan without changing behavior.
- Timing-sensitive behavior remains documented and preserved.
- Hardware-dependent verification status is recorded.
- Plan status and notes are updated.

Completion notes:

- Completed on 2026-05-30.
- Extracted page navigation touch handling and media-player touch handling into named helpers while preserving coordinate mappings, debounce timing, hit padding, optimistic redraw behavior, idle refresh scheduling, service calls, MQTT page-state publishing, and serial log message shapes.
- Split the main `loop()` into named steps for connected network services, Wi-Fi retry, device webserver polling, and display loop execution.
- Preserved Wi-Fi retry timing, MQTT reconnect/loop/error handling, telemetry interval, Home Assistant websocket loop, Home Assistant polling intervals, and display loop order.
- Verification: `cd firmware && pio run -e m5papers3` passed.
- Manual touch, Wi-Fi reconnect, MQTT, and Home Assistant smoke tests were not run because no hardware/broker/Home Assistant session is available in this environment.

Size check notes:

- Baseline before RF-017 through RF-020, after RF-015/RF-016: hand-written firmware total `12839` lines, `firmware/src/main.cpp` `8905` lines, firmware binary `1804381` bytes.
- After RF-017 through RF-020: hand-written firmware total `12943` lines, `firmware/src/main.cpp` `8728` lines, firmware binary `1805881` bytes.
- `main.cpp` shrank by `177` lines, but total hand-written firmware grew by `104` lines and firmware binary grew by `1500` bytes.
- Added contract `C-012 Firmware Maintainability And DRY Refactor Goal` and follow-up `RF-021` because this cleanup improved structure, while its size signals showed extraction overhead that should be checked for avoidable duplication.

## RF-021 Rebalance Firmware Cleanup Around Maintainability And DRY

Status: Done

Goal:

Review the RF-017 through RF-020 helper extraction through a maintainability and DRY lens. Remove avoidable duplication or helper overhead where it improves readability, while treating code size as a signal rather than the primary goal.

Protected contracts:

- C-005 OTA Update Flow
- C-006 Home Assistant Integration
- C-007 MQTT Topics, Payloads, And Discovery
- C-008 Device-Local Web And Automation Endpoints
- C-010 Firmware Runtime Behavior
- C-012 Firmware Maintainability And DRY Refactor Goal

Implementation notes:

- Start from the RF-020 size check: total hand-written firmware `12943` lines, `main.cpp` `8728` lines, firmware binary `1805881` bytes. Use these values to identify avoidable helper overhead, not as strict pass/fail thresholds.
- Reduce repeated helper boilerplate introduced during extraction when it makes the code clearer, especially root-page rendering context setup, repeated topic/context strings, and small wrapper helpers that do not pay for themselves.
- Prefer deleting duplication and naming shared behavior over compressing formatting-only lines; do not minify HTML/CSS merely to improve line counts.
- Keep the device root page content, routes, response shapes, MQTT topics, Home Assistant behavior, OTA flows, touch behavior, and display refresh timing unchanged.
- If source or binary size does not decrease, record the reason. Add a follow-up only when the remaining growth comes from avoidable duplication, branch sprawl, or unclear helper boundaries.

Verification commands:

- `cd firmware && pio run -e m5papers3`
- `git diff --check`
- Hand-written firmware line-count command excluding generated headers and fonts

Definition of done:

- Avoidable duplication or helper overhead discovered in RF-017 through RF-020 is either removed or captured in a focused follow-up task.
- Firmware compiles when production code changes.
- Before/after source and binary size signals are recorded when practical.
- Plan status and notes are updated with maintainability-focused outcomes.

Completion notes:

- Completed on 2026-05-30.
- Removed redundant precomputed device-root MQTT topic fields from `DeviceRootPageContext`; the renderer now derives the displayed topic strings from the already-provided base topic prefix.
- Kept the rendered root-page topic values unchanged for page command/state/index, dark-mode command/state, and availability.
- Cleaned up the `C-011`/`C-012` contract documentation structure so generated/local artifact hygiene remains under `C-011` and firmware maintainability/DRY cleanup is isolated under `C-012`.
- Size before RF-021: hand-written firmware total `12943` lines, `firmware/src/main.cpp` `8728` lines, firmware binary `1805881` bytes.
- Size after RF-021: hand-written firmware total `12931` lines, `firmware/src/main.cpp` `8722` lines, firmware binary `1805389` bytes.
- RF-021 reduced total source by `12` lines, `main.cpp` by `6` lines, and firmware binary by `492` bytes compared with the RF-020 size check.
- The firmware binary remains `1008` bytes larger than the RF-016 baseline because RF-017 through RF-020 introduced helper boundaries; this is recorded as a size signal rather than a failure by itself.
- Updated after maintainer feedback on 2026-05-30: redesigned `C-012` so readability, clear structure, and DRY behavior are the contract; line count and binary size are supporting signals, not rigid goals.
- Added `RF-022` to target the remaining branch-heavy font/text helper code as a focused maintainability task.
- Verification: `cd firmware && pio run -e m5papers3` passed, `git diff --check` passed, and the hand-written firmware line-count command recorded the RF-021 size signals.

## RF-022 Simplify Firmware Font Selection And Text Helper Branching

Status: Done

Goal:

Make firmware font and text helper selection easier to read and maintain by reducing repeated `if`/`else` ladders and keeping fallback behavior in one obvious place.

Protected contracts:

- C-002 Layout Model And Firmware Header ABI
- C-010 Firmware Runtime Behavior
- C-012 Firmware Maintainability And DRY Refactor Goal

Implementation notes:

- Inspect the current font selection helpers, text measurement/drawing helpers, and any page/widget `.inc` call sites before editing.
- Replace repeated font-selection branches with named helpers or small fixed lookup tables only where that makes the fallback order clearer.
- Preserve generated UI config consumption, custom font fallback order, text truncation behavior, gray/mono theme helpers, display refresh behavior, and FastEPD font lifetime assumptions.
- Keep memory use conservative; avoid dynamic allocation or heap-heavy containers.
- Do not change generated UI ABI, page/widget rendering semantics, or Home Assistant-derived display state handling.

Verification commands:

- `cd firmware && pio run -e m5papers3`
- `git diff --check`
- Manual display smoke test when hardware is available, covering configured custom fonts plus standard, overview, weather-focus, media-player, and dark mode pages

Definition of done:

- Font/text selection reads as a centralized, named flow instead of repeated branch-heavy code.
- DRY improvements are demonstrable without cryptic one-liners or minified formatting.
- Firmware compiles.
- Size signals are recorded as context, not mandatory pass/fail thresholds.
- Hardware-dependent verification status is recorded.

Completion notes:

- Completed on 2026-05-30.
- Re-checked `RF-021` against the redesigned `C-012` contract before starting; no redo was needed because RF-021 already removed avoidable duplicated root-page topic context and recorded size signals as context rather than a strict goal.
- Replaced repeated runtime font fallback `#if`/`#elif` ladders in `firmware/src/main.cpp` with named compile-time fallback constants for accent, page title, media title, body, meta, widget meta, and text-widget fonts.
- Kept fallback resolution at compile time instead of using global font pointer tables, so unused fallback font assets stay unreferenced by the linker.
- Removed the text-widget-local font selection switch from `firmware/src/ui/widgets/text_widget.inc`; text widgets now use the centralized `getUiTextWidgetFont()` helper.
- Preserved generated `UI_FONT_NAME` profile behavior, custom font fallback order, text-widget drawing behavior, FastEPD font lifetime assumptions, display refresh behavior, and generated UI ABI.
- Size before RF-022, from RF-021 notes: hand-written firmware total `12931` lines, `firmware/src/main.cpp` `8722` lines, PlatformIO flash used `1805389` bytes.
- Size after RF-022: hand-written firmware total `12997` lines, `firmware/src/main.cpp` `8821` lines, `firmware/src/ui/widgets/text_widget.inc` `260` lines, PlatformIO flash used `1805389` bytes, and `.pio/build/m5papers3/firmware.bin` file size `1805760` bytes.
- Source lines increased because the old fallback chains are now named once as compile-time constants; this was kept because it improves readability and avoids the binary-size regression seen with global font pointer tables.
- Verification: `cd firmware && pio run -e m5papers3` passed, and `git diff --check` passed.
- Manual display smoke test was not run because no hardware session is available in this environment.

## Plan Update Protocol

After completing a task:

1. Change its status.
2. Add a short note under the task with date, files changed, and verification results.
3. If new work is discovered, add a new task ID instead of expanding the current task indefinitely.
4. Keep protected contract references current.
