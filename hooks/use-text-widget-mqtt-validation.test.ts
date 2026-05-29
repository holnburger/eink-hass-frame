import { describe, expect, test } from "bun:test";

import { createTextWidgetMqttBaseValidation } from "@/hooks/use-text-widget-mqtt-validation";
import type { PageConfig } from "@/lib/layout-config";

const basePage: PageConfig = {
  id: "page-1",
  name: "Page",
  type: "standard",
  widgets: [],
};

describe("createTextWidgetMqttBaseValidation", () => {
  test("builds entity IDs for exposed text widgets", () => {
    expect(
      createTextWidgetMqttBaseValidation([
        {
          ...basePage,
          widgets: [
            {
              id: "text-1",
              type: "text",
              label: "Greeting",
              mqttExpose: true,
              mqttMode: "text",
              mqttName: "welcome_home",
            },
            {
              id: "text-2",
              type: "text",
              label: "Alert",
              mqttExpose: true,
              mqttMode: "notify",
              mqttName: "front_door",
            },
          ],
        },
      ]),
    ).toEqual({
      "text-1": {
        entityId: "text.welcome_home",
        invalidReason: undefined,
      },
      "text-2": {
        entityId: "notify.front_door",
        invalidReason: undefined,
      },
    });
  });

  test("flags empty and duplicate exposed names", () => {
    expect(
      createTextWidgetMqttBaseValidation([
        {
          ...basePage,
          widgets: [
            {
              id: "empty",
              type: "text",
              label: "Empty",
              mqttExpose: true,
              mqttName: "",
            },
            {
              id: "first",
              type: "text",
              label: "First",
              mqttExpose: true,
              mqttName: "same_name",
            },
            {
              id: "second",
              type: "text",
              label: "Second",
              mqttExpose: true,
              mqttName: "same_name",
            },
          ],
        },
      ]),
    ).toEqual({
      empty: {
        entityId: "",
        invalidReason: "Enter an input name with letters, numbers, or underscores.",
      },
      first: {
        duplicateInLayout: true,
        entityId: "text.same_name",
        invalidReason: undefined,
      },
      second: {
        duplicateInLayout: true,
        entityId: "text.same_name",
        invalidReason: undefined,
      },
    });
  });
});
