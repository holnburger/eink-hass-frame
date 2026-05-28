import { describe, expect, test } from "bun:test";

import {
  createPageOfType,
  createWidget,
  getTextWidgetMqttEntityIdForMode,
  isValidTextWidgetMqttName,
  MAX_OVERVIEW_WIDGETS_PER_PAGE,
  MAX_PAGES,
  MAX_WIDGETS_PER_PAGE,
  normalizeBuildConfig,
  normalizeTextWidgetMqttMode,
  normalizeTextWidgetMqttName,
} from "@/lib/layout-config";

describe("layout config factories", () => {
  test("creates widgets with stable type-specific defaults", () => {
    const textWidget = createWidget("text");
    expect(textWidget.id.startsWith("text-")).toBe(true);
    expect(textWidget).toMatchObject({
      type: "text",
      label: "Welcome home",
      mqttExpose: false,
      mqttMode: "text",
      mqttName: "",
    });

    const sliderWidget = createWidget("slider", 1);
    expect(sliderWidget.id.startsWith("slider-")).toBe(true);
    expect(sliderWidget).toMatchObject({
      type: "slider",
      label: "Slider 2",
      value: 40,
      max: 100,
      icon: "lightbulb",
      invert: false,
    });
  });

  test("creates page types with their current default widgets", () => {
    expect(createPageOfType(0, "standard")).toMatchObject({
      name: "Home",
      type: "standard",
      widgets: [
        { type: "clock" },
        { type: "weather" },
        { type: "progress" },
        { type: "switch" },
      ],
    });

    expect(createPageOfType(2, "overview")).toMatchObject({
      name: "Overview 3",
      type: "overview",
      widgets: [
        { type: "weather" },
        { type: "clock" },
        { type: "text" },
      ],
    });

    expect(createPageOfType(0, "weather-focus")).toMatchObject({
      name: "Weather",
      type: "weather-focus",
      widgets: [],
    });

    expect(createPageOfType(1, "media-player")).toMatchObject({
      name: "Player 2",
      type: "media-player",
      mediaShowActiveOnly: true,
      widgets: [],
    });
  });
});

describe("normalizeBuildConfig", () => {
  test("keeps legacy single-page options compatible", () => {
    const config = normalizeBuildConfig({
      pageName: " Kitchen ",
      showClock: false,
      showWeather: true,
      showProgress: true,
      showSwitch: false,
      progressValue: 123,
      fontName: "Mono",
      partialRefreshMs: "15000",
      fullRefreshEvery: "3",
      homeAssistant: {
        url: "homeassistant.local/",
        token: " token ",
        manualUrlOverride: true,
      },
    });

    expect(config.fontName).toBe("Mono");
    expect(config.partialRefreshMs).toBe(15000);
    expect(config.fullRefreshEvery).toBe(3);
    expect(config.homeAssistant).toEqual({
      url: "http://homeassistant.local:8123",
      token: "token",
      manualUrlOverride: true,
    });
    expect(config.pages).toEqual([
      {
        id: "page-home",
        name: "Kitchen",
        type: "standard",
        homeAssistant: undefined,
        widgets: [
          {
            id: "legacy-weather",
            type: "weather",
            label: "Weather",
          },
          {
            id: "legacy-progress",
            type: "progress",
            label: "Progress",
            value: 100,
            max: 100,
          },
        ],
      },
    ]);
  });

  test("keeps a legacy page usable when all legacy widgets are hidden", () => {
    const config = normalizeBuildConfig({
      showClock: false,
      showWeather: false,
      showProgress: false,
      showSwitch: false,
    });

    expect(config.pages[0].widgets).toEqual([
      {
        id: "legacy-clock",
        type: "clock",
        label: "Clock",
        clockStyle: "digital",
        showSeconds: true,
      },
    ]);
  });

  test("normalizes text MQTT names and modes for persisted widgets", () => {
    expect(normalizeTextWidgetMqttName(" Kitchen-Alert!! 42 ")).toBe(
      "kitchen_alert_42",
    );
    expect(isValidTextWidgetMqttName("kitchen_alert_42")).toBe(true);
    expect(isValidTextWidgetMqttName("Kitchen Alert")).toBe(false);
    expect(normalizeTextWidgetMqttMode("notify")).toBe("notify");
    expect(normalizeTextWidgetMqttMode("invalid")).toBe("text");
    expect(
      getTextWidgetMqttEntityIdForMode(" Kitchen-Alert!! 42 ", "notify"),
    ).toBe("notify.kitchen_alert_42");

    const config = normalizeBuildConfig({
      pages: [
        {
          id: "page",
          name: "Page",
          type: "standard",
          widgets: [
            {
              id: "message",
              type: "text",
              label: "",
              mqttExpose: 1,
              mqttMode: "invalid",
              mqttName: " Kitchen-Alert!! 42 ",
            },
          ],
        },
      ],
    });
    const [widget] = config.pages[0].widgets;

    expect(widget).toMatchObject({
      id: "message",
      type: "text",
      label: "Text",
      mqttExpose: true,
      mqttMode: "text",
      mqttName: "kitchen_alert_42",
    });
  });

  test("enforces page and widget caps", () => {
    const pages = Array.from({ length: MAX_PAGES + 2 }, (_, index) => ({
      id: `page-${index}`,
      name: `Page ${index}`,
      type: "standard",
      widgets: [],
    }));
    expect(normalizeBuildConfig({ pages }).pages).toHaveLength(MAX_PAGES);

    const widgets = Array.from(
      { length: MAX_OVERVIEW_WIDGETS_PER_PAGE + 4 },
      (_, index) => ({
        id: `widget-${index}`,
        type: "text",
        label: `Text ${index}`,
      }),
    );

    expect(
      normalizeBuildConfig({
        pages: [{ type: "standard", widgets }],
      }).pages[0].widgets,
    ).toHaveLength(MAX_WIDGETS_PER_PAGE);
    expect(
      normalizeBuildConfig({
        pages: [{ type: "overview", widgets }],
      }).pages[0].widgets,
    ).toHaveLength(MAX_OVERVIEW_WIDGETS_PER_PAGE);
  });

  test("preserves no-widget rules for weather and media pages", () => {
    const config = normalizeBuildConfig({
      pages: [
        {
          id: "weather",
          name: "Forecast",
          type: "weather-focus",
          homeAssistant: {
            entityId: " weather.home ",
            friendlyName: " Home Weather ",
          },
          widgets: [{ id: "clock", type: "clock", label: "Clock" }],
        },
        {
          id: "media",
          name: "Player",
          type: "media-player",
          homeAssistant: {
            entityId: " media_player.den ",
            friendlyName: " Den ",
          },
          mediaShowActiveOnly: false,
          widgets: [{ id: "clock", type: "clock", label: "Clock" }],
        },
      ],
    });

    expect(config.pages[0]).toMatchObject({
      id: "weather",
      name: "Forecast",
      type: "weather-focus",
      homeAssistant: {
        entityId: "weather.home",
        friendlyName: "Home Weather",
      },
      homeAssistantBindings: undefined,
      mediaShowActiveOnly: undefined,
      widgets: [],
    });
    expect(config.pages[1]).toMatchObject({
      id: "media",
      name: "Player",
      type: "media-player",
      homeAssistant: {
        entityId: "media_player.den",
        friendlyName: "Den",
      },
      homeAssistantBindings: [
        {
          entityId: "media_player.den",
          friendlyName: "Den",
        },
      ],
      mediaShowActiveOnly: false,
      widgets: [],
    });
  });

  test("uses explicit media player bindings before legacy page binding", () => {
    const config = normalizeBuildConfig({
      pages: [
        {
          type: "media-player",
          homeAssistant: { entityId: "media_player.den" },
          homeAssistantBindings: [
            { entityId: " media_player.kitchen ", friendlyName: " Kitchen " },
            { entityId: " " },
          ],
        },
      ],
    });

    expect(config.pages[0].homeAssistantBindings).toEqual([
      {
        entityId: "media_player.kitchen",
        friendlyName: "Kitchen",
      },
    ]);
  });

  test("converts button and switch shapes for page compatibility", () => {
    const overviewWidgets = normalizeBuildConfig({
      pages: [
        {
          type: "overview",
          widgets: [
            {
              id: "switch-widget",
              type: "switch",
              label: "Switch",
              enabled: true,
            },
            {
              id: "button-widget",
              type: "button",
              label: "Button",
              enabled: true,
              icon: "fan",
              invert: true,
            },
          ],
        },
      ],
    }).pages[0].widgets;

    expect(overviewWidgets[0]).toMatchObject({
      id: "switch-widget",
      type: "button",
      label: "Switch",
      enabled: true,
      icon: "lightbulb",
    });
    expect(overviewWidgets[1]).toMatchObject({
      id: "button-widget",
      type: "button",
      label: "Button",
      enabled: true,
      icon: "fan",
      invert: true,
    });

    const standardWidgets = normalizeBuildConfig({
      pages: [
        {
          type: "standard",
          widgets: [
            {
              id: "button-widget",
              type: "button",
              label: "Button",
              enabled: true,
              icon: "fan",
              invert: true,
            },
          ],
        },
      ],
    }).pages[0].widgets;

    expect(standardWidgets[0]).toMatchObject({
      id: "button-widget",
      type: "switch",
      label: "Button",
      enabled: true,
      icon: undefined,
      invert: true,
    });
  });
});
