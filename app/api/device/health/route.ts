import { NextResponse } from "next/server";
import {
  fetchWithTimeout,
  getDeviceHttpUrl,
  isAllowedDeviceHost,
  normalizeDeviceHost,
  readTruncatedDeviceBody,
} from "@/lib/server/device-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HealthProxyPayload = {
  deviceIp?: string;
};

const HEALTH_TIMEOUT_MS = 6000;
const HEALTH_ENDPOINT = "/api/health";

export async function POST(request: Request) {
  const payload = ((await request.json().catch(() => ({}))) ?? {}) as HealthProxyPayload;
  const deviceHost = normalizeDeviceHost(payload.deviceIp ?? "");

  if (!deviceHost || !isAllowedDeviceHost(deviceHost)) {
    return NextResponse.json({ ok: false, error: "Invalid device IP/host." }, { status: 400 });
  }

  try {
    const response = await fetchWithTimeout(
      getDeviceHttpUrl(deviceHost, HEALTH_ENDPOINT),
      { method: "GET" },
      HEALTH_TIMEOUT_MS,
    );

    const bodyText = await readTruncatedDeviceBody(response);
    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: "Device health check failed.", deviceStatus: response.status },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      deviceStatus: response.status,
      deviceBody: bodyText.slice(0, 300),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: `Failed to reach device: ${String(error)}` },
      { status: 502 },
    );
  }
}
