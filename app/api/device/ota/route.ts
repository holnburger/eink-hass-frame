import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getArtifactsDir } from "@/lib/server/firmware-artifacts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OtaProxyPayload = {
  deviceIp?: string;
  firmwareUrl?: string;
  dryRun?: boolean;
};

const OTA_TIMEOUT_MS = 180000;
const DIRECT_UPLOAD_ENDPOINT = "/api/ota/upload";
const LEGACY_OTA_ENDPOINT = "/api/ota";

function normalizeDeviceHost(raw: string) {
  return raw.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function isAllowedHost(host: string) {
  return /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+$/.test(host) || /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function isLoopbackHost(host: string) {
  const normalized = host.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1" || normalized === "[::1]";
}

function resolveFirmwareUrl(request: Request, providedUrl?: string) {
  const explicit = (providedUrl ?? "").trim();
  if (explicit) {
    return { ok: true as const, url: explicit };
  }

  const envBase = stripTrailingSlash((process.env.FIRMWARE_PUBLIC_BASE_URL ?? "").trim());
  if (envBase) {
    return { ok: true as const, url: `${envBase}/api/firmware/artifacts/firmware.bin` };
  }

  const rawHost = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim();
  const proto = (request.headers.get("x-forwarded-proto") ?? "http").split(",")[0].trim() || "http";
  if (!rawHost) {
    return {
      ok: false as const,
      error:
        "Unable to determine firmware URL. Set FIRMWARE_PUBLIC_BASE_URL or access the app via LAN host.",
    };
  }

  const hostWithoutPort = rawHost.replace(/:\d+$/, "");
  if (isLoopbackHost(hostWithoutPort)) {
    return {
      ok: false as const,
      error:
        "Current app host is localhost. Open the app via LAN IP (e.g. http://192.168.x.y:3000) or set FIRMWARE_PUBLIC_BASE_URL.",
    };
  }

  return { ok: true as const, url: `${proto}://${rawHost}/api/firmware/artifacts/firmware.bin` };
}

async function readFirmwareArtifact() {
  const firmwarePath = path.join(getArtifactsDir(), "firmware.bin");
  try {
    const firmware = await readFile(firmwarePath);
    const sha256 = createHash("sha256").update(firmware).digest("hex");
    return { ok: true as const, firmware, sha256, size: firmware.byteLength };
  } catch {
    return {
      ok: false as const,
      error: "Missing firmware artifact `firmware.bin`. Run Build first.",
    };
  }
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs = OTA_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function sendDirectUpload(deviceHost: string) {
  const artifact = await readFirmwareArtifact();
  if (!artifact.ok) {
    return {
      ok: false as const,
      kind: "artifact" as const,
      error: artifact.error,
    };
  }

  const boundary = `----einkhassframe${Date.now().toString(16)}`;
  const multipartHeader = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="update"; filename="firmware.bin"\r\nContent-Type: application/octet-stream\r\n\r\n`,
    "utf8",
  );
  const multipartFooter = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const body = Buffer.concat([multipartHeader, artifact.firmware, multipartFooter]);

  try {
    const response = await fetchWithTimeout(`http://${deviceHost}${DIRECT_UPLOAD_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    const bodyText = await response.text().catch(() => "");
    if (response.ok) {
      return {
        ok: true as const,
        mode: "upload" as const,
        deviceStatus: response.status,
        deviceBody: bodyText.slice(0, 300),
        artifactSha256: artifact.sha256,
        artifactSize: artifact.size,
      };
    }

    return {
      ok: false as const,
      kind: "http" as const,
      deviceStatus: response.status,
      deviceBody: bodyText.slice(0, 300),
    };
  } catch (error) {
    return {
      ok: false as const,
      kind: "network" as const,
      error: `Failed to reach device: ${String(error)}`,
    };
  }
}

async function sendLegacyUrlOta(deviceHost: string, firmwareUrl: string) {
  try {
    const response = await fetchWithTimeout(`http://${deviceHost}${LEGACY_OTA_ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firmwareUrl }),
    });

    const bodyText = await response.text().catch(() => "");
    if (response.ok) {
      return {
        ok: true as const,
        mode: "url" as const,
        deviceStatus: response.status,
        deviceBody: bodyText.slice(0, 300),
      };
    }

    return {
      ok: false as const,
      error: "Device rejected URL OTA request.",
      deviceStatus: response.status,
      deviceBody: bodyText.slice(0, 300),
    };
  } catch (error) {
    return {
      ok: false as const,
      error: `Failed to reach device for URL OTA fallback: ${String(error)}`,
    };
  }
}

export async function POST(request: Request) {
  const payload = ((await request.json().catch(() => ({}))) ?? {}) as OtaProxyPayload;
  const deviceHost = normalizeDeviceHost(payload.deviceIp ?? "");

  if (!deviceHost || !isAllowedHost(deviceHost)) {
    return NextResponse.json({ ok: false, error: "Invalid device IP/host." }, { status: 400 });
  }

  if (payload.dryRun) {
    const artifact = await readFirmwareArtifact();
    const firmwareUrlResult = resolveFirmwareUrl(request, payload.firmwareUrl);
    return NextResponse.json({
      ok: true,
      dryRun: true,
      uploadReady: artifact.ok,
      uploadError: artifact.ok ? undefined : artifact.error,
      artifactSha256: artifact.ok ? artifact.sha256 : undefined,
      artifactSize: artifact.ok ? artifact.size : undefined,
      firmwareUrl: firmwareUrlResult.ok ? firmwareUrlResult.url : undefined,
      firmwareUrlError: firmwareUrlResult.ok ? undefined : firmwareUrlResult.error,
    });
  }

  const uploadResult = await sendDirectUpload(deviceHost);
  if (uploadResult.ok) {
    return NextResponse.json({
      ok: true,
      mode: uploadResult.mode,
      deviceStatus: uploadResult.deviceStatus,
      deviceBody: uploadResult.deviceBody,
      artifactSha256: uploadResult.artifactSha256,
      artifactSize: uploadResult.artifactSize,
    });
  }

  if (uploadResult.kind === "artifact") {
    return NextResponse.json({ ok: false, error: uploadResult.error }, { status: 400 });
  }

  if (uploadResult.kind === "network") {
    return NextResponse.json({ ok: false, error: uploadResult.error }, { status: 502 });
  }

  const canFallbackToLegacy = [404, 405, 501].includes(uploadResult.deviceStatus);
  if (!canFallbackToLegacy) {
    return NextResponse.json(
      {
        ok: false,
        error: "Device rejected direct upload OTA.",
        deviceStatus: uploadResult.deviceStatus,
        deviceBody: uploadResult.deviceBody,
      },
      { status: 502 },
    );
  }

  const firmwareUrlResult = resolveFirmwareUrl(request, payload.firmwareUrl);
  if (!firmwareUrlResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `Device does not support direct upload OTA and URL fallback is unavailable: ${firmwareUrlResult.error}`,
        uploadStatus: uploadResult.deviceStatus,
      },
      { status: 400 },
    );
  }

  const legacyResult = await sendLegacyUrlOta(deviceHost, firmwareUrlResult.url);
  if (!legacyResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: legacyResult.error,
        deviceStatus: legacyResult.deviceStatus,
        deviceBody: legacyResult.deviceBody,
        fallbackFirmwareUrl: firmwareUrlResult.url,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: legacyResult.mode,
    deviceStatus: legacyResult.deviceStatus,
    deviceBody: legacyResult.deviceBody,
    firmwareUrl: firmwareUrlResult.url,
  });
}
