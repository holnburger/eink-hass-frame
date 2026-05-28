---
name: eink-hass-frame-maintainer
description: Use this skill when working on the eink-hass-frame repository: cleaning up, refactoring, restructuring, maintaining, testing, or documenting the mixed Next.js/React/Bun web app, Home Assistant add-on, PlatformIO ESP32-S3/M5PaperS3 firmware, MQTT, OTA, and Web Serial code. Trigger for requests about code organization, architecture, maintainability, spaghetti code, build reliability, CI, firmware/web boundaries, and safe refactors.
---

# E-Ink HASS Frame Maintainer Skill

You are maintaining `holnburger/eink-hass-frame`, a mixed web + embedded + Home Assistant add-on repository.

The repository has three major domains:

1. Web dashboard / add-on UI
   - Next.js App Router
   - React + TypeScript
   - Bun scripts
   - Tailwind / UI components
   - Playwright end-to-end tests
   - Home Assistant Supervisor/add-on context

2. Firmware
   - PlatformIO
   - ESP32-S3 / M5PaperS3
   - FastEPD rendering
   - C / C++
   - Wi-Fi provisioning
   - MQTT control and discovery
   - OTA upload endpoint
   - Web Serial first-flash flow

3. Integration contracts
   - The web dashboard builds firmware artifacts.
   - The firmware consumes generated layout/config data.
   - MQTT topics and Home Assistant discovery payloads must remain stable.
   - OTA, manifest, artifacts, and serial flashing flows must not be broken by refactors.

## Core behavior

When asked to clean up, refactor, restructure, or maintain the repo:

1. First read the repo-local refactoring guidance:
   - `AGENTS.md`
   - `docs/refactoring/CONTRACTS.md`
   - `docs/refactoring/REFACTORING_PLAN.md`

2. Select exactly one task ID from `docs/refactoring/REFACTORING_PLAN.md` before editing production code, unless the user explicitly asks for analysis-only, docs-only, or a broader planning update. State the selected task ID in your working summary.

3. Preserve the protected contracts listed for that task. If the requested change would alter a protected contract, stop and ask for explicit approval before making the contract change.

4. First map the affected domain:
   - UI/dashboard
   - API route/backend helper
   - firmware rendering
   - firmware networking/MQTT/OTA
   - build tooling
   - Docker/Home Assistant add-on packaging
   - tests/docs

5. Do not start with broad rewrites.
   Prefer small, reviewable changes:
   - extract types
   - split large files
   - isolate side effects
   - name contracts explicitly
   - add thin tests around current behavior
   - only then refactor implementation

6. Preserve external contracts unless the user explicitly asks to change them:
   - MQTT topic names and payloads
   - Home Assistant discovery structure
   - `/api/firmware/*` routes
   - OTA upload behavior
   - Web Serial flashing manifest
   - persisted dashboard/device config format
   - firmware build artifact paths
   - Docker/Home Assistant add-on config conventions

7. For every refactor, produce:
   - what changed
   - why it improves maintainability
   - which contract was preserved
   - how to verify it

8. Before editing, inspect:
   - `package.json`
   - relevant files under `app/`, `components/`, `lib/`, `hooks/`
   - relevant files under `firmware/src`, `firmware/include`, `firmware/platformio.ini`
   - tests and Playwright config when UI behavior is involved
   - Docker/Home Assistant files when packaging is involved

9. After completing refactoring work, update `docs/refactoring/REFACTORING_PLAN.md`:
   - change the task status
   - record files changed
   - record verification commands and results
   - add new task IDs for newly discovered follow-up work instead of silently broadening scope

## Verification commands

Use available commands when relevant:

- Web lint:
  `bun run lint`

- Web build:
  `bun run build`

- Playwright E2E:
  `bun run test:e2e`

- Firmware build:
  `cd firmware && pio run`

If a command is not available in the current environment, explain that and still perform a static review.

## Refactoring rules for the web app

- Prefer typed domain models in `lib/` over ad-hoc object shapes inside components.
- Keep React components focused on rendering and interaction.
- Move build, filesystem, Home Assistant, firmware, and network side effects into server-side helpers.
- Avoid duplicating constants across UI and API routes.
- If a component mixes layout, data transformation, and side effects, split it into:
  - pure domain helper
  - state/hook layer
  - presentational component

## Refactoring rules for firmware

- Be conservative with memory usage.
- Avoid heap-heavy abstractions unless clearly justified.
- Keep rendering, networking, MQTT, OTA, and config parsing separated.
- Prefer explicit state structs over scattered globals where possible.
- Avoid changing boot/provisioning behavior unless requested.
- Keep display update behavior predictable; avoid unnecessary full refreshes.
- Treat battery percentage as approximate unless hardware/fuel gauge support changes.

## Tests and maintainability

When cleaning up code, prefer adding characterization tests before risky changes.

For TypeScript:
- add or improve unit tests for pure helpers
- add Playwright coverage for critical dashboard flows
- ensure build/lint passes

For firmware:
- compile after changes
- isolate pure formatting/topic/config functions where feasible
- document manually testable hardware flows when automated tests are not realistic

## Documentation

When behavior is clarified or stabilized, update docs close to the relevant domain:

- README for user-facing setup
- `firmware/README.md` for device behavior, MQTT, OTA, flashing
- inline comments only for non-obvious constraints, not obvious code

## Output style

When responding, be practical and direct.

For cleanup plans:
- group findings by risk and payoff
- recommend an order of work
- avoid abstract architecture advice without naming files/modules

For code changes:
- keep patches small
- do not rename public contracts casually
- after changes, summarize verification status
