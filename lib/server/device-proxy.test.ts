import { describe, expect, test } from "bun:test";

import {
  getDeviceHttpUrl,
  getHostWithoutPort,
  isAllowedDeviceHost,
  isLoopbackHost,
  normalizeDeviceHost,
  readTruncatedDeviceBody,
} from "@/lib/server/device-proxy";

describe("device proxy host helpers", () => {
  test("normalizes device host input without broadening host validation", () => {
    expect(normalizeDeviceHost(" http://192.168.1.50/ ")).toBe(
      "192.168.1.50",
    );
    expect(normalizeDeviceHost("https://m5paper.local///")).toBe(
      "m5paper.local",
    );
    expect(normalizeDeviceHost("http://192.168.1.50/api/health")).toBe(
      "192.168.1.50/api/health",
    );
  });

  test("keeps the current device host allow-list behavior", () => {
    expect(isAllowedDeviceHost("192.168.1.50")).toBe(true);
    expect(isAllowedDeviceHost("999.999.999.999")).toBe(true);
    expect(isAllowedDeviceHost("m5paper.local")).toBe(true);
    expect(isAllowedDeviceHost("m5-paper.local")).toBe(true);
    expect(isAllowedDeviceHost("192.168.1.50:80")).toBe(false);
    expect(isAllowedDeviceHost("192.168.1.50/api/health")).toBe(false);
    expect(isAllowedDeviceHost("m5paper.local:80")).toBe(false);
    expect(isAllowedDeviceHost("")).toBe(false);
  });

  test("detects loopback app hosts used by legacy URL OTA fallback", () => {
    expect(isLoopbackHost("localhost")).toBe(true);
    expect(isLoopbackHost("LOCALHOST")).toBe(true);
    expect(isLoopbackHost("127.0.0.1")).toBe(true);
    expect(isLoopbackHost("::1")).toBe(true);
    expect(isLoopbackHost("[::1]")).toBe(true);
    expect(isLoopbackHost("192.168.1.20")).toBe(false);
  });

  test("normalizes forwarded app hosts and builds device URLs", () => {
    expect(getHostWithoutPort("192.168.1.20:3000")).toBe("192.168.1.20");
    expect(getHostWithoutPort("homeassistant.local:8099")).toBe(
      "homeassistant.local",
    );
    expect(getHostWithoutPort("[::1]:3000")).toBe("[::1]");
    expect(getDeviceHttpUrl("192.168.1.50", "/api/health")).toBe(
      "http://192.168.1.50/api/health",
    );
  });

  test("truncates device response bodies consistently", async () => {
    const response = new Response("abcdef");
    await expect(readTruncatedDeviceBody(response, 3)).resolves.toBe("abc");
  });
});
