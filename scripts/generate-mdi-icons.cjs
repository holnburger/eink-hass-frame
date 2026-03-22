const fs = require("node:fs/promises");
const path = require("node:path");

const sharp = require("sharp");
const { icons } = require("@iconify-json/mdi");
const { getIconData, iconToSVG, iconToHTML, replaceIDs } = require("@iconify/utils");

const DEFAULT_OUTPUT_PATH = path.join(process.cwd(), "firmware", "include", "generated_mdi_icons.h");
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
];

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
];

function parseCliOptions(argv) {
  const options = {
    outputPath: DEFAULT_OUTPUT_PATH,
    widgetIcons: [],
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--output" && typeof argv[index + 1] === "string") {
      options.outputPath = path.resolve(process.cwd(), argv[index + 1]);
      index++;
      continue;
    }
    if (arg === "--widget-icons" && typeof argv[index + 1] === "string") {
      options.widgetIcons = argv[index + 1]
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      index++;
    }
  }

  return options;
}

function sanitizeKeySegment(value) {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return sanitized.length > 0 ? sanitized : "icon";
}

function resolveWidgetIconNames(widgetIcons) {
  return Array.from(
    new Set([...DEFAULT_WIDGET_ICON_NAMES, ...widgetIcons]),
  ).filter((iconName) => Boolean(getIconData(icons, iconName)));
}

function buildWidgetIconSpecs(iconNames, keyPrefix, size) {
  return iconNames.map((iconName) => ({
    key: `${keyPrefix}_${sanitizeKeySegment(iconName)}`,
    icon: iconName,
    width: size,
    height: size,
    threshold: 208,
  }));
}

function renderIconSvg(iconName, width, height) {
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

async function svgToPacked1bpp(svgMarkup, width, height, threshold) {
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
  const packed = new Array(pitch * info.height).fill(0);

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

function toHexList(bytes) {
  return bytes
    .map((byte) => `0x${byte.toString(16).padStart(2, "0")}`)
    .reduce((lines, value, index) => {
      const lineIndex = Math.floor(index / 16);
      lines[lineIndex] ??= [];
      lines[lineIndex].push(value);
      return lines;
    }, [])
    .map((line) => `  ${line.join(", ")}`)
    .join(",\n");
}

async function main() {
  const { outputPath, widgetIcons } = parseCliOptions(process.argv.slice(2));
  const iconNames = resolveWidgetIconNames(widgetIcons);
  const widgetIconSpecs = buildWidgetIconSpecs(iconNames, "widget", WIDGET_ICON_SIZE);
  const overviewIconSpecs = buildWidgetIconSpecs(iconNames, "overview", OVERVIEW_WIDGET_ICON_SIZE);
  const renderedSpecs = [...CORE_ICONS, ...widgetIconSpecs, ...overviewIconSpecs];
  const renderedIcons = await Promise.all(
    renderedSpecs.map(async ({ key, icon, width, height, threshold }) => ({
      key,
      ...(await svgToPacked1bpp(renderIconSvg(icon, width, height), width, height, threshold)),
    })),
  );

  const arrays = renderedIcons
    .map(
      ({ key, packed }) => `static const uint8_t MDI_ICON_${key.toUpperCase()}[] PROGMEM = {\n${toHexList(packed)}\n};`,
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

  await fs.writeFile(outputPath, header, "utf8");
  console.log(`Generated MDI icon header at ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
