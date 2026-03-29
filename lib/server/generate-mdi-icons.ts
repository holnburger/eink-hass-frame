import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { icons } from "@iconify-json/mdi";
import { getIconData, iconToHTML, iconToSVG, replaceIDs } from "@iconify/utils";

const WIDGET_ICON_SIZE = 28;
const OVERVIEW_WIDGET_ICON_SIZE = 48;

const CORE_ICONS = [
  { key: "chevron_left", icon: "chevron-left", width: 18, height: 18, threshold: 208 },
  { key: "chevron_right", icon: "chevron-right", width: 18, height: 18, threshold: 208 },
  { key: "chevron_up", icon: "chevron-up", width: 24, height: 24, threshold: 208 },
  { key: "chevron_down", icon: "chevron-down", width: 24, height: 24, threshold: 208 },
  { key: "weather_sunny", icon: "weather-sunny", width: 128, height: 128, threshold: 208 },
  { key: "weather_cloudy", icon: "weather-cloudy", width: 128, height: 128, threshold: 208 },
  { key: "weather_rainy", icon: "weather-rainy", width: 128, height: 128, threshold: 208 },
  { key: "weather_pouring", icon: "weather-pouring", width: 128, height: 128, threshold: 208 },
  { key: "weather_windy", icon: "weather-windy", width: 128, height: 128, threshold: 208 },
  { key: "weather_humidity", icon: "water-percent", width: 24, height: 24, threshold: 208 },
  { key: "weather_wind_small", icon: "weather-windy", width: 24, height: 24, threshold: 208 },
  { key: "weather_pressure", icon: "gauge", width: 24, height: 24, threshold: 208 },
  { key: "weather_rain_chance", icon: "weather-pouring", width: 24, height: 24, threshold: 208 },
  { key: "slider_lightbulb", icon: "lightbulb", width: 28, height: 28, threshold: 208 },
  { key: "slider_lamp", icon: "lamp", width: 28, height: 28, threshold: 208 },
  { key: "slider_fan", icon: "fan", width: 28, height: 28, threshold: 208 },
  { key: "slider_speaker", icon: "speaker", width: 28, height: 28, threshold: 208 },
  { key: "slider_volume_high", icon: "volume-high", width: 28, height: 28, threshold: 208 },
  { key: "slider_blinds_horizontal", icon: "blinds-horizontal", width: 28, height: 28, threshold: 208 },
  { key: "slider_water_percent", icon: "water-percent", width: 28, height: 28, threshold: 208 },
  { key: "slider_thermometer", icon: "thermometer", width: 28, height: 28, threshold: 208 },
  { key: "slider_air_humidifier", icon: "air-humidifier", width: 28, height: 28, threshold: 208 },
  { key: "slider_brightness_6", icon: "brightness-6", width: 28, height: 28, threshold: 208 },
  { key: "media_skip_previous", icon: "skip-previous", width: 40, height: 40, threshold: 208 },
  { key: "media_play", icon: "play", width: 40, height: 40, threshold: 208 },
  { key: "media_pause", icon: "pause", width: 40, height: 40, threshold: 208 },
  { key: "media_skip_next", icon: "skip-next", width: 40, height: 40, threshold: 208 },
  { key: "media_music_note", icon: "music-note", width: 112, height: 112, threshold: 208 },
  { key: "thermostat_power", icon: "power", width: 18, height: 18, threshold: 208 },
  { key: "thermostat_power_off", icon: "power-off", width: 18, height: 18, threshold: 208 },
  { key: "thermostat_snowflake", icon: "snowflake", width: 18, height: 18, threshold: 208 },
] as const;

const DEFAULT_WIDGET_ICON_NAMES = [
  "lightbulb",
  "lamp",
  "fan",
  "speaker",
  "volume-high",
  "blinds-horizontal",
  "water-percent",
  "thermometer",
  "air-humidifier",
  "brightness-6",
] as const;

let sharpImportPromise: Promise<unknown> | null = null;
const require = createRequire(import.meta.url);

type SharpFactory = typeof import("sharp");
type InternalModuleApi = {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};

const nativeSharpModuleIds = new Set([
  "@img/sharp-linux-x64/sharp.node",
  "@img/sharp-linuxmusl-x64/sharp.node",
]);
const sharpCacheSegment = `${path.sep}node_modules${path.sep}sharp${path.sep}`;

function getSharpFactory(candidate: unknown): SharpFactory {
  if (typeof candidate === "function") {
    return candidate as SharpFactory;
  }

  if (
    candidate &&
    typeof candidate === "object" &&
    "default" in candidate &&
    typeof (candidate as { default?: unknown }).default === "function"
  ) {
    return (candidate as { default: SharpFactory }).default;
  }

  throw new Error("Sharp module did not export a callable factory.");
}

function shouldFallbackToSharpWasm(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  if (process.platform !== "linux" || process.arch !== "x64") {
    return false;
  }

  return (
    error.message.includes(
      'Could not load the "sharp" module using the linux-x64 runtime',
    ) ||
    error.message.includes(
      "Prebuilt binaries for linux-x64 require v2 microarchitecture",
    ) ||
    error.message.includes("Unsupported CPU")
  );
}

function clearSharpCache() {
  for (const cacheKey of Object.keys(require.cache)) {
    if (cacheKey.includes(sharpCacheSegment)) {
      delete require.cache[cacheKey];
    }
  }
}

function loadSharpThroughWasmWrapper() {
  clearSharpCache();

  const moduleApi = require("node:module") as InternalModuleApi;
  const originalLoad = moduleApi._load;

  moduleApi._load = ((request, parent, isMain) => {
    if (nativeSharpModuleIds.has(request)) {
      const notFound = new Error(
        `Cannot find module '${request}'`,
      ) as Error & { code?: string };
      notFound.code = "MODULE_NOT_FOUND";
      throw notFound;
    }

    return originalLoad(request, parent, isMain);
  }) as InternalModuleApi["_load"];

  try {
    return getSharpFactory(require("sharp"));
  } finally {
    moduleApi._load = originalLoad;
  }
}

function loadSharp() {
  sharpImportPromise ??= (async () => {
    try {
      const sharpModule = await import("sharp");
      return getSharpFactory(sharpModule);
    } catch (error) {
      if (!shouldFallbackToSharpWasm(error)) {
        throw error;
      }

      return loadSharpThroughWasmWrapper();
    }
  })();
  return sharpImportPromise;
}

function sanitizeKeySegment(value: string) {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return sanitized.length > 0 ? sanitized : "icon";
}

function resolveWidgetIconNames(widgetIcons: string[]) {
  return Array.from(
    new Set([...DEFAULT_WIDGET_ICON_NAMES, ...widgetIcons]),
  ).filter((iconName) => Boolean(getIconData(icons, iconName)));
}

function buildWidgetIconSpecs(
  iconNames: string[],
  keyPrefix: string,
  size: number,
) {
  return iconNames.map((iconName) => ({
    key: `${keyPrefix}_${sanitizeKeySegment(iconName)}`,
    icon: iconName,
    width: size,
    height: size,
    threshold: 208,
  }));
}

function renderIconSvg(iconName: string, width: number, height: number) {
  const iconData = getIconData(icons, iconName);
  if (!iconData) {
    throw new Error(`Icon '${iconName}' not found in MDI set`);
  }

  const rendered = iconToSVG(iconData, {
    width: `${width}`,
    height: `${height}`,
  });
  return iconToHTML(replaceIDs(rendered.body), rendered.attributes);
}

async function svgToPacked1bpp(
  svgMarkup: string,
  width: number,
  height: number,
  threshold: number,
) {
  const sharp = (await loadSharp()) as SharpFactory;
  const { data, info } = await sharp(Buffer.from(svgMarkup))
    .resize(width, height, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .ensureAlpha()
    .flatten({ background: "#ffffff" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels < 1) {
    throw new Error("Expected grayscale icon data");
  }

  const pitch = Math.ceil(info.width / 8);
  const packed = new Array<number>(pitch * info.height).fill(0);

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const gray = data[(y * info.width + x) * info.channels];
      if (gray >= threshold) {
        continue;
      }
      const byteIndex = y * pitch + (x >> 3);
      packed[byteIndex] |= 0x80 >> (x & 7);
    }
  }

  return {
    width: info.width,
    height: info.height,
    packed,
  };
}

function toHexList(bytes: number[]) {
  return bytes
    .map((byte) => `0x${byte.toString(16).padStart(2, "0")}`)
    .reduce<string[][]>((lines, value, index) => {
      const lineIndex = Math.floor(index / 16);
      lines[lineIndex] ??= [];
      lines[lineIndex].push(value);
      return lines;
    }, [])
    .map((line) => `  ${line.join(", ")}`)
    .join(",\n");
}

export async function generateMdiIconHeader(input: {
  outputPath: string;
  widgetIcons: string[];
}) {
  const iconNames = resolveWidgetIconNames(input.widgetIcons);
  const widgetIconSpecs = buildWidgetIconSpecs(
    iconNames,
    "widget",
    WIDGET_ICON_SIZE,
  );
  const overviewIconSpecs = buildWidgetIconSpecs(
    iconNames,
    "overview",
    OVERVIEW_WIDGET_ICON_SIZE,
  );
  const renderedSpecs = [...CORE_ICONS, ...widgetIconSpecs, ...overviewIconSpecs];

  const renderedIcons = await Promise.all(
    renderedSpecs.map(async ({ key, icon, width, height, threshold }) => ({
      key,
      ...(await svgToPacked1bpp(
        renderIconSvg(icon, width, height),
        width,
        height,
        threshold,
      )),
    })),
  );

  const arrays = renderedIcons
    .map(
      ({ key, packed }) =>
        `static const uint8_t MDI_ICON_${key.toUpperCase()}[] PROGMEM = {\n${toHexList(packed)}\n};`,
    )
    .join("\n\n");

  const assets = renderedIcons
    .map(
      ({ key, width, height }) =>
        `static const MdiMonoIconAsset MDI_ICON_ASSET_${key.toUpperCase()} = {${width}, ${height}, MDI_ICON_${key.toUpperCase()}};`,
    )
    .join("\n");

  const widgetAssetTableEntries = widgetIconSpecs
    .map(
      ({ key, icon }) =>
        `  {"${icon}", &MDI_ICON_ASSET_${key.toUpperCase()}}`,
    )
    .join(",\n");

  const overviewAssetTableEntries = overviewIconSpecs
    .map(
      ({ key, icon }) =>
        `  {"${icon}", &MDI_ICON_ASSET_${key.toUpperCase()}}`,
    )
    .join(",\n");

  const header = `#pragma once

#include <stdint.h>

#ifndef PROGMEM
#define PROGMEM
#endif

typedef struct {
  uint16_t width;
  uint16_t height;
  const uint8_t *pixels;
} MdiMonoIconAsset;

typedef struct {
  const char *name;
  const MdiMonoIconAsset *asset;
} MdiNamedIconAsset;

${arrays}

${assets}

static const MdiNamedIconAsset MDI_WIDGET_ICON_ASSETS[] = {
${widgetAssetTableEntries}
};

static const MdiNamedIconAsset MDI_OVERVIEW_ICON_ASSETS[] = {
${overviewAssetTableEntries}
};

#define MDI_WIDGET_ICON_ASSET_COUNT ${widgetIconSpecs.length}
#define MDI_OVERVIEW_ICON_ASSET_COUNT ${overviewIconSpecs.length}
`;

  await writeFile(input.outputPath, header, "utf8");
}
