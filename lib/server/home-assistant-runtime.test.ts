import { afterEach, describe, expect, test } from "bun:test";

import { resolveDeviceHomeAssistantConfig } from "@/lib/server/home-assistant-runtime";

const originalEnv = {
  HOME_ASSISTANT_ADDON: process.env.HOME_ASSISTANT_ADDON,
  SUPERVISOR_TOKEN: process.env.SUPERVISOR_TOKEN,
  DEVICE_HOME_ASSISTANT_URL: process.env.DEVICE_HOME_ASSISTANT_URL,
  DEVICE_HOME_ASSISTANT_TOKEN: process.env.DEVICE_HOME_ASSISTANT_TOKEN,
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (typeof value === "string") {
      process.env[key] = value;
    } else {
      delete process.env[key];
    }
  }
});

describe("resolveDeviceHomeAssistantConfig", () => {
  test("uses the configured add-on address and token by default", async () => {
    process.env.HOME_ASSISTANT_ADDON = "1";
    process.env.SUPERVISOR_TOKEN = "supervisor-token";
    process.env.DEVICE_HOME_ASSISTANT_URL = "192.168.1.25";
    process.env.DEVICE_HOME_ASSISTANT_TOKEN = "device-token";

    const result = await resolveDeviceHomeAssistantConfig({
      url: "",
      token: "",
    });

    expect(result).toEqual({
      url: "http://192.168.1.25:8123",
      token: "device-token",
      manualUrlOverride: false,
    });
  });

  test("allows a manual override from the configurator", async () => {
    process.env.HOME_ASSISTANT_ADDON = "1";
    process.env.SUPERVISOR_TOKEN = "supervisor-token";
    process.env.DEVICE_HOME_ASSISTANT_URL = "192.168.1.25";
    process.env.DEVICE_HOME_ASSISTANT_TOKEN = "device-token";

    const result = await resolveDeviceHomeAssistantConfig({
      url: "http://homeassistant.local:8123",
      token: "",
      manualUrlOverride: true,
    });

    expect(result).toEqual({
      url: "http://homeassistant.local:8123",
      token: "device-token",
      manualUrlOverride: false,
    });
  });
});
