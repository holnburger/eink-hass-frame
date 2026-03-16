const fs = require("node:fs/promises");
const path = require("node:path");

const sharp = require("sharp");
const { icons } = require("@iconify-json/meteocons");
const { getIconData, iconToSVG, iconToHTML, replaceIDs } = require("@iconify/utils");

const ICON_SIZE = 256;
const OUTPUT_PATH = path.join(process.cwd(), "firmware", "include", "generated_weather_icons.h");

const ICONS = [
  { key: "clear_day", icon: "clear-day-fill" },
  { key: "cloudy", icon: "cloudy-fill" },
  { key: "drizzle", icon: "drizzle-fill" },
  { key: "rain", icon: "rain-fill" },
  { key: "wind", icon: "wind-fill" },
];

function renderIconSvg(iconName) {
  const iconData = getIconData(icons, iconName);
  if (!iconData) {
    throw new Error(`Icon '${iconName}' not found in Meteocons set`);
  }

  const rendered = iconToSVG(iconData, { width: `${ICON_SIZE}`, height: `${ICON_SIZE}` });
  return iconToHTML(replaceIDs(rendered.body), rendered.attributes);
}

async function svgToPacked4bpp(svgMarkup) {
  const { data, info } = await sharp(Buffer.from(svgMarkup))
    .resize(ICON_SIZE, ICON_SIZE, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: "#ffffff" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels < 1) {
    throw new Error("Expected at least one channel after grayscale conversion");
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
    ICONS.map(async ({ key, icon }) => ({
      key,
      ...(await svgToPacked4bpp(renderIconSvg(icon))),
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
