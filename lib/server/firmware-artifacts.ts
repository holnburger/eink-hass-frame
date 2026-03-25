import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

export const FIRMWARE_ARTIFACTS = ["bootloader.bin", "partitions.bin", "firmware.bin"] as const;

function getBaseDataDir() {
  const configuredDataDir = (process.env.EINK_HASS_FRAME_DATA_DIR ?? "").trim();
  if (configuredDataDir) {
    return configuredDataDir;
  }

  if (
    (process.env.HOME_ASSISTANT_ADDON ?? "").trim() === "1" ||
    (process.env.SUPERVISOR_TOKEN ?? "").trim().length > 0
  ) {
    return "/data/eink-hass-frame";
  }

  return process.cwd();
}

export function getArtifactsDir() {
  return path.join(getBaseDataDir(), ".firmware-artifacts");
}

export function getBuildOutputDir() {
  return path.join(process.cwd(), "firmware", ".pio", "build", "m5papers3");
}

export async function ensureArtifactsDir() {
  const dir = getArtifactsDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function artifactExists(fileName: string) {
  const filePath = path.join(getArtifactsDir(), fileName);
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
