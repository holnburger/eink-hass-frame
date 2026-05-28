export const DEVICE_RESPONSE_BODY_LIMIT = 300;

export function normalizeDeviceHost(raw: string) {
  return raw.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

export function isAllowedDeviceHost(host: string) {
  return (
    /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+$/.test(host) ||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(host)
  );
}

export function isLoopbackHost(host: string) {
  const normalized = host.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}

export function getHostWithoutPort(host: string) {
  return host.replace(/:\d+$/, "");
}

export function getDeviceHttpUrl(deviceHost: string, endpoint: string) {
  return `http://${deviceHost}${endpoint}`;
}

export async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
) {
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

export async function readTruncatedDeviceBody(
  response: Response,
  maxLength = DEVICE_RESPONSE_BODY_LIMIT,
) {
  const bodyText = await response.text().catch(() => "");
  return bodyText.slice(0, maxLength);
}
