import { spawn } from "node:child_process";
import { copyFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import {
  countWidgets,
  normalizeBuildConfig,
} from "@/lib/layout-config";
import {
  ensureArtifactsDir,
  FIRMWARE_ARTIFACTS,
  getArtifactsDir,
  getBuildOutputDir,
} from "@/lib/server/firmware-artifacts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BuildPayload = {
  darkMode?: boolean;
  fontName?: string;
  partialRefreshMs?: number;
  fullRefreshEvery?: number;
  pages?: unknown[];
  wifiSsid?: string;
  wifiPassword?: string;
  pageName?: string;
  showClock?: boolean;
  showWeather?: boolean;
  showProgress?: boolean;
  showSwitch?: boolean;
  progressValue?: number;
};

function sanitizeCString(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/\"/g, '\\"').replace(/[\r\n]/g, " ");
}

function normalizeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function normalizeThermostatTenths(value: unknown, fallbackTenths: number, stepTenths: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallbackTenths;
  }
  const clamped = Math.max(12, Math.min(30, parsed));
  const tenths = Math.round(clamped * 10);
  const snapped = Math.round(tenths / stepTenths) * stepTenths;
  return Math.max(120, Math.min(300, snapped));
}

function widgetTypeToCpp(type: string) {
  switch (type) {
    case "clock":
      return "UI_WIDGET_CLOCK";
    case "weather":
      return "UI_WIDGET_WEATHER";
    case "progress":
      return "UI_WIDGET_PROGRESS";
    case "switch":
      return "UI_WIDGET_SWITCH";
    case "slider":
      return "UI_WIDGET_SLIDER";
    case "thermostat":
      return "UI_WIDGET_THERMOSTAT";
    default:
      return "UI_WIDGET_NONE";
  }
}

function clockStyleToCpp(style: unknown) {
  return style === "analog" ? "UI_CLOCK_ANALOG" : "UI_CLOCK_DIGITAL";
}

function pageTypeToCpp(type: unknown) {
  if (type === "weather-focus") {
    return "UI_PAGE_WEATHER_FOCUS";
  }
  if (type === "media-player") {
    return "UI_PAGE_MEDIA_PLAYER";
  }
  return "UI_PAGE_STANDARD";
}

async function runCommand(command: string, args: string[], cwd: string) {
  return new Promise<{ code: number; log: string }>((resolve) => {
    const child = spawn(command, args, { cwd, env: process.env });
    let log = "";

    child.stdout.on("data", (chunk) => {
      log += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      log += chunk.toString();
    });

    child.on("close", (code) => {
      resolve({ code: code ?? 1, log });
    });
  });
}

function createGeneratedConfig(payload: BuildPayload, buildId: string) {
  const config = normalizeBuildConfig(payload);
  const fontName = sanitizeCString(config.fontName);
  const escapedBuildId = sanitizeCString(buildId);
  const payloadSsid = (payload.wifiSsid ?? "").trim();
  const payloadPassword = (payload.wifiPassword ?? "").trim();
  const envSsid = (process.env.FIRMWARE_WIFI_SSID ?? "").trim();
  const envPassword = (process.env.FIRMWARE_WIFI_PASSWORD ?? "").trim();
  const wifiSsid = sanitizeCString(payloadSsid || envSsid);
  const wifiPassword = sanitizeCString(payloadPassword || envPassword);
  const homeAssistantUrl = sanitizeCString(config.homeAssistant.url);
  const homeAssistantToken = sanitizeCString(config.homeAssistant.token);
  const partialRefreshMs = normalizeNumber(config.partialRefreshMs, 30000);
  const fullRefreshEvery = normalizeNumber(config.fullRefreshEvery, 60);
  const maxWidgetsPerPage = Math.max(1, ...config.pages.map((page) => page.widgets.length));
  const emptyWidget = "{UI_WIDGET_NONE, \"\", \"\", 0, 0, 100, 0, UI_CLOCK_DIGITAL, 1, 0, 0, \"\"}";

  const pageSource = config.pages
    .map((page) => {
      const widgets = page.widgets
        .map((widget) => {
          const label = sanitizeCString(widget.label);
          const icon = sanitizeCString(widget.type === "slider" ? (widget.icon ?? "lightbulb") : "");
          const isThermostat = widget.type === "thermostat";
          const value = isThermostat ? normalizeThermostatTenths(widget.value, 225, 5) : normalizeNumber(widget.value, 0);
          const currentValue = isThermostat ? normalizeThermostatTenths(widget.currentValue, 205, 1) : normalizeNumber(widget.currentValue, 0);
          const maxValue = isThermostat ? normalizeThermostatTenths(widget.max, 300, 5) : normalizeNumber(widget.max, 100);
          const enabled = widget.enabled ? 1 : 0;
          const clockStyle = clockStyleToCpp(widget.clockStyle);
          const showSeconds = widget.showSeconds !== false ? 1 : 0;
          const showHistoryGraph =
            widget.type === "thermostat" && widget.showHistoryGraph === true
              ? 1
              : 0;
          const hideWhenUnavailable =
            widget.type === "progress" && widget.hideWhenUnavailable === true
              ? 1
              : 0;
          const entityId = sanitizeCString(widget.homeAssistant?.entityId ?? "");
          return `{${widgetTypeToCpp(widget.type)}, "${label}", "${icon}", ${value}, ${currentValue}, ${maxValue}, ${enabled}, ${clockStyle}, ${showSeconds}, ${showHistoryGraph}, ${hideWhenUnavailable}, "${entityId}"}`;
        })
        .concat(Array.from({ length: Math.max(0, maxWidgetsPerPage - page.widgets.length) }, () => emptyWidget))
        .join(", ");
      const pageEntityId = sanitizeCString(page.homeAssistant?.entityId ?? "");

      return `  {${pageTypeToCpp(page.type)}, "${sanitizeCString(page.name)}", ${page.widgets.length}, "${pageEntityId}", {${widgets}}}`;
    })
    .join(",\n");

  return `#pragma once

#include <stdint.h>

// Auto-generated by web build endpoint. Do not edit manually.
#define UI_FONT_NAME "${fontName}"
#define UI_THEME_DARK ${config.darkMode ? 1 : 0}
#define UI_BUILD_ID "${escapedBuildId}"
#define PARTIAL_REFRESH_MS_OVERRIDE ${partialRefreshMs}
#define FULL_REFRESH_EVERY_N_PARTIALS_OVERRIDE ${fullRefreshEvery}
#define WIFI_SSID_BUILD "${wifiSsid}"
#define WIFI_PASSWORD_BUILD "${wifiPassword}"
#define HOME_ASSISTANT_URL_BUILD "${homeAssistantUrl}"
#define HOME_ASSISTANT_TOKEN_BUILD "${homeAssistantToken}"
#define HOME_ASSISTANT_ENABLED_BUILD ${config.homeAssistant.url && config.homeAssistant.token ? 1 : 0}

enum UiWidgetType : uint8_t {
  UI_WIDGET_CLOCK = 0,
  UI_WIDGET_WEATHER = 1,
  UI_WIDGET_PROGRESS = 2,
  UI_WIDGET_SWITCH = 3,
  UI_WIDGET_SLIDER = 4,
  UI_WIDGET_THERMOSTAT = 5,
  UI_WIDGET_NONE = 255,
};

enum UiClockStyle : uint8_t {
  UI_CLOCK_DIGITAL = 0,
  UI_CLOCK_ANALOG = 1,
};

enum UiPageType : uint8_t {
  UI_PAGE_STANDARD = 0,
  UI_PAGE_WEATHER_FOCUS = 1,
  UI_PAGE_MEDIA_PLAYER = 2,
};

typedef struct {
  uint8_t type;
  const char *label;
  const char *icon;
  int16_t value;
  int16_t currentValue;
  int16_t maxValue;
  uint8_t enabled;
  uint8_t clockStyle;
  uint8_t showSeconds;
  uint8_t showHistoryGraph;
  uint8_t hideWhenUnavailable;
  const char *entityId;
} UiWidgetConfig;

typedef struct {
  uint8_t pageType;
  const char *name;
  uint8_t widgetCount;
  const char *entityId;
  UiWidgetConfig widgets[${maxWidgetsPerPage}];
} UiPageConfig;

#define UI_PAGE_COUNT ${config.pages.length}
#define UI_MAX_WIDGETS_PER_PAGE ${maxWidgetsPerPage}
static const UiPageConfig UI_PAGES[UI_PAGE_COUNT] = {
${pageSource}
};
`;
}

export async function POST(request: Request) {
  const rootDir = process.cwd();
  const firmwareDir = path.join(rootDir, "firmware");
  const includeDir = path.join(firmwareDir, "include");
  const buildDir = getBuildOutputDir();
  const artifactsDir = getArtifactsDir();

  const payload = ((await request.json().catch(() => ({}))) ?? {}) as BuildPayload;
  const normalizedConfig = normalizeBuildConfig(payload);
  const buildId = new Date().toISOString();

  const generatedHeaderPath = path.join(includeDir, "generated_ui_config.h");
  const generatedHeader = createGeneratedConfig(payload, buildId);

  await ensureArtifactsDir();
  await writeFile(generatedHeaderPath, generatedHeader, "utf8");

  const pioCheck = await runCommand("pio", ["--version"], firmwareDir);
  if (pioCheck.code !== 0) {
    return NextResponse.json(
      {
        ok: false,
        stage: "tooling",
        error:
          "PlatformIO (pio) not found in container. Install platformio in image or host runtime.",
        log: pioCheck.log,
      },
      { status: 500 },
    );
  }

  const build = await runCommand("pio", ["run", "-e", "m5papers3"], firmwareDir);
  if (build.code !== 0) {
    return NextResponse.json(
      {
        ok: false,
        stage: "build",
        error: "PlatformIO build failed.",
        log: build.log,
      },
      { status: 500 },
    );
  }

  try {
    await Promise.all(
      FIRMWARE_ARTIFACTS.map(async (file) => {
        const src = path.join(buildDir, file);
        const dest = path.join(artifactsDir, file);
        await copyFile(src, dest);
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "export",
        error: "Build succeeded but exporting binaries failed.",
        details: String(error),
        log: build.log,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Firmware built and exported to backend artifacts.",
    buildId,
    pageCount: normalizedConfig.pages.length,
    widgetCount: countWidgets(normalizedConfig.pages),
    artifacts: FIRMWARE_ARTIFACTS,
    log: build.log,
  });
}
