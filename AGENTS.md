# Repository Agent Guide

This guide applies to the whole `eink-hass-frame` repository.

## Maintainer Workflow

For any cleanup, refactor, restructuring, maintenance, testing, or documentation task in this repo:

1. Read `.agents/skills/eink-hass-frame-maintainer/SKILL.md`.
2. Read `docs/refactoring/CONTRACTS.md`.
3. Read `docs/refactoring/REFACTORING_PLAN.md`.
4. Select one task ID from the refactoring plan before editing production code, unless the user explicitly asks for analysis-only or docs-only work.
5. State the selected task ID and the contracts it protects in the working summary.
6. Preserve the protected contracts unless the user explicitly approves a contract change.
7. Keep patches small and reviewable. Prefer characterization tests around existing behavior before risky movement.
8. Update `docs/refactoring/REFACTORING_PLAN.md` after completing refactoring work so the task status, notes, and verification reflect reality.

## Protected Areas

Treat these as contract-sensitive:

- Home Assistant add-on configuration and ingress behavior.
- `/api/firmware/*`, `/api/device/*`, and `/api/home-assistant/*` route shapes.
- Web Serial manifest shape and artifact offsets.
- Firmware artifact names and storage paths.
- Persisted browser storage keys and layout config migration behavior.
- MQTT topic names, command payloads, state payloads, retained discovery documents, and availability behavior.
- Device-local endpoints such as `/api/health`, `/api/ota`, `/api/ota/upload`, `/api/mqtt`, `/api/page`, `/api/dark-mode`, and `/api/automation-switch`.
- Wi-Fi provisioning, OTA, MQTT, Home Assistant websocket, and display refresh timing behavior in firmware.

## Verification Defaults

Use the smallest relevant verification set for the selected task.

- Unit tests: `bun test lib scripts`
- Full Bun test caveat: `bun test` currently loads Playwright specs and fails until task `RF-001` separates test runners.
- Lint: `bun run lint`
- Web build: `bun run build`
- Playwright: `bun run test:e2e`
- Firmware build: `cd firmware && pio run -e m5papers3`

If a verification command is unavailable or intentionally skipped, record why in the plan update and final summary.

## Production Code Constraint

When the user requests analysis-only or docs-only work, do not edit production code under `app/`, `components/`, `hooks/`, `lib/`, `scripts/`, or `firmware/` except for documentation or explicitly requested skill/agent guidance updates.
