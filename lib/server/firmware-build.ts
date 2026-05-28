import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  getTextWidgetMqttEntityIdForMode,
  normalizeBuildConfig,
  normalizeTextWidgetMqttMode,
} from "@/lib/layout-config";
import {
  FIRMWARE_ARTIFACTS,
  getArtifactsDir,
  getBuildOutputDir,
} from "@/lib/server/firmware-artifacts";
import {
  generateMdiIconHeader,
  generateMediaCoverHeader,
  generateWeatherIconHeader,
} from "@/lib/server/generate-mdi-icons";

export const PLATFORMIO_ENVIRONMENT = "m5papers3";
export const MAX_MEDIA_PLAYER_ENTITIES = 4;

export type BuildPayload = {
  darkMode?: boolean;
  hideWidgetBorders?: boolean;
  fontName?: string;
  partialRefreshMs?: number;
  fullRefreshEvery?: number;
  pages?: unknown[];
  pageName?: string;
  showClock?: boolean;
  showWeather?: boolean;
  showProgress?: boolean;
  showSwitch?: boolean;
  progressValue?: number;
};

export type DeviceHomeAssistantBuildConfig = {
  url: string;
  token: string;
};

export type FirmwareBuildPaths = {
  firmwareDir: string;
  includeDir: string;
  buildDir: string;
  artifactsDir: string;
  generatedHeaderPath: string;
  generatedMdiHeaderPath: string;
  generatedWeatherHeaderPath: string;
  generatedMediaCoverHeaderPath: string;
};

export function getFirmwareBuildPaths(
  rootDir = process.cwd(),
): FirmwareBuildPaths {
  const firmwareDir = path.join(rootDir, "firmware");
  const includeDir = path.join(firmwareDir, "include");

  return {
    firmwareDir,
    includeDir,
    buildDir: getBuildOutputDir(),
    artifactsDir: getArtifactsDir(),
    generatedHeaderPath: path.join(includeDir, "generated_ui_config.h"),
    generatedMdiHeaderPath: path.join(includeDir, "generated_mdi_icons.h"),
    generatedWeatherHeaderPath: path.join(
      includeDir,
      "generated_weather_icons.h",
    ),
    generatedMediaCoverHeaderPath: path.join(
      includeDir,
      "generated_media_cover.h",
    ),
  };
}

export function configurePlatformioRuntime(rootDir = process.cwd()) {
  process.env.PLATFORMIO_CORE_DIR ||= path.join(rootDir, ".platformio");
  if ((process.env.HOME_ASSISTANT_ADDON ?? "").trim() === "1") {
    process.env.HOME =
      (process.env.EINK_HASS_FRAME_DATA_DIR ?? "").trim() ||
      process.env.PLATFORMIO_CORE_DIR;
  }
}

export async function ensurePlatformioRuntimeDirs() {
  const homeDir = (process.env.HOME ?? "").trim();
  if (homeDir.length > 0) {
    await mkdir(homeDir, { recursive: true });
  }

  const platformioCoreDir = (process.env.PLATFORMIO_CORE_DIR ?? "").trim();
  await mkdir(platformioCoreDir, { recursive: true });
}

function sanitizeCString(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\"/g, '\\"')
    .replace(/[\r\n]/g, " ");
}

function sanitizeMultilineCString(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\"/g, '\\"')
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "\\n");
}

function normalizeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function normalizeThermostatTenths(
  value: unknown,
  fallbackTenths: number,
  stepTenths: number,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallbackTenths;
  }
  const clamped = Math.max(12, Math.min(30, parsed));
  const tenths = Math.round(clamped * 10);
  const snapped = Math.round(tenths / stepTenths) * stepTenths;
  return Math.max(120, Math.min(300, snapped));
}

function stripAnsi(input: string) {
  return input.replace(/\u001B\[[0-9;]*[A-Za-z]/g, "");
}

export function summarizeCommandLog(log: string, maxLines = 12) {
  const cleaned = stripAnsi(log)
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (cleaned.length === 0) {
    return "";
  }

  const priorityLines = cleaned.filter((line) =>
    /error|fatal|exception|failed|not found|permission denied/i.test(line),
  );
  const selected =
    priorityLines.length > 0
      ? priorityLines.slice(-maxLines)
      : cleaned.slice(-maxLines);

  return selected.join("\n");
}

async function fileExists(filePath: string) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
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
    case "button":
      return "UI_WIDGET_BUTTON";
    case "slider":
      return "UI_WIDGET_SLIDER";
    case "thermostat":
      return "UI_WIDGET_THERMOSTAT";
    case "text":
      return "UI_WIDGET_TEXT";
    case "title":
      return "UI_WIDGET_TITLE";
    default:
      return "UI_WIDGET_NONE";
  }
}

function clockStyleToCpp(style: unknown) {
  return style === "analog" ? "UI_CLOCK_ANALOG" : "UI_CLOCK_DIGITAL";
}

function pageTypeToCpp(type: unknown) {
  if (type === "overview") {
    return "UI_PAGE_OVERVIEW";
  }
  if (type === "weather-focus") {
    return "UI_PAGE_WEATHER_FOCUS";
  }
  if (type === "media-player") {
    return "UI_PAGE_MEDIA_PLAYER";
  }
  return "UI_PAGE_STANDARD";
}

export function collectWidgetIconNames(payload: BuildPayload) {
  const config = normalizeBuildConfig(payload);
  return Array.from(
    new Set(
      config.pages.flatMap((page) =>
        page.widgets.flatMap((widget) =>
          (widget.type === "slider" || widget.type === "button") &&
          typeof widget.icon === "string" &&
          widget.icon.trim().length > 0
            ? [widget.icon.trim()]
            : [],
        ),
      ),
    ),
  );
}

export function collectExposedTextWidgets(payload: BuildPayload) {
  const config = normalizeBuildConfig(payload);
  return config.pages.flatMap((page) =>
    page.widgets
      .filter((widget) => widget.type === "text" && widget.mqttExpose === true)
      .map((widget) => ({
        pageName: page.name,
        widgetId: widget.id,
        widgetLabel: widget.label,
        mqttName: widget.mqttName ?? "",
        mqttMode: normalizeTextWidgetMqttMode(widget.mqttMode),
        entityId: getTextWidgetMqttEntityIdForMode(
          widget.mqttName,
          widget.mqttMode,
        ),
      })),
  );
}

type ExposedTextWidget = ReturnType<typeof collectExposedTextWidgets>[number];

export function findInvalidExposedTextWidgets(
  widgets: ExposedTextWidget[],
): ExposedTextWidget[] {
  return widgets.filter((widget) => widget.entityId.length === 0);
}

export function findDuplicateExposedTextWidgets(
  widgets: ExposedTextWidget[],
): ExposedTextWidget[] {
  const textWidgetNameCounts = new Map<string, number>();
  for (const widget of widgets) {
    textWidgetNameCounts.set(
      widget.entityId,
      (textWidgetNameCounts.get(widget.entityId) ?? 0) + 1,
    );
  }

  return widgets.filter(
    (widget) => (textWidgetNameCounts.get(widget.entityId) ?? 0) > 1,
  );
}

export function getMissingDeviceHomeAssistantRequirements(
  config: DeviceHomeAssistantBuildConfig,
) {
  const missingRequirements: string[] = [];
  if (!config.url) {
    missingRequirements.push("device Home Assistant local address");
  }
  if (!config.token) {
    missingRequirements.push("device long-lived access token");
  }
  return missingRequirements;
}

export async function runCommand(
  command: string,
  args: string[],
  cwd: string,
) {
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

export async function createGeneratedConfig(
  payload: BuildPayload,
  buildId: string,
  deviceHomeAssistantConfig: DeviceHomeAssistantBuildConfig,
) {
  const config = normalizeBuildConfig(payload);
  const fontName = sanitizeCString(config.fontName);
  const escapedBuildId = sanitizeCString(buildId);
  const homeAssistantUrl = sanitizeCString(deviceHomeAssistantConfig.url);
  const homeAssistantToken = sanitizeCString(deviceHomeAssistantConfig.token);
  const homeAssistantEnabled =
    deviceHomeAssistantConfig.url.length > 0 &&
    deviceHomeAssistantConfig.token.length > 0;
  const partialRefreshMs = normalizeNumber(config.partialRefreshMs, 30000);
  const fullRefreshEvery = normalizeNumber(config.fullRefreshEvery, 60);
  const maxWidgetsPerPage = Math.max(
    1,
    ...config.pages.map((page) => page.widgets.length),
  );
  const emptyWidget =
    '{UI_WIDGET_NONE, "", "", 0, 0, 100, 0, UI_CLOCK_DIGITAL, 1, 0, 0, 0, 0, UI_TEXT_MQTT_MODE_TEXT, "", ""}';

  const pageSource = config.pages
    .map((page) => {
      const widgets = page.widgets
        .map((widget) => {
          const label =
            widget.type === "text"
              ? sanitizeMultilineCString(widget.label)
              : sanitizeCString(widget.label);
          const icon = sanitizeCString(
            widget.type === "slider" || widget.type === "button"
              ? (widget.icon ?? "lightbulb")
              : "",
          );
          const isThermostat = widget.type === "thermostat";
          const value = isThermostat
            ? normalizeThermostatTenths(widget.value, 225, 5)
            : normalizeNumber(widget.value, 0);
          const currentValue = isThermostat
            ? normalizeThermostatTenths(widget.currentValue, 205, 1)
            : normalizeNumber(widget.currentValue, 0);
          const maxValue = isThermostat
            ? normalizeThermostatTenths(widget.max, 300, 5)
            : normalizeNumber(widget.max, 100);
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
          const invertLogic =
            (widget.type === "slider" || widget.type === "button") &&
            widget.invert === true
              ? 1
              : 0;
          const mqttExpose =
            widget.type === "text" && widget.mqttExpose === true ? 1 : 0;
          const mqttMode =
            widget.type === "text" &&
            normalizeTextWidgetMqttMode(widget.mqttMode) === "notify"
              ? "UI_TEXT_MQTT_MODE_NOTIFY"
              : "UI_TEXT_MQTT_MODE_TEXT";
          const mqttName = sanitizeCString(
            widget.type === "text" ? (widget.mqttName ?? "") : "",
          );
          const entityId = sanitizeCString(
            widget.homeAssistant?.entityId ?? "",
          );
          return `{${widgetTypeToCpp(widget.type)}, "${label}", "${icon}", ${value}, ${currentValue}, ${maxValue}, ${enabled}, ${clockStyle}, ${showSeconds}, ${showHistoryGraph}, ${hideWhenUnavailable}, ${invertLogic}, ${mqttExpose}, ${mqttMode}, "${mqttName}", "${entityId}"}`;
        })
        .concat(
          Array.from(
            { length: Math.max(0, maxWidgetsPerPage - page.widgets.length) },
            () => emptyWidget,
          ),
        )
        .join(", ");
      const pageEntityId = sanitizeCString(page.homeAssistant?.entityId ?? "");
      const mediaBindings =
        page.type === "media-player"
          ? page.homeAssistantBindings && page.homeAssistantBindings.length > 0
            ? page.homeAssistantBindings
            : page.homeAssistant
              ? [page.homeAssistant]
              : []
          : [];
      const mediaEntityIds = mediaBindings
        .slice(0, MAX_MEDIA_PLAYER_ENTITIES)
        .map((binding) => `"${sanitizeCString(binding.entityId)}"`)
        .concat(
          Array.from(
            {
              length: Math.max(
                0,
                MAX_MEDIA_PLAYER_ENTITIES - mediaBindings.length,
              ),
            },
            () => '""',
          ),
        )
        .join(", ");
      const mediaShowActiveOnly =
        page.type === "media-player" && page.mediaShowActiveOnly !== false
          ? 1
          : 0;
      return `  {${pageTypeToCpp(page.type)}, "${sanitizeCString(page.name)}", ${page.widgets.length}, "${pageEntityId}", ${Math.min(mediaBindings.length, MAX_MEDIA_PLAYER_ENTITIES)}, ${mediaShowActiveOnly}, {${mediaEntityIds}}, {${widgets}}}`;
    })
    .join(",\n");

  return `#pragma once

#include <stdint.h>

// Auto-generated by web build endpoint. Do not edit manually.
#define UI_FONT_NAME "${fontName}"
#define UI_THEME_DARK ${config.darkMode ? 1 : 0}
#define UI_HIDE_WIDGET_BORDERS ${config.hideWidgetBorders ? 1 : 0}
#define UI_BUILD_ID "${escapedBuildId}"
#define PARTIAL_REFRESH_MS_OVERRIDE ${partialRefreshMs}
#define FULL_REFRESH_EVERY_N_PARTIALS_OVERRIDE ${fullRefreshEvery}
#define WIFI_SSID_BUILD ""
#define WIFI_PASSWORD_BUILD ""
#define HOME_ASSISTANT_URL_BUILD "${homeAssistantUrl}"
#define HOME_ASSISTANT_TOKEN_BUILD "${homeAssistantToken}"
#define HOME_ASSISTANT_ENABLED_BUILD ${homeAssistantEnabled ? 1 : 0}
#define UI_MAX_MEDIA_PLAYER_ENTITIES ${MAX_MEDIA_PLAYER_ENTITIES}

enum UiWidgetType : uint8_t {
  UI_WIDGET_CLOCK = 0,
  UI_WIDGET_WEATHER = 1,
  UI_WIDGET_PROGRESS = 2,
  UI_WIDGET_SWITCH = 3,
  UI_WIDGET_BUTTON = 4,
  UI_WIDGET_SLIDER = 5,
  UI_WIDGET_THERMOSTAT = 6,
  UI_WIDGET_TEXT = 7,
  UI_WIDGET_TITLE = 8,
  UI_WIDGET_NONE = 255,
};

enum UiClockStyle : uint8_t {
  UI_CLOCK_DIGITAL = 0,
  UI_CLOCK_ANALOG = 1,
};

enum UiPageType : uint8_t {
  UI_PAGE_STANDARD = 0,
  UI_PAGE_OVERVIEW = 1,
  UI_PAGE_WEATHER_FOCUS = 2,
  UI_PAGE_MEDIA_PLAYER = 3,
};

enum UiTextMqttMode : uint8_t {
  UI_TEXT_MQTT_MODE_TEXT = 0,
  UI_TEXT_MQTT_MODE_NOTIFY = 1,
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
  uint8_t invertLogic;
  uint8_t mqttExpose;
  uint8_t mqttMode;
  const char *mqttName;
  const char *entityId;
} UiWidgetConfig;

typedef struct {
  uint8_t pageType;
  const char *name;
  uint8_t widgetCount;
  const char *entityId;
  uint8_t mediaEntityCount;
  uint8_t mediaShowActiveOnly;
  const char *mediaEntityIds[UI_MAX_MEDIA_PLAYER_ENTITIES];
  UiWidgetConfig widgets[${maxWidgetsPerPage}];
} UiPageConfig;

#define UI_PAGE_COUNT ${config.pages.length}
#define UI_MAX_WIDGETS_PER_PAGE ${maxWidgetsPerPage}
static const UiPageConfig UI_PAGES[UI_PAGE_COUNT] = {
${pageSource}
};
`;
}

export async function writeGeneratedFirmwareConfig(input: {
  payload: BuildPayload;
  buildId: string;
  deviceHomeAssistantConfig: DeviceHomeAssistantBuildConfig;
  outputPath: string;
}) {
  const generatedHeader = await createGeneratedConfig(
    input.payload,
    input.buildId,
    input.deviceHomeAssistantConfig,
  );
  await writeFile(input.outputPath, generatedHeader, "utf8");
  return generatedHeader;
}

export async function generateFirmwareAssets(input: {
  payload: BuildPayload;
  mdiHeaderPath: string;
  weatherHeaderPath: string;
  mediaCoverHeaderPath: string;
}) {
  await generateMdiIconHeader({
    outputPath: input.mdiHeaderPath,
    widgetIcons: collectWidgetIconNames(input.payload),
  });

  if (!(await fileExists(input.weatherHeaderPath))) {
    await generateWeatherIconHeader();
  }

  if (!(await fileExists(input.mediaCoverHeaderPath))) {
    await generateMediaCoverHeader();
  }
}

export async function exportFirmwareArtifacts(input: {
  buildDir: string;
  artifactsDir: string;
}) {
  await Promise.all(
    FIRMWARE_ARTIFACTS.map(async (file) => {
      const src = path.join(input.buildDir, file);
      const dest = path.join(input.artifactsDir, file);
      await copyFile(src, dest);
    }),
  );
}
