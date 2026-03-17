const fs = require("node:fs/promises");
const path = require("node:path");

const sharp = require("sharp");
const { icons } = require("@iconify-json/wi");
const { getIconData, iconToSVG, iconToHTML, replaceIDs } = require("@iconify/utils");

const OUTPUT_PATH = path.join(process.cwd(), "firmware", "include", "generated_weather_icons.h");

const ICONS = [
  { key: "clear_day", icon: "day-sunny", width: 256, height: 256 },
  { key: "clear_night", icon: "night-clear", width: 256, height: 256 },
  { key: "cloudy", icon: "cloudy", width: 256, height: 256 },
  { key: "partly_cloudy_day", icon: "day-cloudy", width: 256, height: 256 },
  { key: "partly_cloudy_night", icon: "night-alt-partly-cloudy", width: 256, height: 256 },
  { key: "drizzle", icon: "sprinkle", width: 256, height: 256 },
  { key: "rain", icon: "rain", width: 256, height: 256 },
  { key: "pouring", icon: "showers", width: 256, height: 256 },
  { key: "wind", icon: "strong-wind", width: 256, height: 256 },
  { key: "windy_variant", icon: "cloudy-windy", width: 256, height: 256 },
  { key: "fog", icon: "fog", width: 256, height: 256 },
  { key: "hail", icon: "hail", width: 256, height: 256 },
  { key: "lightning", icon: "lightning", width: 256, height: 256 },
  { key: "lightning_rainy", icon: "storm-showers", width: 256, height: 256 },
  { key: "snow", icon: "snow", width: 256, height: 256 },
  { key: "snowy_rainy", icon: "sleet", width: 256, height: 256 },
  { key: "exceptional", icon: "cloud", width: 256, height: 256 },
  { key: "metric_humidity", icon: "humidity", width: 72, height: 72 },
  { key: "metric_wind", icon: "strong-wind", width: 72, height: 72 },
  { key: "metric_pressure", icon: "barometer", width: 72, height: 72 },
  { key: "metric_rain_chance", icon: "raindrop", width: 72, height: 72 },
];

function renderIconSvg(iconName, width, height) {
  const iconData = getIconData(icons, iconName);
  if (!iconData) {
    throw new Error(`Icon '${iconName}' not found in Weather Icons set`);
  }

  const rendered = iconToSVG(iconData, { width: `${width}`, height: `${height}` });
  return iconToHTML(replaceIDs(rendered.body), rendered.attributes);
}

async function svgToPacked4bpp(svgMarkup, width, height) {
  const { data, info } = await sharp(Buffer.from(svgMarkup))
    .resize(width, height, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: "#ffffff" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels < 1) {
    throw new Error("Expected at least one grayscale channel");
  }

  const packed = [];
  for (let i = 0; i < data.length; i += info.channels * 2) {
    const first = data[i];
    const secondIndex = i + info.channels;
    const second = secondIndex < data.length ? data[secondIndex] : 255;
    const high = Math.max(0, Math.min(15, Math.round((first / 255) * 15)));
    const low = Math.max(0, Math.min(15, Math.round((second / 255) * 15)));
    packed.push((high << 4) | low);
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
  const renderedIcons = await Promise.all(
    ICONS.map(async ({ key, icon, width, height }) => ({
      key,
      ...(await svgToPacked4bpp(renderIconSvg(icon, width, height), width, height)),
    })),
  );

  const arrays = renderedIcons
    .map(
      ({ key, packed }) => `static const uint8_t WEATHER_ICON_${key.toUpperCase()}[] PROGMEM = {\n${toHexList(packed)}\n};`,
    )
    .join("\n\n");

  const assets = renderedIcons
    .map(
      ({ key, width, height }) =>
        `static const WeatherIconAsset WEATHER_ICON_ASSET_${key.toUpperCase()} = {${width}, ${height}, WEATHER_ICON_${key.toUpperCase()}};`,
    )
    .join("\n");

  const header = `#pragma once

#include <stdint.h>

#ifndef PROGMEM
#define PROGMEM
#endif

typedef struct {
  uint16_t width;
  uint16_t height;
  const uint8_t *pixels;
} WeatherIconAsset;

${arrays}

${assets}
`;

  await fs.writeFile(OUTPUT_PATH, header, "utf8");
  console.log(`Generated weather icon header at ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
