import { describe, expect, test } from "bun:test";

import { isSavedDevice } from "@/hooks/use-saved-devices";

describe("isSavedDevice", () => {
  test("accepts the persisted saved-device shape", () => {
    expect(
      isSavedDevice({
        id: "device-1",
        name: "Kitchen Frame",
        ip: "192.168.1.50",
        lastSeen: "2026-05-29T12:00:00.000Z",
      }),
    ).toBe(true);
  });

  test("rejects malformed saved-device records", () => {
    expect(isSavedDevice(null)).toBe(false);
    expect(isSavedDevice({ id: "device-1", name: "Kitchen Frame" })).toBe(
      false,
    );
    expect(
      isSavedDevice({
        id: "device-1",
        name: "Kitchen Frame",
        ip: 1234,
        lastSeen: "2026-05-29T12:00:00.000Z",
      }),
    ).toBe(false);
  });
});
