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
| RF-001 | Not started | Separate test runners and clean tracked local artifacts |
| RF-002 | Not started | Add contract characterization tests for layout normalization |
| RF-003 | Not started | Add contract characterization tests for generated firmware config |
| RF-004 | Not started | Extract firmware build route services |
| RF-005 | Not started | Centralize server-side device host and OTA helpers |
| RF-006 | Not started | Extract dashboard state hooks from `app/page.tsx` |
| RF-007 | Not started | Extract editor components from `app/page.tsx` |
| RF-008 | Not started | Extract preview pure helpers and fix preview lint warning |
| RF-009 | Not started | Split preview pages and widgets into focused modules |
| RF-010 | Not started | Extract firmware pure utilities from `main.cpp` |
| RF-011 | Not started | Introduce firmware MQTT module boundary |
| RF-012 | Not started | Introduce firmware Home Assistant module boundary |
| RF-013 | Not started | Introduce firmware OTA/webserver/provisioning boundaries |
| RF-014 | Not started | Expand CI quality gates |

## RF-001 Separate Test Runners And Clean Tracked Local Artifacts

Status: Not started

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

## RF-002 Add Contract Characterization Tests For Layout Normalization

Status: Not started

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

## RF-003 Add Contract Characterization Tests For Generated Firmware Config

Status: Not started

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

## RF-004 Extract Firmware Build Route Services

Status: Not started

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

## RF-005 Centralize Server-Side Device Host And OTA Helpers

Status: Not started

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

## RF-006 Extract Dashboard State Hooks From `app/page.tsx`

Status: Not started

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

## RF-007 Extract Editor Components From `app/page.tsx`

Status: Not started

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

## RF-008 Extract Preview Pure Helpers And Fix Preview Lint Warning

Status: Not started

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

## RF-009 Split Preview Pages And Widgets Into Focused Modules

Status: Not started

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

## RF-010 Extract Firmware Pure Utilities From `main.cpp`

Status: Not started

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

## RF-011 Introduce Firmware MQTT Module Boundary

Status: Not started

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

## RF-012 Introduce Firmware Home Assistant Module Boundary

Status: Not started

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

## RF-013 Introduce Firmware OTA/Webserver/Provisioning Boundaries

Status: Not started

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

## RF-014 Expand CI Quality Gates

Status: Not started

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

## Plan Update Protocol

After completing a task:

1. Change its status.
2. Add a short note under the task with date, files changed, and verification results.
3. If new work is discovered, add a new task ID instead of expanding the current task indefinitely.
4. Keep protected contract references current.
