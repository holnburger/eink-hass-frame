import { NextResponse } from "next/server";
import { countWidgets, normalizeBuildConfig } from "@/lib/layout-config";
import {
  ensureArtifactsDir,
  FIRMWARE_ARTIFACTS,
} from "@/lib/server/firmware-artifacts";
import {
  collectExposedTextWidgets,
  configurePlatformioRuntime,
  ensurePlatformioRuntimeDirs,
  exportFirmwareArtifacts,
  findDuplicateExposedTextWidgets,
  findInvalidExposedTextWidgets,
  generateFirmwareAssets,
  getFirmwareBuildPaths,
  getMissingDeviceHomeAssistantRequirements,
  PLATFORMIO_ENVIRONMENT,
  runCommand,
  summarizeCommandLog,
  type BuildPayload,
  writeGeneratedFirmwareConfig,
} from "@/lib/server/firmware-build";
import {
  isHomeAssistantAddonRuntime,
  resolveDeviceHomeAssistantConfig,
} from "@/lib/server/home-assistant-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rootDir = process.cwd();
  const paths = getFirmwareBuildPaths(rootDir);
  configurePlatformioRuntime(rootDir);

  const payload = ((await request.json().catch(() => ({}))) ??
    {}) as BuildPayload;
  const normalizedConfig = normalizeBuildConfig(payload);
  const buildId = new Date().toISOString();
  const exposedTextWidgets = collectExposedTextWidgets(payload);
  const addonMode = isHomeAssistantAddonRuntime();
  const deviceHomeAssistantConfig = await resolveDeviceHomeAssistantConfig(
    normalizedConfig.homeAssistant,
  );

  const missingRequirements = getMissingDeviceHomeAssistantRequirements(
    deviceHomeAssistantConfig,
  );
  if (missingRequirements.length > 0) {
    const addonHint =
      addonMode && !deviceHomeAssistantConfig.url
        ? " Set the device Home Assistant local address in the add-on configuration, or enter an override address in the Home Assistant card."
        : "";
    return NextResponse.json(
      {
        ok: false,
        stage: "validation",
        error: `Missing required build settings: ${missingRequirements.join(", ")}.${addonHint}`,
      },
      { status: 400 },
    );
  }

  const invalidTextWidgets =
    findInvalidExposedTextWidgets(exposedTextWidgets);
  if (invalidTextWidgets.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        stage: "validation",
        error:
          invalidTextWidgets.length === 1
            ? `Text widget "${invalidTextWidgets[0].widgetLabel || invalidTextWidgets[0].widgetId}" needs an input name with letters, numbers, or underscores.`
            : "One or more text widgets need an input name with letters, numbers, or underscores.",
      },
      { status: 400 },
    );
  }

  const duplicateTextWidgets =
    findDuplicateExposedTextWidgets(exposedTextWidgets);
  if (duplicateTextWidgets.length > 0) {
    const duplicateEntityId = duplicateTextWidgets[0].entityId;
    return NextResponse.json(
      {
        ok: false,
        stage: "validation",
        error: `The text input name for ${duplicateEntityId} is used more than once in this layout. Choose a unique name for each exposed text widget.`,
      },
      { status: 400 },
    );
  }

  await ensureArtifactsDir();
  await ensurePlatformioRuntimeDirs();
  await writeGeneratedFirmwareConfig({
    payload,
    buildId,
    deviceHomeAssistantConfig,
    outputPath: paths.generatedHeaderPath,
  });

  try {
    await generateFirmwareAssets({
      payload,
      mdiHeaderPath: paths.generatedMdiHeaderPath,
      weatherHeaderPath: paths.generatedWeatherHeaderPath,
      mediaCoverHeaderPath: paths.generatedMediaCoverHeaderPath,
    });
  } catch (error) {
    const assetError = summarizeCommandLog(
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      {
        ok: false,
        stage: "assets",
        error: "Generating firmware assets failed.",
        details: assetError,
        log: error instanceof Error ? error.stack ?? error.message : String(error),
      },
      { status: 500 },
    );
  }

  const pioCheck = await runCommand("pio", ["--version"], paths.firmwareDir);
  if (pioCheck.code !== 0) {
    return NextResponse.json(
      {
        ok: false,
        stage: "tooling",
        error:
          "PlatformIO (pio) not found in container. Install platformio in image or host runtime.",
        details: summarizeCommandLog(pioCheck.log),
        log: pioCheck.log,
      },
      { status: 500 },
    );
  }

  const build = await runCommand(
    "pio",
    ["run", "-e", PLATFORMIO_ENVIRONMENT],
    paths.firmwareDir,
  );
  if (build.code !== 0) {
    return NextResponse.json(
      {
        ok: false,
        stage: "build",
        error: "PlatformIO build failed.",
        details: summarizeCommandLog(build.log),
        log: build.log,
      },
      { status: 500 },
    );
  }

  try {
    await exportFirmwareArtifacts({
      buildDir: paths.buildDir,
      artifactsDir: paths.artifactsDir,
    });
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
