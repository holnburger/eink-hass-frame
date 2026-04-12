import { describe, expect, test } from "bun:test";

import { normalizeHomeAssistantUrl } from "@/lib/home-assistant";

describe("normalizeHomeAssistantUrl", () => {
  test("keeps explicit URLs intact", () => {
    expect(normalizeHomeAssistantUrl("https://homeassistant.local:8123/")).toBe(
      "https://homeassistant.local:8123",
    );
  });

  test("expands a bare local IP to the default Home Assistant URL", () => {
    expect(normalizeHomeAssistantUrl("192.168.1.20")).toBe(
      "http://192.168.1.20:8123",
    );
  });

  test("expands a bare hostname to the default Home Assistant URL", () => {
    expect(normalizeHomeAssistantUrl("homeassistant.local")).toBe(
      "http://homeassistant.local:8123",
    );
  });
});
