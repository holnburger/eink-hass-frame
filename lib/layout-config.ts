import {
  DEFAULT_HOME_ASSISTANT_CONFIG,
  normalizeHomeAssistantBinding,
  normalizeHomeAssistantConfig,
  type HomeAssistantBinding,
  type HomeAssistantConfig,
} from "@/lib/home-assistant";

export const MAX_PAGES = 5;
export const MAX_WIDGETS_PER_PAGE = 8;

export const FONT_OPTIONS = [
  { name: "System Sans", className: "font-sans" },
  { name: "Serif", className: "font-serif" },
  { name: "Mono", className: "font-mono" },
] as const;

export const CLOCK_STYLE_OPTIONS = [
  { value: "digital", label: "Digital" },
  { value: "analog", label: "Analog" },
] as const;

export const SLIDER_ICON_OPTIONS = [
  { value: "lightbulb", label: "Lightbulb" },
  { value: "lamp", label: "Lamp" },
  { value: "fan", label: "Fan" },
  { value: "speaker", label: "Speaker" },
  { value: "volume-high", label: "Volume" },
  { value: "blinds-horizontal", label: "Blinds" },
  { value: "water-percent", label: "Water" },
  { value: "thermometer", label: "Thermostat" },
  { value: "air-humidifier", label: "Humidifier" },
  { value: "brightness-6", label: "Brightness" },
] as const;

export const PAGE_TYPE_OPTIONS = [
  { value: "standard", label: "Standard Page" },
  { value: "overview", label: "Overview Page" },
  { value: "weather-focus", label: "Weather Focus Page" },
  { value: "media-player", label: "Media Player Page" },
] as const;

export type FontName = (typeof FONT_OPTIONS)[number]["name"];
export type ClockStyle = (typeof CLOCK_STYLE_OPTIONS)[number]["value"];
export type SliderIconName = string;
export type PageType = (typeof PAGE_TYPE_OPTIONS)[number]["value"];
export type WidgetType = "clock" | "weather" | "progress" | "switch" | "slider" | "thermostat" | "text";

export type WidgetConfig = {
  id: string;
  type: WidgetType;
  label: string;
  mqttExpose?: boolean;
  mqttName?: string;
  clockStyle?: ClockStyle;
  showSeconds?: boolean;
  showHistoryGraph?: boolean;
  hideWhenUnavailable?: boolean;
  icon?: SliderIconName;
  value?: number;
  currentValue?: number;
  max?: number;
  enabled?: boolean;
  homeAssistant?: HomeAssistantBinding;
};

export type PageConfig = {
  id: string;
  name: string;
  type: PageType;
  homeAssistant?: HomeAssistantBinding;
  widgets: WidgetConfig[];
};

export type BuildConfig = {
  darkMode: boolean;
  fontName: FontName;
  partialRefreshMs: number;
  fullRefreshEvery: number;
  pages: PageConfig[];
  homeAssistant: HomeAssistantConfig;
};

export const WIDGET_OPTIONS: Array<{ type: WidgetType; label: string }> = [
  { type: "clock", label: "Clock" },
  { type: "weather", label: "Weather" },
  { type: "progress", label: "Progress Bar" },
  { type: "switch", label: "Switch" },
  { type: "slider", label: "Slider" },
  { type: "thermostat", label: "Thermostat" },
  { type: "text", label: "Text" },
];

export const TEXT_WIDGET_MQTT_NAME_PATTERN = /^[a-z0-9_]+$/;

function clampPercent(value: unknown, fallback = 50) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function clampTemperature(value: unknown, fallback = 21, step = 0.1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const clamped = Math.max(12, Math.min(30, parsed));
  return Number(roundToStep(clamped, step).toFixed(1));
}

function toPositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.round(parsed);
}

export function getFontClass(fontName: string) {
  return FONT_OPTIONS.find((font) => font.name === fontName)?.className ?? "font-sans";
}

export function isFontName(value: unknown): value is FontName {
  return FONT_OPTIONS.some((font) => font.name === value);
}

export function isSliderIconName(value: unknown): value is SliderIconName {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeSliderIcon(value: unknown): SliderIconName {
  return isSliderIconName(value) ? value.trim() : SLIDER_ICON_OPTIONS[0].value;
}

export function normalizeTextWidgetMqttName(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isValidTextWidgetMqttName(value: unknown): value is string {
  return typeof value === "string" && TEXT_WIDGET_MQTT_NAME_PATTERN.test(value);
}

export function getTextWidgetMqttEntityId(name: unknown) {
  const normalizedName = normalizeTextWidgetMqttName(name);
  return normalizedName.length > 0 ? `text.${normalizedName}` : "";
}

export function getDefaultWidgetLabel(type: WidgetType, index = 0) {
  const count = index + 1;
  switch (type) {
    case "clock":
      return "Clock";
    case "weather":
      return "Weather";
    case "progress":
      return count > 1 ? `Progress ${count}` : "Progress";
    case "switch":
      return count > 1 ? `Switch ${count}` : "Switch";
    case "slider":
      return count > 1 ? `Slider ${count}` : "Slider";
    case "thermostat":
      return count > 1 ? `Thermostat ${count}` : "Thermostat";
    case "text":
      return count > 1 ? `Text ${count}` : "Text";
    default:
      return "Widget";
  }
}

export function makeLocalId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createWidget(type: WidgetType, index = 0): WidgetConfig {
  const base: WidgetConfig = {
    id: makeLocalId(type),
    type,
    label: getDefaultWidgetLabel(type, index),
  };

  if (type === "clock") {
    return {
      ...base,
      clockStyle: "digital",
      showSeconds: true,
    };
  }

  if (type === "progress" || type === "slider") {
    return {
      ...base,
      value: 40,
      max: 100,
      ...(type === "progress" ? { hideWhenUnavailable: false } : {}),
      ...(type === "slider" ? { icon: SLIDER_ICON_OPTIONS[0].value } : {}),
    };
  }

  if (type === "switch") {
    return {
      ...base,
      enabled: false,
      icon: SLIDER_ICON_OPTIONS[0].value,
    };
  }

  if (type === "thermostat") {
    return {
      ...base,
      value: 22.5,
      currentValue: 20.5,
      max: 30,
      showHistoryGraph: false,
    };
  }

  if (type === "text") {
    return {
      ...base,
      label: "Welcome home",
      mqttExpose: false,
      mqttName: "",
    };
  }

  return base;
}

export function createPage(index = 0): PageConfig {
  return createPageOfType(index, "standard");
}

export function createPageOfType(index = 0, type: PageType = "standard"): PageConfig {
  const isOverview = type === "overview";
  const isWeatherFocus = type === "weather-focus";
  const isMediaPlayer = type === "media-player";
  return {
    id: makeLocalId("page"),
    name: isOverview
      ? index === 0
        ? "Overview"
        : `Overview ${index + 1}`
      : isWeatherFocus
        ? index === 0
          ? "Weather"
          : `Weather ${index + 1}`
        : isMediaPlayer
          ? index === 0
            ? "Player"
            : `Player ${index + 1}`
          : index === 0
            ? "Home"
            : `Page ${index + 1}`,
    type,
    homeAssistant: undefined,
    widgets:
      isWeatherFocus || isMediaPlayer
        ? []
        : isOverview
          ? [createWidget("clock"), createWidget("text")]
        : [
            createWidget("clock"),
            createWidget("weather"),
            createWidget("progress"),
            createWidget("switch"),
          ].slice(0, MAX_WIDGETS_PER_PAGE),
  };
}

export const DEFAULT_BUILD_CONFIG: BuildConfig = {
  darkMode: false,
  fontName: FONT_OPTIONS[0].name,
  partialRefreshMs: 30000,
  fullRefreshEvery: 60,
  homeAssistant: DEFAULT_HOME_ASSISTANT_CONFIG,
  pages: [
    {
      id: "page-home",
      name: "Home",
      type: "standard",
      homeAssistant: undefined,
      widgets: [
        { id: "widget-clock", type: "clock", label: "Clock", clockStyle: "digital", showSeconds: true },
        { id: "widget-weather", type: "weather", label: "Weather" },
        {
          id: "widget-progress",
          type: "progress",
          label: "Progress",
          value: 45,
          max: 100,
          hideWhenUnavailable: false,
        },
        { id: "widget-switch", type: "switch", label: "Switch", enabled: false },
        {
          id: "widget-thermostat",
          type: "thermostat",
          label: "Thermostat",
          currentValue: 20.5,
          value: 22.5,
          max: 30,
          showHistoryGraph: false,
        },
      ],
    },
  ],
};

function normalizeWidget(raw: unknown, widgetIndex: number): WidgetConfig | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  const type = candidate.type;
  if (
    type !== "clock" &&
    type !== "weather" &&
    type !== "progress" &&
    type !== "switch" &&
    type !== "slider" &&
    type !== "thermostat" &&
    type !== "text"
  ) {
    return null;
  }

  const id =
    typeof candidate.id === "string" && candidate.id.trim().length > 0
      ? candidate.id
      : `widget-${widgetIndex + 1}`;
  const label =
    typeof candidate.label === "string" && candidate.label.trim().length > 0
      ? candidate.label
      : getDefaultWidgetLabel(type, widgetIndex);

  const normalized: WidgetConfig = { id, type, label };

  if (type === "clock") {
    normalized.clockStyle = candidate.clockStyle === "analog" ? "analog" : "digital";
    normalized.showSeconds = candidate.showSeconds !== false;
  }

  if (type === "progress" || type === "slider") {
    normalized.value = clampPercent(candidate.value, 40);
    normalized.max = 100;
    if (type === "progress") {
      normalized.hideWhenUnavailable = Boolean(candidate.hideWhenUnavailable);
    }
    if (type === "slider") {
      normalized.icon = normalizeSliderIcon(candidate.icon);
    }
  }

  if (type === "thermostat") {
    normalized.currentValue = clampTemperature(candidate.currentValue, 20.5, 0.1);
    normalized.value = clampTemperature(candidate.value, 22.5, 0.5);
    normalized.max = 30;
    normalized.showHistoryGraph = Boolean(candidate.showHistoryGraph);
  }

  if (type === "text") {
    normalized.mqttExpose = Boolean(candidate.mqttExpose);
    normalized.mqttName = normalizeTextWidgetMqttName(candidate.mqttName);
  }

  if (type === "switch") {
    normalized.enabled = Boolean(candidate.enabled);
    normalized.icon = normalizeSliderIcon(candidate.icon);
  }

  normalized.homeAssistant = normalizeHomeAssistantBinding(
    candidate.homeAssistant,
  );

  return normalized;
}

function normalizePagesFromLegacy(candidate: Record<string, unknown>): PageConfig[] {
  const pageName =
    typeof candidate.pageName === "string" && candidate.pageName.trim().length > 0
      ? candidate.pageName.trim()
      : "Home";

  const widgets: WidgetConfig[] = [];
  if (candidate.showClock !== false) {
    widgets.push({
      id: "legacy-clock",
      type: "clock",
      label: "Clock",
      clockStyle: "digital",
      showSeconds: true,
    });
  }
  if (candidate.showWeather !== false) {
    widgets.push({ id: "legacy-weather", type: "weather", label: "Weather" });
  }
  if (candidate.showProgress !== false) {
    widgets.push({
      id: "legacy-progress",
      type: "progress",
      label: "Progress",
      value: clampPercent(candidate.progressValue, 45),
      max: 100,
    });
  }
  if (candidate.showSwitch !== false) {
    widgets.push({
      id: "legacy-switch",
      type: "switch",
      label: "Switch",
      enabled: false,
    });
  }

  if (widgets.length === 0) {
    widgets.push({
      id: "legacy-clock",
      type: "clock",
      label: "Clock",
      clockStyle: "digital",
      showSeconds: true,
    });
  }

  return [
    {
      id: "page-home",
      name: pageName,
      type: "standard",
      homeAssistant: undefined,
      widgets,
    },
  ];
}

export function normalizeBuildConfig(input: unknown): BuildConfig {
  const candidate =
    input && typeof input === "object" ? (input as Record<string, unknown>) : ({} as Record<string, unknown>);
  const pagesInput = Array.isArray(candidate.pages) ? candidate.pages : [];

  const pages =
    pagesInput.length > 0
      ? pagesInput
          .slice(0, MAX_PAGES)
        .map((page, pageIndex) => {
            const rawPage = page && typeof page === "object" ? (page as Record<string, unknown>) : {};
            const name =
              typeof rawPage.name === "string" && rawPage.name.trim().length > 0
                ? rawPage.name.trim()
                : pageIndex === 0
                  ? "Home"
                  : `Page ${pageIndex + 1}`;
            const id =
              typeof rawPage.id === "string" && rawPage.id.trim().length > 0
                ? rawPage.id
                : `page-${pageIndex + 1}`;
            const type: PageType =
              rawPage.type === "overview"
                ? "overview"
                : rawPage.type === "weather-focus"
                ? "weather-focus"
                : rawPage.type === "media-player"
                  ? "media-player"
                  : "standard";
            const widgetsInput = Array.isArray(rawPage.widgets) ? rawPage.widgets : [];
            const widgets =
              type === "weather-focus" || type === "media-player"
                ? []
                : widgetsInput
                    .slice(0, MAX_WIDGETS_PER_PAGE)
                    .map((widget, widgetIndex) => normalizeWidget(widget, widgetIndex))
                    .filter((widget): widget is WidgetConfig => widget !== null);
            const homeAssistant = normalizeHomeAssistantBinding(
              rawPage.homeAssistant,
            );
            return {
              id,
              name,
              type,
              homeAssistant,
              widgets,
            };
          })
      : normalizePagesFromLegacy(candidate);

  return {
    darkMode: Boolean(candidate.darkMode),
    fontName: isFontName(candidate.fontName) ? candidate.fontName : DEFAULT_BUILD_CONFIG.fontName,
    partialRefreshMs: toPositiveInt(candidate.partialRefreshMs, DEFAULT_BUILD_CONFIG.partialRefreshMs),
    fullRefreshEvery: toPositiveInt(candidate.fullRefreshEvery, DEFAULT_BUILD_CONFIG.fullRefreshEvery),
    homeAssistant: normalizeHomeAssistantConfig(candidate.homeAssistant),
    pages: pages.length > 0 ? pages : DEFAULT_BUILD_CONFIG.pages,
  };
}

export function countWidgets(pages: PageConfig[]) {
  return pages.reduce((total, page) => total + page.widgets.length, 0);
}
