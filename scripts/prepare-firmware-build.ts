import { mkdir } from "node:fs/promises";

import {
  generateFirmwareAssets,
  getFirmwareBuildPaths,
  writeGeneratedFirmwareConfig,
} from "@/lib/server/firmware-build";

const paths = getFirmwareBuildPaths(process.cwd());
const buildId = (process.env.FIRMWARE_BUILD_ID ?? "ci").trim() || "ci";

await mkdir(paths.includeDir, { recursive: true });

await writeGeneratedFirmwareConfig({
  payload: {},
  buildId,
  deviceHomeAssistantConfig: {
    url: (process.env.DEVICE_HOME_ASSISTANT_URL ?? "").trim(),
    token: (process.env.DEVICE_HOME_ASSISTANT_TOKEN ?? "").trim(),
  },
  outputPath: paths.generatedHeaderPath,
});

await generateFirmwareAssets({
  payload: {},
  mdiHeaderPath: paths.generatedMdiHeaderPath,
  weatherHeaderPath: paths.generatedWeatherHeaderPath,
  mediaCoverHeaderPath: paths.generatedMediaCoverHeaderPath,
});

console.log("Prepared generated firmware headers.");
