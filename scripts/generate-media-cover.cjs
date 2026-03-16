const fs = require("node:fs/promises");
const path = require("node:path");

const sharp = require("sharp");

const INPUT_PATH = path.join(process.cwd(), "public", "mock", "black-cover.jpg");
const OUTPUT_PATH = path.join(process.cwd(), "firmware", "include", "generated_media_cover.h");
const COVER_SIZE = 384;

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

async function convertToPacked4bpp() {
  const { data, info } = await sharp(INPUT_PATH)
    .resize(COVER_SIZE, COVER_SIZE, {
      fit: "cover",
      position: "center",
    })
    .greyscale()
    .flatten({ background: "#ffffff" })
    .raw()
    .toBuffer({ resolveWithObject: true });

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

async function main() {
  const { width, height, packed } = await convertToPacked4bpp();

  const header = `#pragma once

#include <stdint.h>

#ifndef PROGMEM
#define PROGMEM
#endif

typedef struct {
  uint16_t width;
  uint16_t height;
  const uint8_t *pixels;
} MediaCoverAsset;

static const uint8_t MEDIA_COVER_BLACK[] PROGMEM = {
${toHexList(packed)}
};

static const MediaCoverAsset MEDIA_COVER_ASSET_BLACK = {${width}, ${height}, MEDIA_COVER_BLACK};
`;

  await fs.writeFile(OUTPUT_PATH, header, "utf8");
  console.log(`Generated media cover header at ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
