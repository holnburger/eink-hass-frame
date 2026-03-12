import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HealthProxyPayload = {
  deviceIp?: string;
};

function normalizeDeviceHost(raw: string) {
  return raw.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function isAllowedHost(host: string) {
  return /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+$/.test(host) || /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
}

export async function POST(request: Request) {
  const payload = ((await request.json().catch(() => ({}))) ?? {}) as HealthProxyPayload;
  const deviceHost = normalizeDeviceHost(payload.deviceIp ?? "");

  if (!deviceHost || !isAllowedHost(deviceHost)) {
    return NextResponse.json({ ok: false, error: "Invalid device IP/host." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(`http://${deviceHost}/api/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    const bodyText = await response.text().catch(() => "");
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
  } finally {
    clearTimeout(timeout);
  }
}
