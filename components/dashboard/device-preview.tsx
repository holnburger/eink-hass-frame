"use client";

import Image from "next/image";
import { icons as weatherIcons } from "@iconify-json/wi";
import { getIconData, iconToSVG, replaceIDs } from "@iconify/utils";
import { ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MdiIcon } from "@/components/dashboard/mdi-icon";
import {
  THERMOSTAT_HISTORY_POINT_COUNT,
  WEATHER_HOURLY_FORECAST_POINT_COUNT,
  isHomeAssistantEntityUnavailable,
  resolveHomeAssistantMediaPlayer,
  resolveHomeAssistantEnabled,
  resolveHomeAssistantNumericValue,
  resolveHomeAssistantThermostat,
  resolveHomeAssistantWeather,
  resolveHomeAssistantWeatherPage,
  type HomeAssistantConfig,
  type HomeAssistantEntityState,
} from "@/lib/home-assistant";
import type { PageConfig, WidgetConfig } from "@/lib/layout-config";

type DevicePreviewProps = {
  darkMode: boolean;
  fontClass: string;
  pages: PageConfig[];
  homeAssistantConfig: HomeAssistantConfig;
  homeAssistantStates: Record<string, HomeAssistantEntityState>;
  activePageIndex: number;
  onPageChange: (pageIndex: number) => void;
};

type PreviewThermostatHistoryEntry = {
  label: string;
  temperature: number | null;
};

function previewCardClasses(darkMode: boolean, extra = "") {
  return darkMode
    ? `border border-white/12 bg-black ${extra}`.trim()
    : `border border-current/15 bg-white/55 ${extra}`.trim();
}

const WEATHER_STATES = [
  { temperature: 7, condition: "Cloudy" },
  { temperature: 8, condition: "Light rain" },
  { temperature: 10, condition: "Clear" },
  { temperature: 6, condition: "Windy" },
] as const;

const MEDIA_MOCK = {
  title: "Welcome To The Black",
  artist: "My Chemical Romance",
  progress: 43,
  coverUrl: "/mock/black-cover.jpg",
  hasContent: true,
  state: "playing",
} as const;

const PREVIEW_DAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;
const PREVIEW_HOURLY_LABELS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
] as const;

function truncateMediaTitle(title: string, fontClass: string) {
  const hardLimit = fontClass.includes("font-mono") ? 22 : 30;
  if (title.length <= hardLimit) {
    return title;
  }
  return `${title.slice(0, hardLimit)}...`;
}

function WeatherGlyph({
  iconName,
  className = "h-14 w-14",
}: {
  iconName: string;
  className?: string;
}) {
  const rendered = useMemo(() => {
    const iconData = getIconData(weatherIcons, iconName);
    if (!iconData) {
      return null;
    }
    const svg = iconToSVG(iconData, { width: "128", height: "128" });
    return {
      viewBox: String(svg.attributes.viewBox ?? "0 0 128 128"),
      body: replaceIDs(svg.body),
    };
  }, [iconName]);

  if (!rendered) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      viewBox={rendered.viewBox}
      className={className}
      fill="currentColor"
      dangerouslySetInnerHTML={{ __html: rendered.body }}
    />
  );
}

function WeatherIcon({
  condition,
  className = "h-14 w-14",
}: {
  condition: string;
  className?: string;
}) {
  const iconName = useMemo(() => {
    const normalizedCondition = condition.toLowerCase();
    if (
      normalizedCondition.includes("clear-night") ||
      normalizedCondition.includes("night")
    ) {
      return "night-clear";
    }
    if (normalizedCondition.includes("partly")) {
      return normalizedCondition.includes("night")
        ? "night-alt-partly-cloudy"
        : "day-cloudy";
    }
    if (
      normalizedCondition.includes("sunny") ||
      normalizedCondition.includes("clear")
    ) {
      return "day-sunny";
    }
    if (normalizedCondition.includes("windy-variant")) {
      return "cloudy-windy";
    }
    if (normalizedCondition.includes("wind")) {
      return "strong-wind";
    }
    if (
      normalizedCondition.includes("drizzle") ||
      normalizedCondition.includes("sprinkle")
    ) {
      return "sprinkle";
    }
    if (
      normalizedCondition.includes("lightning-rainy") ||
      normalizedCondition.includes("storm")
    ) {
      return "storm-showers";
    }
    if (normalizedCondition.includes("lightning")) {
      return "lightning";
    }
    if (
      normalizedCondition.includes("snowy-rainy") ||
      normalizedCondition.includes("sleet")
    ) {
      return "sleet";
    }
    if (normalizedCondition.includes("snow")) {
      return "snow";
    }
    if (normalizedCondition.includes("hail")) {
      return "hail";
    }
    if (normalizedCondition.includes("fog")) {
      return "fog";
    }
    if (
      normalizedCondition.includes("pouring") ||
      normalizedCondition.includes("showers")
    ) {
      return "showers";
    }
    if (normalizedCondition.includes("rain")) {
      return "rain";
    }
    return "cloudy";
  }, [condition]);
  return <WeatherGlyph iconName={iconName} className={className} />;
}

function formatClock(date: Date | null, showSeconds: boolean) {
  if (!date) {
    return showSeconds ? "--:--:--" : "--:--";
  }
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    ...(showSeconds ? { second: "2-digit" } : {}),
  });
}

function formatPreviewWeatherDate(date: Date | null) {
  if (!date) {
    return "Today";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function getBoundEntityState(
  bindingTarget: { homeAssistant?: { entityId: string } | undefined },
  homeAssistantStates: Record<string, HomeAssistantEntityState>,
) {
  const entityId = bindingTarget.homeAssistant?.entityId?.trim();
  return entityId ? homeAssistantStates[entityId] : undefined;
}

function PreviewSwitch({
  widget,
  entity,
  darkMode,
}: {
  widget: WidgetConfig;
  entity?: HomeAssistantEntityState;
  darkMode: boolean;
}) {
  const enabled =
    resolveHomeAssistantEnabled(entity) ?? Boolean(widget.enabled);

  return (
    <div
      className={`rounded-[1.25rem] px-4 py-3 text-left ${previewCardClasses(darkMode)}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-55">
            Switch
          </p>
          <p className="mt-0.5 text-base font-semibold">{widget.label}</p>
        </div>
        <span
          className={`relative h-8 w-14 rounded-full p-0.5 transition ${
            enabled ? "bg-zinc-700/80" : "bg-zinc-400/40"
          }`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
              enabled ? "left-7" : "left-1"
            }`}
          />
        </span>
      </div>
    </div>
  );
}

function PreviewText({ widget }: { widget: WidgetConfig }) {
  return (
    <div className="px-4 py-4 text-center">
      <p className="whitespace-pre-line text-[1.28rem] leading-[2.28]">
        {widget.label}
      </p>
    </div>
  );
}

function PreviewProgress({
  widget,
  entity,
  darkMode,
}: {
  widget: WidgetConfig;
  entity?: HomeAssistantEntityState;
  darkMode: boolean;
}) {
  const entityUnavailable = isHomeAssistantEntityUnavailable(entity);
  if (widget.hideWhenUnavailable && entityUnavailable) {
    return null;
  }
  const liveValue = entityUnavailable
    ? undefined
    : resolveHomeAssistantNumericValue(entity, "progress");
  const value = entityUnavailable
    ? null
    : Math.max(0, Math.min(100, liveValue ?? widget.value ?? 0));

  return (
    <div
      className={`rounded-[1.25rem] px-4 py-3 ${previewCardClasses(darkMode)}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-55">
            Progress
          </p>
          <p className="mt-0.5 text-base font-semibold">{widget.label}</p>
        </div>
        {value !== null ? (
          <p className="text-sm font-medium tabular-nums opacity-70">
            {value}%
          </p>
        ) : null}
      </div>
      <div
        className={`mt-3 h-3 rounded-full p-0.5 ${darkMode ? "bg-white/10" : "bg-zinc-400/25"}`}
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#111827_0%,#6b7280_100%)]"
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  );
}

function PreviewSlider({
  widget,
  entity,
  darkMode,
}: {
  widget: WidgetConfig;
  entity?: HomeAssistantEntityState;
  darkMode: boolean;
}) {
  const liveValue = resolveHomeAssistantNumericValue(entity, "slider");
  const value = Math.max(0, Math.min(100, liveValue ?? widget.value ?? 0));

  const ratio = (value / 100).toFixed(3);
  const knobPosition = `calc(44px + ${ratio} * (100% - 66px))`;
  const fillWidth = value > 0 ? `calc(25px + ${ratio} * (100% - 66px))` : "0px";

  return (
    <div className={`rounded-[1.35rem] p-4 ${previewCardClasses(darkMode)}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-55">
            Slider
          </p>
          <p className="mt-1 text-lg font-semibold">{widget.label}</p>
        </div>
        <p className="text-sm font-medium tabular-nums opacity-70">{value}%</p>
      </div>
      <div className="mt-4">
        <div className="relative h-11 touch-none select-none">
          <div
            className={`absolute inset-0 rounded-full border ${darkMode ? "border-white/70 bg-black" : "border-zinc-900 bg-white"}`}
          />
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${darkMode ? "bg-white" : "bg-zinc-900"}`}
            style={{ width: fillWidth }}
          />
          <div
            className={`absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full border ${
              value > 0
                ? darkMode
                  ? "border-white bg-white text-zinc-900"
                  : "border-zinc-900 bg-zinc-900 text-white"
                : darkMode
                  ? "border-white bg-black text-white"
                  : "border-zinc-900 bg-white text-zinc-900"
            }`}
          >
            {widget.icon ? (
              <MdiIcon
                icon={widget.icon}
                size={18}
                className="h-[1.05rem] w-[1.05rem]"
              />
            ) : (
              <Lightbulb className="h-[1.05rem] w-[1.05rem]" />
            )}
          </div>
          {value > 0 ? (
            <div
              className={`absolute top-0 h-11 w-11 -translate-x-1/2 rounded-full ${
                darkMode ? "bg-white" : "bg-zinc-900"
              }`}
              style={{ left: knobPosition }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PreviewThermostat({
  widget,
  entity,
  now,
  darkMode,
}: {
  widget: WidgetConfig;
  entity?: HomeAssistantEntityState;
  now: Date | null;
  darkMode: boolean;
}) {
  const hasHomeAssistantBinding = Boolean(widget.homeAssistant?.entityId);
  const liveThermostat = resolveHomeAssistantThermostat(entity, {
    now: now ?? new Date(),
  });
  const currentTemp =
    liveThermostat?.currentValue ??
    (hasHomeAssistantBinding ? undefined : (widget.currentValue ?? 20.5));
  const targetTemp =
    liveThermostat?.value ??
    (hasHomeAssistantBinding ? undefined : (widget.value ?? 22.5));
  const temperatureUnit = liveThermostat?.temperatureUnit ?? "°C";
  const thermostatControls = [
    liveThermostat?.supportsActivate
      ? {
          key: "activate",
          icon: "power",
          active: liveThermostat.activeControl === "activate",
        }
      : null,
    liveThermostat?.supportsDeactivate
      ? {
          key: "deactivate",
          icon: "power-off",
          active: liveThermostat.activeControl === "deactivate",
        }
      : null,
    liveThermostat?.supportsCool
      ? {
          key: "cool",
          icon: "snowflake",
          active: liveThermostat.activeControl === "cool",
        }
      : null,
  ].filter(
    (control): control is { key: string; icon: string; active: boolean } =>
      Boolean(control),
  );
  const currentText =
    typeof currentTemp === "number" ? currentTemp.toFixed(1) : "--.-";
  const targetText =
    typeof targetTemp === "number" ? targetTemp.toFixed(1) : "--.-";
  const history = !widget.showHistoryGraph
    ? []
    : hasHomeAssistantBinding
      ? (liveThermostat?.history ?? [])
      : buildPreviewThermostatHistoryFallback(
          typeof currentTemp === "number" ? currentTemp : 20.5,
          now,
        );

  return (
    <div
      className={`rounded-[1.45rem] px-4 pt-5.5 ${
        darkMode
          ? "border border-white/12 bg-black"
          : "border border-current/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.74)_0%,rgba(238,238,234,0.92)_100%)]"
      } ${widget.showHistoryGraph ? "pb-5" : "pb-5.5"}`}
    >
      <p className="text-[10px] uppercase tracking-[0.22em] opacity-55">
        Thermostat
      </p>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-lg">{widget.label}</p>
          {thermostatControls.length > 0 ? (
            <div className="mt-3 flex items-center gap-2.5">
              {thermostatControls.map((control) => (
                <PreviewThermostatModeButton
                  key={control.key}
                  icon={control.icon}
                  darkMode={darkMode}
                  active={control.active}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="mr-6 flex items-start gap-4">
          <div className="w-40 shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-[0.16em] opacity-45">
              Current / Target
            </p>
            <div className="mt-1.5 flex items-end justify-end gap-3">
              <div className="flex items-end">
                <p className="text-[1.9rem] font-black tabular-nums leading-none">
                  {currentText}
                </p>
                <span className="ml-1 translate-y-px text-[0.72rem] opacity-60">
                  {temperatureUnit}
                </span>
              </div>
              <span className="translate-y-px text-sm opacity-40">/</span>
              <div className="flex items-end">
                <p className="text-[1.45rem] font-medium tabular-nums leading-none">
                  {targetText}
                </p>
                <span className="ml-1 translate-y-px text-[0.68rem] opacity-55">
                  {temperatureUnit}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center pl-2 pr-0 py-2">
            <div className="ml-2 flex flex-col items-center gap-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full text-current/80">
                <ChevronRight className="h-4.5 w-4.5 -rotate-90 stroke-[3.2]" />
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded-full text-current/80">
                <ChevronRight className="h-4.5 w-4.5 rotate-90 stroke-[3.2]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {widget.showHistoryGraph ? (
        <div className="mt-5.5">
          <PreviewThermostatHistoryChart
            entries={history}
            darkMode={darkMode}
          />
        </div>
      ) : null}
    </div>
  );
}

function PreviewThermostatModeButton({
  icon,
  darkMode,
  active,
}: {
  icon: string;
  darkMode: boolean;
  active: boolean;
}) {
  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-full border ${
        active
          ? darkMode
            ? "border-white/18 bg-zinc-100 text-zinc-950"
            : "border-zinc-900 bg-zinc-900 text-white"
          : darkMode
            ? "border-white/14 bg-white/4 text-zinc-200"
            : "border-current/15 bg-white/75 text-zinc-700"
      }`}
    >
      <MdiIcon icon={icon} size={16} className="h-4 w-4" />
    </div>
  );
}

function PreviewWeather({
  widget,
  entity,
  index,
  darkMode,
}: {
  widget: WidgetConfig;
  entity?: HomeAssistantEntityState;
  index: number;
  darkMode: boolean;
}) {
  const weather =
    resolveHomeAssistantWeather(entity) ??
    WEATHER_STATES[index % WEATHER_STATES.length];
  const temperature =
    typeof weather.temperature === "number" ? weather.temperature : "--";
  const temperatureUnit =
    "temperatureUnit" in weather ? weather.temperatureUnit : "°C";

  return (
    <div className={`rounded-[1.35rem] p-4 ${previewCardClasses(darkMode)}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-55">
            Weather
          </p>
          <p className="mt-1 text-lg font-semibold">{widget.label}</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums">
            {temperature}
            {temperatureUnit}
          </p>
          <p className="text-sm opacity-70">{weather.condition}</p>
        </div>
        <div
          className={`mt-0.5 flex h-32 w-32 items-center justify-center rounded-[1.35rem] ${darkMode ? "bg-white/6" : "bg-zinc-400/6"}`}
        >
          <WeatherIcon condition={weather.condition} className="h-28 w-28" />
        </div>
      </div>
    </div>
  );
}

function previewWeatherRainChanceForCondition(condition: string) {
  if (condition.includes("Rain") || condition.includes("rain")) {
    return 68;
  }
  if (condition.includes("Cloud")) {
    return 38;
  }
  if (condition.includes("Wind")) {
    return 20;
  }
  return 10;
}

type PreviewWeatherForecastEntry = {
  label: string;
  temperature: number | null;
  lowTemperature: number | null;
  condition: string;
  precipitationProbability: number | null;
};

type PreviewWeatherHourlyEntry = {
  label: string;
  temperature: number | null;
  precipitationProbability: number | null;
};

function buildPreviewWeatherDailyFallback(
  pageIndex: number,
  now: Date | null,
): PreviewWeatherForecastEntry[] {
  if (!now) {
    return Array.from({ length: 3 }, (_, index) => {
      const source =
        WEATHER_STATES[(pageIndex + index + 1) % WEATHER_STATES.length];
      return {
        label:
          PREVIEW_DAY_LABELS[
            (pageIndex + index + 1) % PREVIEW_DAY_LABELS.length
          ],
        temperature: source.temperature,
        lowTemperature: source.temperature - 2,
        condition: source.condition,
        precipitationProbability: previewWeatherRainChanceForCondition(
          source.condition,
        ),
      };
    });
  }

  return Array.from({ length: 3 }, (_, index) => {
    const source =
      WEATHER_STATES[(pageIndex + index + 1) % WEATHER_STATES.length];
    const date = new Date(now.getTime());
    date.setDate(date.getDate() + index + 1);
    return {
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      temperature: source.temperature,
      lowTemperature: source.temperature - 2,
      condition: source.condition,
      precipitationProbability: previewWeatherRainChanceForCondition(
        source.condition,
      ),
    };
  });
}

function buildPreviewWeatherHourlyFallback(
  pageIndex: number,
  currentTemperature: number,
  now: Date | null,
): PreviewWeatherHourlyEntry[] {
  const offsets = [0, 1, 2, 3, 4, 4, 3, 2, 1, 0, -1, -1];

  if (!now) {
    return Array.from(
      { length: WEATHER_HOURLY_FORECAST_POINT_COUNT },
      (_, index) => {
        const source =
          WEATHER_STATES[(pageIndex + index) % WEATHER_STATES.length];
        return {
          label:
            PREVIEW_HOURLY_LABELS[index] ??
            PREVIEW_HOURLY_LABELS[PREVIEW_HOURLY_LABELS.length - 1],
          temperature: Math.round(
            (currentTemperature * 2 + source.temperature + offsets[index]) / 3,
          ),
          precipitationProbability: previewWeatherRainChanceForCondition(
            source.condition,
          ),
        };
      },
    );
  }

  return Array.from(
    { length: WEATHER_HOURLY_FORECAST_POINT_COUNT },
    (_, index) => {
      const source =
        WEATHER_STATES[(pageIndex + index) % WEATHER_STATES.length];
      const date = new Date(now.getTime());
      date.setHours(date.getHours() + index + 1);
      return {
        label: date.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        temperature: Math.round(
          (currentTemperature * 2 + source.temperature + offsets[index]) / 3,
        ),
        precipitationProbability: previewWeatherRainChanceForCondition(
          source.condition,
        ),
      };
    },
  );
}

function buildPreviewThermostatHistoryFallback(
  currentTemperature: number,
  now: Date | null,
): PreviewThermostatHistoryEntry[] {
  const baseDate = now ? new Date(now.getTime()) : new Date();
  baseDate.setMinutes(0, 0, 0);

  return Array.from({ length: THERMOSTAT_HISTORY_POINT_COUNT }, (_, index) => {
    const slotDate = new Date(baseDate.getTime());
    slotDate.setHours(
      slotDate.getHours() - (THERMOSTAT_HISTORY_POINT_COUNT - 1 - index),
    );
    return {
      label: slotDate.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      temperature: Number(
        (
          currentTemperature +
          Math.sin(index / 3.1) * 0.45 +
          Math.cos(index / 4.3) * 0.15
        ).toFixed(1),
      ),
    };
  });
}

function formatPreviewTemperaturePointLabel(value: number) {
  return `${value.toFixed(1)}°`;
}

function PreviewThermostatHistoryChart({
  entries,
  darkMode,
}: {
  entries: PreviewThermostatHistoryEntry[];
  darkMode: boolean;
}) {
  const numericEntries = entries.filter(
    (entry): entry is PreviewThermostatHistoryEntry & { temperature: number } =>
      typeof entry.temperature === "number",
  );
  if (numericEntries.length === 0) {
    return (
      <div className="flex h-22 items-center justify-center rounded-[1.1rem] border border-current/10 text-[0.72rem] opacity-50">
        No temperature history
      </div>
    );
  }

  const chartColor = darkMode ? "#f5f5f5" : "#111827";
  const secondaryColor = darkMode ? "#a1a1aa" : "#71717a";
  const width = 248;
  const height = 104;
  const left = 6;
  const right = width - 6;
  const top = 12;
  const bottom = height - 28;

  let minValue = Math.min(...numericEntries.map((entry) => entry.temperature));
  let maxValue = Math.max(...numericEntries.map((entry) => entry.temperature));
  const observedRange = maxValue - minValue;
  const paddedRange = Math.max(0.8, observedRange + 0.4);
  const center = (maxValue + minValue) / 2;
  minValue = center - paddedRange / 2;
  maxValue = center + paddedRange / 2;

  const points = entries.map((entry, index) => {
    const temperature =
      typeof entry.temperature === "number" ? entry.temperature : minValue;
    const x =
      entries.length > 1
        ? left + ((right - left) * index) / (entries.length - 1)
        : (left + right) / 2;
    const y =
      bottom -
      ((temperature - minValue) / Math.max(0.1, maxValue - minValue)) *
        (bottom - top);
    return {
      ...entry,
      x,
      y,
      temperature,
    };
  });

  const linePoints = points.filter(
    (point): point is (typeof points)[number] & { temperature: number } =>
      typeof point.temperature === "number",
  );
  const path = linePoints.reduce((acc, point, index, array) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    const previous = array[index - 1];
    const next = array[index + 1] ?? point;
    const afterNext = array[index + 2] ?? next;
    const control1X = previous.x + (point.x - previous.x) / 3;
    const control1Y = previous.y + (point.y - previous.y) / 3;
    const control2X = next.x - (afterNext.x - point.x) / 6;
    const control2Y = next.y - (afterNext.y - point.y) / 6;
    return `${acc} C ${control1X} ${control1Y} ${control2X} ${control2Y} ${point.x} ${point.y}`;
  }, "");

  const highestPoint = numericEntries.reduce((selected, entry) =>
    entry.temperature > selected.temperature ? entry : selected,
  );
  const lowestPoint = numericEntries.reduce((selected, entry) =>
    entry.temperature < selected.temperature ? entry : selected,
  );
  const labelStep = Math.max(3, Math.floor(entries.length / 4));
  const labelEdgePadding = 8;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[6.1rem] w-full overflow-visible"
    >
      <path
        d={path}
        fill="none"
        stroke={chartColor}
        strokeWidth="3.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((point, index) => (
        <g key={`${point.label}-${point.x}`}>
          {typeof point.temperature === "number" &&
          (point.temperature === highestPoint.temperature ||
            point.temperature === lowestPoint.temperature) ? (
            <text
              x={point.x}
              y={Math.max(10, point.y - 10)}
              textAnchor="middle"
              fontSize="8.5"
              fill={secondaryColor}
            >
              {formatPreviewTemperaturePointLabel(point.temperature)}
            </text>
          ) : null}
          {(index + 1) % labelStep === 0 ? (
            <text
              x={
                index === entries.length - 1
                  ? width - labelEdgePadding
                  : index === labelStep - 1
                    ? labelEdgePadding
                    : point.x
              }
              y={height - 6}
              textAnchor={
                index === entries.length - 1
                  ? "end"
                  : index === labelStep - 1
                    ? "start"
                    : "middle"
              }
              fontSize="7.2"
              fill={secondaryColor}
            >
              {point.label}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

function PreviewWeatherMetric({
  icon,
  value,
  darkMode,
}: {
  icon: string;
  value: string;
  darkMode: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-2 text-center">
      <WeatherGlyph
        iconName={icon}
        className={`h-[1.95rem] w-[1.95rem] ${darkMode ? "text-zinc-100" : "text-zinc-900"}`}
      />
      <p className="mt-2 text-[0.68rem] font-medium tabular-nums">{value}</p>
    </div>
  );
}

function PreviewWeatherHourlyChart({
  entries,
  darkMode,
}: {
  entries: PreviewWeatherHourlyEntry[];
  darkMode: boolean;
}) {
  const numericEntries = entries.filter(
    (entry): entry is PreviewWeatherHourlyEntry & { temperature: number } =>
      typeof entry.temperature === "number",
  );
  const chartColor = darkMode ? "#f5f5f5" : "#111827";
  const secondaryColor = darkMode ? "#a1a1aa" : "#71717a";
  const width = 240;
  const height = 126;
  const left = 14;
  const right = width - 14;
  const top = 18;
  const bottom = height - 42;

  if (numericEntries.length === 0) {
    return null;
  }

  let minValue = Math.min(...numericEntries.map((entry) => entry.temperature));
  let maxValue = Math.max(...numericEntries.map((entry) => entry.temperature));
  if (maxValue - minValue < 4) {
    const center = (maxValue + minValue) / 2;
    minValue = Math.floor(center - 2);
    maxValue = Math.ceil(center + 2);
  }

  const points = entries.map((entry, index) => {
    const temperature =
      typeof entry.temperature === "number" ? entry.temperature : minValue;
    const x =
      entries.length > 1
        ? left + ((right - left) * index) / (entries.length - 1)
        : (left + right) / 2;
    const y =
      bottom -
      ((temperature - minValue) / Math.max(1, maxValue - minValue)) *
        (bottom - top);

    return {
      ...entry,
      x,
      y,
      temperature,
    };
  });
  const linePoints = points.filter(
    (point): point is (typeof points)[number] & { temperature: number } =>
      typeof point.temperature === "number",
  );
  const path = linePoints.reduce((acc, point, index, array) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    const previous = array[index - 1];
    const next = array[index + 1] ?? point;
    const afterNext = array[index + 2] ?? next;
    const control1X = previous.x + (point.x - previous.x) / 3;
    const control1Y = previous.y + (point.y - previous.y) / 3;
    const control2X = next.x - (afterNext.x - point.x) / 6;
    const control2Y = next.y - (afterNext.y - point.y) / 6;
    return `${acc} C ${control1X} ${control1Y} ${control2X} ${control2Y} ${point.x} ${point.y}`;
  }, "");
  const highestPoint = numericEntries.reduce((selected, entry) =>
    entry.temperature > selected.temperature ? entry : selected,
  );
  const lowestPoint = numericEntries.reduce((selected, entry) =>
    entry.temperature < selected.temperature ? entry : selected,
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[7.2rem] w-full overflow-visible"
    >
      <path
        d={path}
        fill="none"
        stroke={chartColor}
        strokeWidth="3.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((point) => (
        <g key={`${point.label}-${point.x}`}>
          {typeof point.temperature === "number" ? (
            <>
              {point.temperature === highestPoint.temperature ||
              point.temperature === lowestPoint.temperature ? (
                <text
                  x={point.x}
                  y={Math.max(10, point.y - 10)}
                  textAnchor="middle"
                  fontSize="9"
                  fill={secondaryColor}
                >
                  {point.temperature}°
                </text>
              ) : null}
            </>
          ) : null}
          {(points.indexOf(point) + 1) % 3 === 0 ? (
            <>
              <text
                x={point.x}
                y={height - 18}
                textAnchor="middle"
                fontSize="8"
                fill={secondaryColor}
              >
                {typeof point.precipitationProbability === "number"
                  ? `${point.precipitationProbability}%`
                  : "--"}
              </text>
              <text
                x={point.x}
                y={height - 6}
                textAnchor="middle"
                fontSize="8"
                fill={secondaryColor}
              >
                {point.label}
              </text>
            </>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

function PreviewWeatherFocusPage({
  pageIndex,
  entity,
  homeAssistantStates,
  now,
  darkMode,
}: {
  pageIndex: number;
  entity?: HomeAssistantEntityState;
  homeAssistantStates: Record<string, HomeAssistantEntityState>;
  now: Date | null;
  darkMode: boolean;
}) {
  const weatherPage = now
    ? resolveHomeAssistantWeatherPage(entity, {
        now,
        states: homeAssistantStates,
      })
    : undefined;
  const current =
    weatherPage ?? WEATHER_STATES[pageIndex % WEATHER_STATES.length];
  const temperatureUnit = weatherPage?.temperatureUnit ?? "°C";
  const currentTemperature =
    typeof current.temperature === "number" ? current.temperature : "--";
  const numericCurrentTemperature =
    typeof current.temperature === "number" ? current.temperature : 8;
  const feelsLike =
    typeof weatherPage?.apparentTemperature === "number"
      ? `${Math.round(weatherPage.apparentTemperature)}${temperatureUnit}`
      : `${numericCurrentTemperature - 1}${temperatureUnit}`;
  const hasLiveWeather = Boolean(entity);
  const upcoming = weatherPage?.forecast.length
    ? weatherPage.forecast
    : hasLiveWeather
      ? []
      : buildPreviewWeatherDailyFallback(pageIndex, now);
  const hourly = weatherPage?.hourlyForecast.length
    ? weatherPage.hourlyForecast
    : hasLiveWeather
      ? []
      : buildPreviewWeatherHourlyFallback(
          pageIndex,
          numericCurrentTemperature,
          now,
        );
  const stats = [
    {
      icon: "humidity",
      value:
        typeof weatherPage?.humidity === "number"
          ? `${Math.round(weatherPage.humidity)}%`
          : "--",
    },
    {
      icon: "strong-wind",
      value:
        typeof weatherPage?.windSpeed === "number"
          ? `${Math.round(weatherPage.windSpeed)}${weatherPage.windSpeedUnit ? ` ${weatherPage.windSpeedUnit}` : ""}`
          : "--",
    },
    {
      icon: "barometer",
      value:
        typeof weatherPage?.pressure === "number"
          ? `${Math.round(weatherPage.pressure)}${weatherPage.pressureUnit ? ` ${weatherPage.pressureUnit}` : ""}`
          : "--",
    },
  ];

  return (
    <div
      className={`relative h-full overflow-hidden rounded-[1.8rem] ${
        darkMode
          ? "border border-white/12 bg-[linear-gradient(180deg,#121212_0%,#040404_100%)] text-zinc-100"
          : "border border-current/15 bg-[linear-gradient(180deg,rgba(247,247,244,0.96)_0%,rgba(232,230,224,0.98)_100%)] text-zinc-900"
      }`}
    >
      <div className="relative z-10 flex h-full flex-col px-4 pb-4 pt-4">
        <div
          className={`rounded-[1.9rem] px-4 pb-5 pt-4 ${
            darkMode ? "bg-white/4" : "bg-white/70"
          }`}
        >
          <p className="text-center text-[9px] uppercase tracking-[0.18em] opacity-45">
            {formatPreviewWeatherDate(now)}
          </p>
          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="flex h-50 w-50 items-center justify-center">
              <WeatherIcon
                condition={current.condition}
                className="h-[12.2rem] w-[12.2rem]"
              />
            </div>
            <div className="flex-1 text-right">
              <div className="mt-4 flex items-start justify-end gap-1">
                <p className="text-[4.9rem] font-semibold leading-[0.84] tabular-nums">
                  {currentTemperature}
                </p>
                <p className="pt-3 text-[1.35rem] font-medium opacity-75">
                  {temperatureUnit}
                </p>
              </div>
              <p className="mt-1 text-[0.72rem] opacity-52">
                Feels like {feelsLike}
              </p>
              <p className="mt-1 text-[0.86rem] uppercase tracking-[0.14em] opacity-55">
                {current.condition}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`mt-3 grid grid-cols-3 divide-x rounded-[1.35rem] px-1 py-1 ${
            darkMode
              ? "divide-white/10 bg-white/4"
              : "divide-black/10 bg-white/72"
          }`}
        >
          {stats.map((stat) => (
            <PreviewWeatherMetric
              key={stat.icon}
              icon={stat.icon}
              value={stat.value}
              darkMode={darkMode}
            />
          ))}
        </div>

        <div
          className={`mt-3 rounded-[1.45rem] px-3 py-3 ${
            darkMode ? "bg-white/4" : "bg-white/72"
          }`}
        >
          <div className="flex items-center gap-2">
            <MdiIcon
              icon="thermometer"
              size={24}
              className={darkMode ? "text-zinc-100" : "text-zinc-900"}
            />
            <MdiIcon
              icon="weather-pouring"
              size={24}
              className={darkMode ? "text-zinc-100" : "text-zinc-900"}
            />
          </div>
          <div className="mt-1">
            <PreviewWeatherHourlyChart entries={hourly} darkMode={darkMode} />
          </div>
        </div>

        <div
          className={`mt-3 grid grid-cols-3 divide-x rounded-[1.45rem] px-1 py-2 ${
            darkMode
              ? "divide-white/10 bg-white/4"
              : "divide-black/10 bg-white/72"
          }`}
        >
          {upcoming.map((entry, index) => {
            const high =
              typeof entry.temperature === "number"
                ? `${entry.temperature}°`
                : "--";
            const low =
              typeof entry.lowTemperature === "number"
                ? `${entry.lowTemperature}°`
                : typeof entry.temperature === "number"
                  ? `${entry.temperature - 2}°`
                  : "--";

            return (
              <div
                key={`${entry.label}-${entry.condition}-${index}`}
                className="px-1 py-1 text-center"
              >
                <p className="text-[8px] uppercase tracking-[0.14em] opacity-45">
                  {entry.label}
                </p>
                <div className="flex min-h-[4.8rem] items-center justify-center">
                  <WeatherIcon
                    condition={entry.condition}
                    className="h-[4.35rem] w-[4.35rem]"
                  />
                </div>
                <p className="mt-1 text-[0.6rem] font-medium tabular-nums">
                  {high} / {low}
                </p>
                <div className="mt-1 flex items-center justify-center gap-1 text-[0.58rem] tabular-nums opacity-65">
                  <MdiIcon
                    icon="weather-pouring"
                    size={18}
                    className={darkMode ? "text-zinc-100" : "text-zinc-900"}
                  />
                  <span>
                    {typeof entry.precipitationProbability === "number"
                      ? `${entry.precipitationProbability}%`
                      : "--"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PreviewMediaPlayerPage({
  media,
  darkMode,
  fontClass,
}: {
  media: {
    title: string;
    artist: string;
    progress: number;
    coverUrl?: string;
    hasContent: boolean;
    state?: string;
  };
  darkMode: boolean;
  fontClass: string;
}) {
  const mediaTitle = truncateMediaTitle(media.title, fontClass);
  const hasContent = media.hasContent;
  const playPauseIcon = media.state === "playing" ? "pause" : "play";

  return (
    <div
      className={`flex h-full items-center justify-center overflow-hidden rounded-[1.8rem] ${
        darkMode
          ? "border border-white/12 bg-black text-zinc-100"
          : "border border-current/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(241,239,234,0.98)_100%)] text-zinc-900"
      }`}
    >
      <div className="flex w-full max-w-88 flex-col items-center justify-center px-4 py-6 text-center">
        <div className="h-80 w-[20rem] overflow-hidden rounded-[2.35rem] border border-current/12 shadow-[0_26px_58px_rgba(0,0,0,0.16)]">
          {hasContent ? (
            media.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media.coverUrl}
                alt={`${media.title} album cover`}
                className="h-full w-full object-cover grayscale"
              />
            ) : (
              <Image
                src={MEDIA_MOCK.coverUrl}
                alt={`${media.title} album cover`}
                width={320}
                height={320}
                className="h-full w-full object-cover grayscale"
              />
            )
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center ${
                darkMode
                  ? "bg-[linear-gradient(180deg,rgba(88,88,88,0.44)_0%,rgba(44,44,44,0.72)_100%)]"
                  : "bg-[linear-gradient(180deg,rgba(212,212,212,0.9)_0%,rgba(178,178,178,0.98)_100%)]"
              }`}
            >
              <MdiIcon
                icon="music-note"
                size={132}
                className={darkMode ? "text-zinc-500" : "text-zinc-600"}
              />
            </div>
          )}
        </div>
        {hasContent ? (
          <>
            {media.artist ? (
              <p className="mt-4 text-[0.92rem] uppercase tracking-[0.18em] opacity-35">
                {media.artist}
              </p>
            ) : null}
            <p
              className={`${media.artist ? "mt-4" : "mt-6"} max-w-79 text-[1.1rem] font-medium leading-tight`}
              title={media.title}
            >
              {mediaTitle}
            </p>
            <div
              className={`mt-5 h-2.5 w-84 max-w-full overflow-hidden rounded-full ${
                darkMode ? "bg-white/12" : "bg-zinc-400/20"
              }`}
            >
              <div
                className={`h-full rounded-full ${darkMode ? "bg-zinc-100" : "bg-zinc-900"}`}
                style={{ width: `${media.progress}%` }}
              />
            </div>
            <div className="mt-4 flex w-84 max-w-full items-center justify-center gap-3">
              <PreviewMediaControlButton
                icon="skip-previous"
                darkMode={darkMode}
              />
              <PreviewMediaControlButton
                icon={playPauseIcon}
                darkMode={darkMode}
                emphasized
              />
              <PreviewMediaControlButton icon="skip-next" darkMode={darkMode} />
            </div>
          </>
        ) : (
          <p className="mt-6 text-[0.95rem] uppercase tracking-[0.2em] opacity-40">
            Nothing Playing
          </p>
        )}
      </div>
    </div>
  );
}

function PreviewMediaControlButton({
  icon,
  darkMode,
  emphasized = false,
}: {
  icon: string;
  darkMode: boolean;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-full border ${
        emphasized
          ? darkMode
            ? "border-white/16 bg-zinc-100 text-zinc-950"
            : "border-zinc-900 bg-zinc-900 text-white"
          : darkMode
            ? "border-white/16 bg-white/4 text-zinc-200"
            : "border-current/15 bg-white/75 text-zinc-700"
      }`}
    >
      <MdiIcon icon={icon} size={22} className="h-5 w-5" />
    </div>
  );
}

function PreviewDigitalClock({
  widget,
  now,
  darkMode,
}: {
  widget: WidgetConfig;
  now: Date | null;
  darkMode: boolean;
}) {
  return (
    <div
      className={`rounded-[1.6rem] px-5 py-6 text-center ${previewCardClasses(darkMode, darkMode ? "" : "bg-white/60")}`}
    >
      <p className="text-xs uppercase tracking-[0.22em] opacity-55">Clock</p>
      <p className="mt-3 text-[2.2rem] font-semibold tracking-[0.12em] tabular-nums">
        {formatClock(now, widget.showSeconds !== false)}
      </p>
    </div>
  );
}

function PreviewAnalogClock({
  widget,
  now,
  darkMode,
}: {
  widget: WidgetConfig;
  now: Date | null;
  darkMode: boolean;
}) {
  const hours = now ? now.getHours() % 12 : 10;
  const minutes = now ? now.getMinutes() : 10;
  const seconds = now ? now.getSeconds() : 30;
  const hourAngle = (hours + minutes / 60) * 30;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const secondAngle = seconds * 6;
  const showSeconds = widget.showSeconds !== false;

  return (
    <div
      className={`rounded-[1.6rem] px-5 py-5 ${previewCardClasses(darkMode, darkMode ? "" : "bg-white/60")}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.22em] opacity-55">Clock</p>
        <p className="text-xs uppercase tracking-[0.18em] opacity-55">
          {showSeconds ? "Seconds" : "Minutes"}
        </p>
      </div>
      <div className="mt-3 flex justify-center">
        <svg viewBox="0 0 160 160" className="h-36 w-36">
          <circle
            cx="80"
            cy="80"
            r="70"
            fill={darkMode ? "rgba(8,8,8,0.98)" : "rgba(255,255,255,0.82)"}
            stroke="currentColor"
            strokeWidth="4"
          />
          <circle
            cx="80"
            cy="80"
            r="58"
            fill="none"
            stroke="currentColor"
            strokeOpacity={darkMode ? "0.36" : "0.22"}
            strokeWidth="1.5"
          />
          {Array.from({ length: 12 }).map((_, index) => {
            const angle = (index * 30 * Math.PI) / 180;
            const x1 = 80 + Math.sin(angle) * 54;
            const y1 = 80 - Math.cos(angle) * 54;
            const x2 = 80 + Math.sin(angle) * 64;
            const y2 = 80 - Math.cos(angle) * 64;
            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth={index % 3 === 0 ? 3 : 2}
                strokeLinecap="round"
              />
            );
          })}
          <line
            x1="80"
            y1="80"
            x2="80"
            y2="58"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            transform={`rotate(${hourAngle} 80 80)`}
          />
          <line
            x1="80"
            y1="80"
            x2="80"
            y2="28"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            transform={`rotate(${minuteAngle} 80 80)`}
          />
          {showSeconds ? (
            <line
              x1="80"
              y1="86"
              x2="80"
              y2="22"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              transform={`rotate(${secondAngle} 80 80)`}
            />
          ) : null}
          <circle cx="80" cy="80" r="5" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

function PreviewClock({
  widget,
  now,
  darkMode,
}: {
  widget: WidgetConfig;
  now: Date | null;
  darkMode: boolean;
}) {
  if (widget.clockStyle === "analog") {
    return <PreviewAnalogClock widget={widget} now={now} darkMode={darkMode} />;
  }
  return <PreviewDigitalClock widget={widget} now={now} darkMode={darkMode} />;
}

function PreviewOverviewPage({
  page,
  homeAssistantStates,
  now,
  darkMode,
}: {
  page: PageConfig;
  homeAssistantStates: Record<string, HomeAssistantEntityState>;
  now: Date | null;
  darkMode: boolean;
}) {
  const clockWidget = page.widgets.find(
    (widget) => widget.type === "clock",
  ) ?? {
    id: "preview-overview-clock",
    type: "clock",
    label: "Clock",
    clockStyle: "digital",
    showSeconds: true,
  };
  const clockWidgetIndex = page.widgets.findIndex(
    (widget) => widget.type === "clock",
  );
  const orderedTextWidgets = page.widgets
    .map((widget, index) => ({ widget, index }))
    .filter(
      (entry) =>
        entry.widget.type === "text" && entry.widget.label.trim().length > 0,
    );
  const textWidgetsAbove = orderedTextWidgets
    .filter((entry) => clockWidgetIndex < 0 || entry.index < clockWidgetIndex)
    .map((entry) => entry.widget);
  const textWidgetsBelow = orderedTextWidgets
    .filter((entry) => clockWidgetIndex >= 0 && entry.index > clockWidgetIndex)
    .map((entry) => entry.widget);
  const buttonWidgets = page.widgets
    .filter((widget) => widget.type === "button")
    .slice(0, 6);
  const hours = now ? now.getHours() % 12 : 10;
  const minutes = now ? now.getMinutes() : 10;
  const seconds = now ? now.getSeconds() : 30;
  const hourAngle = (hours + minutes / 60) * 30;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const secondAngle = seconds * 6;
  const showSeconds = clockWidget.showSeconds !== false;
  const renderTextBlock = (widgets: WidgetConfig[]) => (
    <div className="w-full space-y-3 text-center">
      {widgets.map((widget) => (
        <p
          key={widget.id}
          className="whitespace-pre-line px-3 text-[1.28rem] leading-[2.28]"
        >
          {widget.label}
        </p>
      ))}
    </div>
  );

  return (
    <div className="flex h-full flex-col px-2 pt-2 pb-3">
      <div className="flex flex-1 flex-col items-center justify-start">
        {textWidgetsAbove.length > 0 ? (
          <div className="w-full pt-2">{renderTextBlock(textWidgetsAbove)}</div>
        ) : null}

        <div
          className={`flex min-h-56 w-full items-center justify-center ${
            textWidgetsAbove.length > 0 ? "mt-3" : ""
          }`}
        >
          {clockWidget.clockStyle === "analog" ? (
            <svg viewBox="0 0 220 220" className="h-50 w-50">
              <circle
                cx="110"
                cy="110"
                r="95"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
              />
              <circle
                cx="110"
                cy="110"
                r="77"
                fill="none"
                stroke="currentColor"
                strokeOpacity={darkMode ? "0.3" : "0.18"}
                strokeWidth="1.5"
              />
              {Array.from({ length: 12 }).map((_, index) => {
                const angle = (index * 30 * Math.PI) / 180;
                const x1 = 110 + Math.sin(angle) * 72;
                const y1 = 110 - Math.cos(angle) * 72;
                const x2 = 110 + Math.sin(angle) * 87;
                const y2 = 110 - Math.cos(angle) * 87;
                return (
                  <line
                    key={index}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeWidth={index % 3 === 0 ? 3.6 : 2.2}
                    strokeLinecap="round"
                  />
                );
              })}
              <line
                x1="110"
                y1="110"
                x2="110"
                y2="62"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                transform={`rotate(${hourAngle} 110 110)`}
              />
              <line
                x1="110"
                y1="110"
                x2="110"
                y2="40"
                stroke="currentColor"
                strokeWidth="5.5"
                strokeLinecap="round"
                transform={`rotate(${minuteAngle} 110 110)`}
              />
              {showSeconds ? (
                <line
                  x1="110"
                  y1="116"
                  x2="110"
                  y2="30"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  transform={`rotate(${secondAngle} 110 110)`}
                />
              ) : null}
              <circle cx="110" cy="110" r="6" fill="currentColor" />
            </svg>
          ) : (
            <p
              className={`font-semibold tracking-[0.09em] tabular-nums leading-none ${
                showSeconds ? "text-[3.75rem]" : "text-[4.7rem]"
              }`}
            >
              {formatClock(now, showSeconds)}
            </p>
          )}
        </div>

        {textWidgetsBelow.length > 0 ? (
          <div className="mt-3 w-full">{renderTextBlock(textWidgetsBelow)}</div>
        ) : null}
      </div>

      {buttonWidgets.length > 0 ? (
        <div className="mt-3 flex justify-center pb-3">
          <div className="grid max-w-62 grid-cols-3 gap-x-5 gap-y-4">
            {buttonWidgets.map((widget) => {
              const entity = getBoundEntityState(widget, homeAssistantStates);
              const enabled =
                resolveHomeAssistantEnabled(entity) ?? Boolean(widget.enabled);
              const filled = darkMode ? !enabled : enabled;
              const offStateClasses = darkMode
                ? "border border-zinc-100 bg-black text-zinc-100"
                : "border border-zinc-900 bg-white text-zinc-900";
              return (
                <div
                  key={widget.id}
                  className={`flex h-16 w-16 items-center justify-center rounded-full ${
                    filled
                      ? darkMode
                        ? "bg-white text-zinc-950"
                        : "bg-zinc-950 text-white"
                      : offStateClasses
                  }`}
                >
                  <MdiIcon
                    icon={widget.icon ?? "lightbulb"}
                    size={28}
                    className="h-7 w-7"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DevicePreview({
  darkMode,
  fontClass,
  pages,
  homeAssistantConfig,
  homeAssistantStates,
  activePageIndex,
  onPageChange,
}: DevicePreviewProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(new Date()));
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, []);

  const safePageIndex = useMemo(() => {
    if (pages.length === 0) {
      return 0;
    }
    return Math.max(0, Math.min(activePageIndex, pages.length - 1));
  }, [activePageIndex, pages.length]);
  const activePage = pages[safePageIndex];
  const showNavigation = pages.length > 1;
  const showPageHeader =
    showNavigation &&
    activePage?.type !== "overview" &&
    activePage?.type !== "weather-focus" &&
    activePage?.type !== "media-player";
  const pageEntity = activePage
    ? getBoundEntityState(activePage, homeAssistantStates)
    : undefined;
  const mediaPreview = resolveHomeAssistantMediaPlayer(
    pageEntity,
    homeAssistantConfig.url,
  );
  const shellClasses = useMemo(
    () =>
      darkMode
        ? "border-zinc-700 bg-[linear-gradient(180deg,#161616_0%,#070707_100%)] text-zinc-100"
        : "border-zinc-300 bg-[linear-gradient(180deg,#fbfbf9_0%,#eceae4_100%)] text-zinc-900",
    [darkMode],
  );

  if (!activePage) {
    return null;
  }

  return (
    <div
      className={`mx-auto aspect-9/16 w-full max-w-xs rounded-4xl border p-4 shadow-2xl ${shellClasses} ${fontClass}`}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-current/10 bg-white/5 p-3">
        {showPageHeader ? (
          <div className="flex items-start justify-between gap-3 border-b border-current/10 pb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] opacity-55">
                M5PaperS3
              </p>
              <p className="mt-1 text-[1.02rem] font-medium tracking-[-0.01em]">
                {activePage.name}
              </p>
            </div>
            <div className="rounded-full border border-current/15 px-2 py-1 text-[10px] uppercase tracking-[0.18em] opacity-70">
              {fontClass.replace("font-", "")}
            </div>
          </div>
        ) : null}

        <div
          className={`${showPageHeader ? "mt-3" : ""} flex-1 overflow-hidden`}
        >
          {activePage.type === "overview" ? (
            <PreviewOverviewPage
              page={activePage}
              homeAssistantStates={homeAssistantStates}
              now={now}
              darkMode={darkMode}
            />
          ) : activePage.type === "weather-focus" ? (
            <PreviewWeatherFocusPage
              pageIndex={safePageIndex}
              entity={pageEntity}
              homeAssistantStates={homeAssistantStates}
              now={now}
              darkMode={darkMode}
            />
          ) : activePage.type === "media-player" ? (
            <PreviewMediaPlayerPage
              media={
                mediaPreview
                  ? {
                      title: mediaPreview.title,
                      artist: mediaPreview.artist,
                      progress: mediaPreview.progress,
                      coverUrl: mediaPreview.coverUrl,
                      hasContent: mediaPreview.hasMedia,
                      state: mediaPreview.state,
                    }
                  : MEDIA_MOCK
              }
              darkMode={darkMode}
              fontClass={fontClass}
            />
          ) : (
            <div className="space-y-3 overflow-hidden">
              {activePage.widgets.map((widget, index) => {
                const entity = getBoundEntityState(widget, homeAssistantStates);
                switch (widget.type) {
                  case "clock":
                    return (
                      <PreviewClock
                        key={widget.id}
                        widget={widget}
                        now={now}
                        darkMode={darkMode}
                      />
                    );
                  case "weather":
                    return (
                      <PreviewWeather
                        key={widget.id}
                        widget={widget}
                        entity={entity}
                        index={index}
                        darkMode={darkMode}
                      />
                    );
                  case "progress":
                    return (
                      <PreviewProgress
                        key={widget.id}
                        widget={widget}
                        entity={entity}
                        darkMode={darkMode}
                      />
                    );
                  case "switch":
                    return (
                      <PreviewSwitch
                        key={widget.id}
                        widget={widget}
                        entity={entity}
                        darkMode={darkMode}
                      />
                    );
                  case "button":
                    return (
                      <PreviewSwitch
                        key={widget.id}
                        widget={widget}
                        entity={entity}
                        darkMode={darkMode}
                      />
                    );
                  case "slider":
                    return (
                      <PreviewSlider
                        key={widget.id}
                        widget={widget}
                        entity={entity}
                        darkMode={darkMode}
                      />
                    );
                  case "thermostat":
                    return (
                      <PreviewThermostat
                        key={widget.id}
                        widget={widget}
                        entity={entity}
                        now={now}
                        darkMode={darkMode}
                      />
                    );
                  case "text":
                    return <PreviewText key={widget.id} widget={widget} />;
                  default:
                    return null;
                }
              })}
            </div>
          )}
        </div>

        {showNavigation ? (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-current/10 pt-3">
            <button
              type="button"
              onClick={() =>
                onPageChange((safePageIndex - 1 + pages.length) % pages.length)
              }
              className="flex h-8 w-8 items-center justify-center rounded-full text-current/80 transition hover:bg-current/10"
            >
              <ChevronLeft className="h-5 w-5 stroke-[2.6]" />
            </button>

            <div className="flex items-center gap-2">
              {pages.map((page, index) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => onPageChange(index)}
                  aria-label={`Open ${page.name}`}
                  className={`h-2.5 rounded-full transition ${
                    index === safePageIndex
                      ? "w-6 bg-current"
                      : "w-2.5 bg-current/25"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => onPageChange((safePageIndex + 1) % pages.length)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-current/80 transition hover:bg-current/10"
            >
              <ChevronRight className="h-5 w-5 stroke-[2.6]" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
