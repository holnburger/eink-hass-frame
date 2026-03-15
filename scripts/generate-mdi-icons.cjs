const fs = require("node:fs/promises");
const path = require("node:path");

const sharp = require("sharp");
const { icons } = require("@iconify-json/mdi");
const { getIconData, iconToSVG, iconToHTML, replaceIDs } = require("@iconify/utils");

const OUTPUT_PATH = path.join(process.cwd(), "firmware", "include", "generated_mdi_icons.h");

const ICONS = [
  { key: "chevron_left", icon: "chevron-left", width: 18, height: 18, threshold: 208 },
  { key: "chevron_right", icon: "chevron-right", width: 18, height: 18, threshold: 208 },
  { key: "chevron_up", icon: "chevron-up", width: 24, height: 24, threshold: 208 },
  { key: "chevron_down", icon: "chevron-down", width: 24, height: 24, threshold: 208 },
  { key: "weather_sunny", icon: "weather-sunny", width: 128, height: 128, threshold: 208 },
  { key: "weather_cloudy", icon: "weather-cloudy", width: 128, height: 128, threshold: 208 },
  { key: "weather_rainy", icon: "weather-rainy", width: 128, height: 128, threshold: 208 },
  { key: "weather_pouring", icon: "weather-pouring", width: 128, height: 128, threshold: 208 },
  { key: "weather_windy", icon: "weather-windy", width: 128, height: 128, threshold: 208 },
];

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
  const renderedIcons = await Promise.all(
    ICONS.map(async ({ key, icon, width, height, threshold }) => ({
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

${arrays}

${assets}
`;

  await fs.writeFile(OUTPUT_PATH, header, "utf8");
  console.log(`Generated MDI icon header at ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
