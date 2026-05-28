import { describe, expect, test } from "bun:test";

import {
  collectExposedTextWidgets,
  createGeneratedConfig,
  findDuplicateExposedTextWidgets,
  findInvalidExposedTextWidgets,
  getMissingDeviceHomeAssistantRequirements,
  summarizeCommandLog,
} from "@/lib/server/firmware-build";

describe("createGeneratedConfig", () => {
  test("generates stable firmware header enums and struct field order", async () => {
    const header = await createGeneratedConfig(
      {
        fontName: "Mono",
        darkMode: true,
        hideWidgetBorders: true,
        partialRefreshMs: 45000,
        fullRefreshEvery: 12,
        pages: [
          {
            id: "standard",
            name: "Main",
            type: "standard",
            widgets: [
              {
                id: "message",
                type: "text",
                label: "Line 1\nLine 2",
                mqttExpose: true,
                mqttMode: "notify",
                mqttName: "status_text",
                homeAssistant: { entityId: "sensor.message" },
              },
              {
                id: "dimmer",
                type: "slider",
                label: "Dimmer",
                value: 37,
                icon: "brightness-6",
                invert: true,
                homeAssistant: { entityId: "light.dimmer" },
              },
              {
                id: "thermostat",
                type: "thermostat",
                label: "Heat",
                currentValue: 20.4,
                value: 22.6,
                showHistoryGraph: true,
                homeAssistant: { entityId: "climate.hall" },
              },
            ],
          },
          {
            id: "overview",
            name: "Overview",
            type: "overview",
            widgets: [
              {
                id: "button",
                type: "button",
                label: "Scene",
                enabled: true,
                icon: "lamp",
              },
            ],
          },
          {
            id: "weather",
            name: "Weather",
            type: "weather-focus",
            homeAssistant: { entityId: "weather.home" },
            widgets: [{ id: "ignored", type: "clock", label: "Ignored" }],
          },
          {
            id: "media",
            name: "Media",
            type: "media-player",
            homeAssistant: { entityId: "media_player.legacy" },
            homeAssistantBindings: [
              { entityId: "media_player.one" },
              { entityId: "media_player.two" },
              { entityId: "media_player.three" },
              { entityId: "media_player.four" },
              { entityId: "media_player.five" },
            ],
          },
        ],
      },
      "build-123",
      {
        url: "http://homeassistant.local:8123",
        token: "token-with-quote\"and\\slash",
      },
    );

    expect(header).toContain('#define UI_FONT_NAME "Mono"');
    expect(header).toContain("#define UI_THEME_DARK 1");
    expect(header).toContain("#define UI_HIDE_WIDGET_BORDERS 1");
    expect(header).toContain('#define UI_BUILD_ID "build-123"');
    expect(header).toContain("#define PARTIAL_REFRESH_MS_OVERRIDE 45000");
    expect(header).toContain("#define FULL_REFRESH_EVERY_N_PARTIALS_OVERRIDE 12");
    expect(header).toContain(
      '#define HOME_ASSISTANT_URL_BUILD "http://homeassistant.local:8123"',
    );
    expect(header).toContain(
      '#define HOME_ASSISTANT_TOKEN_BUILD "token-with-quote\\"and\\\\slash"',
    );
    expect(header).toContain("#define HOME_ASSISTANT_ENABLED_BUILD 1");
    expect(header).toContain("#define UI_MAX_MEDIA_PLAYER_ENTITIES 4");

    expect(header).toContain(`enum UiWidgetType : uint8_t {
  UI_WIDGET_CLOCK = 0,
  UI_WIDGET_WEATHER = 1,
  UI_WIDGET_PROGRESS = 2,
  UI_WIDGET_SWITCH = 3,
  UI_WIDGET_BUTTON = 4,
  UI_WIDGET_SLIDER = 5,
  UI_WIDGET_THERMOSTAT = 6,
  UI_WIDGET_TEXT = 7,
  UI_WIDGET_TITLE = 8,
  UI_WIDGET_NONE = 255,
};`);
    expect(header).toContain(`enum UiPageType : uint8_t {
  UI_PAGE_STANDARD = 0,
  UI_PAGE_OVERVIEW = 1,
  UI_PAGE_WEATHER_FOCUS = 2,
  UI_PAGE_MEDIA_PLAYER = 3,
};`);
    expect(header).toContain(`enum UiTextMqttMode : uint8_t {
  UI_TEXT_MQTT_MODE_TEXT = 0,
  UI_TEXT_MQTT_MODE_NOTIFY = 1,
};`);
    expect(header).toContain(`typedef struct {
  uint8_t type;
  const char *label;
  const char *icon;
  int16_t value;
  int16_t currentValue;
  int16_t maxValue;
  uint8_t enabled;
  uint8_t clockStyle;
  uint8_t showSeconds;
  uint8_t showHistoryGraph;
  uint8_t hideWhenUnavailable;
  uint8_t invertLogic;
  uint8_t mqttExpose;
  uint8_t mqttMode;
  const char *mqttName;
  const char *entityId;
} UiWidgetConfig;`);
    expect(header).toContain(`typedef struct {
  uint8_t pageType;
  const char *name;
  uint8_t widgetCount;
  const char *entityId;
  uint8_t mediaEntityCount;
  uint8_t mediaShowActiveOnly;
  const char *mediaEntityIds[UI_MAX_MEDIA_PLAYER_ENTITIES];
  UiWidgetConfig widgets[3];
} UiPageConfig;`);
  });

  test("generates stable page and widget initializers", async () => {
    const header = await createGeneratedConfig(
      {
        pages: [
          {
            name: "Main",
            type: "standard",
            widgets: [
              {
                type: "text",
                label: "Line 1\nLine 2",
                mqttExpose: true,
                mqttMode: "notify",
                mqttName: "status_text",
                homeAssistant: { entityId: "sensor.message" },
              },
              {
                type: "slider",
                label: "Dimmer",
                value: 37,
                icon: "brightness-6",
                invert: true,
                homeAssistant: { entityId: "light.dimmer" },
              },
              {
                type: "thermostat",
                label: "Heat",
                currentValue: 20.4,
                value: 22.6,
                showHistoryGraph: true,
                homeAssistant: { entityId: "climate.hall" },
              },
            ],
          },
          {
            name: "Overview",
            type: "overview",
            widgets: [
              {
                type: "button",
                label: "Scene",
                enabled: true,
                icon: "lamp",
              },
            ],
          },
          {
            name: "Weather",
            type: "weather-focus",
            homeAssistant: { entityId: "weather.home" },
            widgets: [{ type: "clock", label: "Ignored" }],
          },
          {
            name: "Media",
            type: "media-player",
            homeAssistant: { entityId: "media_player.legacy" },
            homeAssistantBindings: [
              { entityId: "media_player.one" },
              { entityId: "media_player.two" },
              { entityId: "media_player.three" },
              { entityId: "media_player.four" },
              { entityId: "media_player.five" },
            ],
          },
        ],
      },
      "build-123",
      {
        url: "http://homeassistant.local:8123",
        token: "token",
      },
    );

    expect(header).toContain("#define UI_PAGE_COUNT 4");
    expect(header).toContain("#define UI_MAX_WIDGETS_PER_PAGE 3");
    expect(header).toContain(
      '  {UI_PAGE_STANDARD, "Main", 3, "", 0, 0, {"", "", "", ""}, {{UI_WIDGET_TEXT, "Line 1\\nLine 2", "", 0, 0, 100, 0, UI_CLOCK_DIGITAL, 1, 0, 0, 0, 1, UI_TEXT_MQTT_MODE_NOTIFY, "status_text", "sensor.message"}, {UI_WIDGET_SLIDER, "Dimmer", "brightness-6", 37, 0, 100, 0, UI_CLOCK_DIGITAL, 1, 0, 0, 1, 0, UI_TEXT_MQTT_MODE_TEXT, "", "light.dimmer"}, {UI_WIDGET_THERMOSTAT, "Heat", "", 225, 204, 300, 0, UI_CLOCK_DIGITAL, 1, 1, 0, 0, 0, UI_TEXT_MQTT_MODE_TEXT, "", "climate.hall"}}}',
    );
    expect(header).toContain(
      '  {UI_PAGE_OVERVIEW, "Overview", 1, "", 0, 0, {"", "", "", ""}, {{UI_WIDGET_BUTTON, "Scene", "lamp", 0, 0, 100, 1, UI_CLOCK_DIGITAL, 1, 0, 0, 0, 0, UI_TEXT_MQTT_MODE_TEXT, "", ""}, {UI_WIDGET_NONE, "", "", 0, 0, 100, 0, UI_CLOCK_DIGITAL, 1, 0, 0, 0, 0, UI_TEXT_MQTT_MODE_TEXT, "", ""}, {UI_WIDGET_NONE, "", "", 0, 0, 100, 0, UI_CLOCK_DIGITAL, 1, 0, 0, 0, 0, UI_TEXT_MQTT_MODE_TEXT, "", ""}}}',
    );
    expect(header).toContain(
      '  {UI_PAGE_WEATHER_FOCUS, "Weather", 0, "weather.home", 0, 0, {"", "", "", ""}, {{UI_WIDGET_NONE, "", "", 0, 0, 100, 0, UI_CLOCK_DIGITAL, 1, 0, 0, 0, 0, UI_TEXT_MQTT_MODE_TEXT, "", ""}, {UI_WIDGET_NONE, "", "", 0, 0, 100, 0, UI_CLOCK_DIGITAL, 1, 0, 0, 0, 0, UI_TEXT_MQTT_MODE_TEXT, "", ""}, {UI_WIDGET_NONE, "", "", 0, 0, 100, 0, UI_CLOCK_DIGITAL, 1, 0, 0, 0, 0, UI_TEXT_MQTT_MODE_TEXT, "", ""}}}',
    );
    expect(header).toContain(
      '  {UI_PAGE_MEDIA_PLAYER, "Media", 0, "media_player.legacy", 4, 1, {"media_player.one", "media_player.two", "media_player.three", "media_player.four"}, {{UI_WIDGET_NONE, "", "", 0, 0, 100, 0, UI_CLOCK_DIGITAL, 1, 0, 0, 0, 0, UI_TEXT_MQTT_MODE_TEXT, "", ""}, {UI_WIDGET_NONE, "", "", 0, 0, 100, 0, UI_CLOCK_DIGITAL, 1, 0, 0, 0, 0, UI_TEXT_MQTT_MODE_TEXT, "", ""}, {UI_WIDGET_NONE, "", "", 0, 0, 100, 0, UI_CLOCK_DIGITAL, 1, 0, 0, 0, 0, UI_TEXT_MQTT_MODE_TEXT, "", ""}}}',
    );
    expect(header).not.toContain("media_player.five");
  });
});

describe("firmware build validation helpers", () => {
  test("collects and validates exposed MQTT text widgets", () => {
    const widgets = collectExposedTextWidgets({
      pages: [
        {
          name: "Main",
          widgets: [
            {
              id: "first",
              type: "text",
              label: "First",
              mqttExpose: true,
              mqttMode: "notify",
              mqttName: "shared_name",
            },
            {
              id: "second",
              type: "text",
              label: "Second",
              mqttExpose: true,
              mqttMode: "text",
              mqttName: "shared_name",
            },
            {
              id: "missing",
              type: "text",
              label: "Missing",
              mqttExpose: true,
              mqttName: "",
            },
          ],
        },
      ],
    });

    expect(widgets).toEqual([
      {
        pageName: "Main",
        widgetId: "first",
        widgetLabel: "First",
        mqttName: "shared_name",
        mqttMode: "notify",
        entityId: "notify.shared_name",
      },
      {
        pageName: "Main",
        widgetId: "second",
        widgetLabel: "Second",
        mqttName: "shared_name",
        mqttMode: "text",
        entityId: "text.shared_name",
      },
      {
        pageName: "Main",
        widgetId: "missing",
        widgetLabel: "Missing",
        mqttName: "",
        mqttMode: "text",
        entityId: "",
      },
    ]);
    expect(findInvalidExposedTextWidgets(widgets).map((widget) => widget.widgetId)).toEqual([
      "missing",
    ]);
    expect(findDuplicateExposedTextWidgets(widgets)).toEqual([]);

    const duplicateWidgets = collectExposedTextWidgets({
      pages: [
        {
          name: "Main",
          widgets: [
            {
              id: "first",
              type: "text",
              label: "First",
              mqttExpose: true,
              mqttMode: "text",
              mqttName: "shared_name",
            },
            {
              id: "second",
              type: "text",
              label: "Second",
              mqttExpose: true,
              mqttMode: "text",
              mqttName: "shared_name",
            },
          ],
        },
      ],
    });

    expect(
      findDuplicateExposedTextWidgets(duplicateWidgets).map(
        (widget) => widget.widgetId,
      ),
    ).toEqual(["first", "second"]);
  });

  test("reports missing device Home Assistant build requirements", () => {
    expect(
      getMissingDeviceHomeAssistantRequirements({ url: "", token: "" }),
    ).toEqual([
      "device Home Assistant local address",
      "device long-lived access token",
    ]);
    expect(
      getMissingDeviceHomeAssistantRequirements({
        url: "http://homeassistant.local:8123",
        token: "token",
      }),
    ).toEqual([]);
  });

  test("summarizes command logs around priority failure lines", () => {
    expect(
      summarizeCommandLog(
        [
          "setup",
          "\u001B[31merror: first failure\u001B[0m",
          "context",
          "fatal: final failure",
        ].join("\n"),
        1,
      ),
    ).toBe("fatal: final failure");

    expect(summarizeCommandLog(["one", "two", "three"].join("\n"), 2)).toBe(
      "two\nthree",
    );
  });
});
