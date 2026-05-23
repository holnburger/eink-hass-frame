"use client";
import { icons as weatherIcons } from "@iconify-json/wi";
import { getIconData, iconToSVG, replaceIDs } from "@iconify/utils";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Lightbulb,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MdiIcon } from "@/components/dashboard/mdi-icon";
import {
  THERMOSTAT_HISTORY_POINT_COUNT,
  WEATHER_HOURLY_FORECAST_POINT_COUNT,
  isHomeAssistantEntityUnavailable,
  applyWidgetLogicInversionToEnabled,
  applyWidgetLogicInversionToPercent,
  resolveHomeAssistantMediaPlayer,
  resolveHomeAssistantEnabled,
  resolveHomeAssistantNumericValue,
  resolveHomeAssistantThermostat,
  resolveHomeAssistantWeather,
  resolveHomeAssistantWeatherPage,
  type HomeAssistantConfig,
  type HomeAssistantEntityState,
} from "@/lib/home-assistant";
import { resolveAppPath } from "@/lib/app-path";
import type { PageConfig, WidgetConfig } from "@/lib/layout-config";

type DevicePreviewProps = {
  appBasePath?: string;
  darkMode: boolean;
  hideWidgetBorders: boolean;
  fontClass: string;
  clockFontClass: string;
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

function previewCardClasses(
  darkMode: boolean,
  hideWidgetBorders: boolean,
  extra = "",
) {
  if (hideWidgetBorders) {
    return extra.trim();
  }
  return darkMode
    ? `border border-white/12 bg-black ${extra}`.trim()
    : `border border-current/15 bg-white/55 ${extra}`.trim();
}

// The preview keeps a few custom radii so the mock device shell stays visually
// close to the physical e-ink frame. The editor UI uses canonical Tailwind
// radius classes everywhere else.

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

function resolvePreviewMediaPlayer(
  page: PageConfig | undefined,
  homeAssistantStates: Record<string, HomeAssistantEntityState>,
  homeAssistantUrl: string,
) {
  if (!page) {
    return undefined;
  }

  const bindings =
    page.homeAssistantBindings && page.homeAssistantBindings.length > 0
      ? page.homeAssistantBindings
      : page.homeAssistant
        ? [page.homeAssistant]
        : [];
  const mediaPlayers = bindings.flatMap((binding) => {
    const entityId = binding.entityId?.trim();
    const media = resolveHomeAssistantMediaPlayer(
      entityId ? homeAssistantStates[entityId] : undefined,
      homeAssistantUrl,
    );
    return media ? [media] : [];
  });

  if (page.mediaShowActiveOnly === false) {
    return mediaPlayers[0];
  }

  return (
    mediaPlayers.find((media) => media.state === "playing") ??
    mediaPlayers.find((media) => media.hasMedia) ??
    mediaPlayers[0]
  );
}

function getPreviewButtonEnabled(
  widget: WidgetConfig,
  entity: HomeAssistantEntityState | undefined,
) {
  const liveEnabled =
    entity?.domain === "cover"
      ? (() => {
          const coverState = entity.state.toLowerCase();
          if (coverState === "closed") {
            return false;
          }
          if (
            coverState === "open" ||
            coverState === "opening" ||
            coverState === "closing"
          ) {
            return true;
          }
          const livePercent = resolveHomeAssistantNumericValue(
            entity,
            "slider",
          );
          return livePercent !== undefined ? livePercent > 0 : undefined;
        })()
      : resolveHomeAssistantEnabled(entity);
  return (
    applyWidgetLogicInversionToEnabled(liveEnabled, widget.invert) ??
    applyWidgetLogicInversionToEnabled(
      Boolean(widget.enabled),
      widget.invert,
    ) ??
    Boolean(widget.enabled)
  );
}

function getPreviewSliderValue(
  widget: WidgetConfig,
  entity: HomeAssistantEntityState | undefined,
) {
  const liveValue = resolveHomeAssistantNumericValue(entity, "slider");
  return Math.max(
    0,
    Math.min(
      100,
      applyWidgetLogicInversionToPercent(liveValue, widget.invert) ??
        applyWidgetLogicInversionToPercent(widget.value ?? 0, widget.invert) ??
        0,
    ),
  );
}

function PreviewSwitch({
  widget,
  entity,
  darkMode,
  hideWidgetBorders,
}: {
  widget: WidgetConfig;
  entity?: HomeAssistantEntityState;
  darkMode: boolean;
  hideWidgetBorders: boolean;
}) {
  const enabled =
    widget.type === "button"
      ? getPreviewButtonEnabled(widget, entity)
      : (resolveHomeAssistantEnabled(entity) ?? Boolean(widget.enabled));

  return (
    <div
      className={`rounded-2xl px-2 py-2 text-left ${previewCardClasses(darkMode, hideWidgetBorders)}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs  opacity-55">{widget.label}</p>
        </div>
        <span
          className={`relative h-5 w-12 rounded-full p-0.5 transition ${
            enabled ? "bg-zinc-700/80" : "bg-zinc-400/40"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
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

function PreviewTitleSeparator({ widget }: { widget: WidgetConfig }) {
  return (
    <div className="flex items-center gap-3 px-1 py-2.5">
      <div className="h-px flex-1 bg-current/30" />
      <p className="text-sm">{widget.label}</p>
      <div className="h-px flex-1 bg-current/30" />
    </div>
  );
}

function PreviewProgress({
  widget,
  entity,
  darkMode,
  hideWidgetBorders,
}: {
  widget: WidgetConfig;
  entity?: HomeAssistantEntityState;
  darkMode: boolean;
  hideWidgetBorders: boolean;
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
      className={`rounded-2xl px-2 py-1 ${previewCardClasses(darkMode, hideWidgetBorders)}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs opacity-55">{widget.label}</p>
        </div>
        {value !== null ? (
          <p className="text-sm font-medium tabular-nums opacity-70">
            {value}%
          </p>
        ) : null}
      </div>
      <div
        className={`mt-1 h-3 rounded-full p-0.5 ${darkMode ? "bg-white/10" : "bg-zinc-400/25"}`}
      >
        <div
          className={`h-full rounded-full ${darkMode ? "bg-white/80" : "bg-black"} `}
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  );
}

function PreviewOverviewProgress({
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
    <div className="mx-auto flex w-full flex-col items-center justify-center px-4 py-3 text-center mb-3">
      <div className="flex items-center w-full px-1 justify-between gap-4">
        <div>
          <p className="text-sm">{widget.label}</p>
        </div>
        {value !== null ? (
          <p className="text-sm font-medium tabular-nums opacity-70">
            {value}%
          </p>
        ) : null}
      </div>

      <div
        className={`h-3 w-full rounded-full p-0.5 ${
          darkMode ? "bg-white/10" : "bg-zinc-400/25"
        }`}
      >
        <div
          className={`h-full rounded-full ${darkMode ? "bg-white/80" : "bg-black"}`}
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
  hideWidgetBorders,
}: {
  widget: WidgetConfig;
  entity?: HomeAssistantEntityState;
  darkMode: boolean;
  hideWidgetBorders: boolean;
}) {
  const value = getPreviewSliderValue(widget, entity);

  const ratio = (value / 100).toFixed(3);
  const knobPosition = `calc(44px + ${ratio} * (100% - 66px))`;
  const fillWidth = value > 0 ? `calc(25px + ${ratio} * (100% - 66px))` : "0px";

  return (
    <div
      className={`rounded-2xl px-2 py-1 ${previewCardClasses(darkMode, hideWidgetBorders)}`}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs opacity-55">{widget.label}</p>

        <p className="text-xs font-medium tabular-nums opacity-70">{value}%</p>
      </div>
      <div className="mt-1">
        <div className="relative h-8 touch-none select-none">
          <div
            className={`absolute inset-0 rounded-full border ${darkMode ? "border-white/70 bg-black" : "border-zinc-900 bg-white"}`}
          />
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${darkMode ? "bg-white" : "bg-zinc-900"}`}
            style={{ width: fillWidth }}
          />
          <div
            className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border ${
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
              className={`absolute top-0 h-8 w-8 -translate-x-14 rounded-full ${
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
  hideWidgetBorders,
}: {
  widget: WidgetConfig;
  entity?: HomeAssistantEntityState;
  now: Date | null;
  darkMode: boolean;
  hideWidgetBorders: boolean;
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
      className={`rounded-2xl px-2 py-1 ${previewCardClasses(darkMode, hideWidgetBorders)}`}
    >
      <div className="flex flex-row justify-between">
        <p className="text-xs opacity-55">{widget.label}</p>
        <p className="text-xs opacity-45">Current / Target</p>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col items-end">
          {thermostatControls.length > 0 ? (
            <div className="flex items-end justify-end gap-2.5 pb-4">
              {thermostatControls.map((control) => (
                <PreviewThermostatModeButton
                  key={control.key}
                  icon={control.icon}
                  darkMode={darkMode}
                  active={control.active}
                />
              ))}
            </div>
          ) : (
            <div className="w-10 h-10"></div>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <div className="shrink-0 text-right">
            <div className="mt-1.5 flex items-end justify-end gap-3">
              <div className="flex items-end">
                <p className="text-2xl font-black tabular-nums leading-none">
                  {currentText}
                </p>
                <span className="ml-1 text-[0.72rem] opacity-60">
                  {temperatureUnit}
                </span>
              </div>
              <span className="translate-y-px text-sm opacity-40">/</span>
              <div className="flex items-end">
                <p className="text-xl font-medium tabular-nums leading-none">
                  {targetText}
                </p>
                <span className="ml-1 text-[0.68rem] opacity-55">
                  {temperatureUnit}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full text-current/80">
                <ChevronUp className="h-3 w-3" />
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded-full text-current/80">
                <ChevronDown className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {widget.showHistoryGraph ? (
        <div className="mt-1">
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
      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
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
  hideWidgetBorders,
}: {
  widget: WidgetConfig;
  entity?: HomeAssistantEntityState;
  index: number;
  darkMode: boolean;
  hideWidgetBorders: boolean;
}) {
  const weather =
    resolveHomeAssistantWeather(entity) ??
    WEATHER_STATES[index % WEATHER_STATES.length];
  const temperature =
    typeof weather.temperature === "number" ? weather.temperature : "--";
  const temperatureUnit =
    "temperatureUnit" in weather ? weather.temperatureUnit : "°C";

  return (
    <div
      className={`rounded-2xl p-2 ${previewCardClasses(darkMode, hideWidgetBorders)}`}
    >
      <p className="text-xs opacity-55">{widget.label}</p>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <p className="mt-3 text-3xl font-bold tabular-nums">
            {temperature}
            {temperatureUnit}
          </p>
          <p className="text-sm opacity-70">{weather.condition}</p>
        </div>
        <WeatherIcon condition={weather.condition} className="h-16 w-16" />
      </div>
    </div>
  );
}

function PreviewOverviewWeather({
  entity,
  index,
  darkMode,
}: {
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
    <div className="mx-auto flex w-full max-w-[18rem] flex-col items-center justify-center px-4 py-5 text-center">
      <div className="flex items-center justify-center gap-4">
        <WeatherIcon condition={weather.condition} className="h-14 w-14" />
        <div className="flex items-start gap-1 leading-none">
          <span className="text-[3.35rem] font-semibold tabular-nums tracking-[-0.07em]">
            {temperature}
          </span>
          <span className="mt-1.5 text-base opacity-55">{temperatureUnit}</span>
        </div>
      </div>
      <p className="mt-5 text-sm opacity-60">{weather.condition}</p>
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
    <div className="flex flex-col items-center justify-center p-1 py-0 text-center">
      <WeatherGlyph
        iconName={icon}
        className={`h-4 w-4 ${darkMode ? "text-zinc-100" : "text-zinc-900"}`}
      />
      <p className="text-[0.68rem] font-medium tabular-nums">{value}</p>
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
        strokeWidth="1"
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
  hideWidgetBorders,
}: {
  pageIndex: number;
  entity?: HomeAssistantEntityState;
  homeAssistantStates: Record<string, HomeAssistantEntityState>;
  now: Date | null;
  darkMode: boolean;
  hideWidgetBorders: boolean;
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
    <>
      <div className="relative z-10 flex h-full flex-col p-1">
        <div
          className={`rounded-2xl p-2 ${
            hideWidgetBorders
              ? darkMode
                ? "bg-white/4"
                : "bg-white/70"
              : darkMode
                ? "border border-white/40 bg-white/4"
                : "border border-black bg-white/70"
          }`}
        >
          <p className="text-center text-[9px] uppercase  opacity-45">
            {formatPreviewWeatherDate(now)}
          </p>
          <div className="mt-2 flex items-center justify-between gap-4">
            <div className="flex h-28 w-28 items-center justify-center">
              <WeatherIcon
                condition={current.condition}
                className="h-28 w-28"
              />
            </div>
            <div className="flex-1 text-right">
              <div className="mt-4 flex items-end justify-end gap-1">
                <p className="text-6xl font-semibold leading-[0.84] tabular-nums">
                  {currentTemperature}
                </p>
                <p className="pt-3 text-[1.35rem] font-medium opacity-75">
                  {temperatureUnit}
                </p>
              </div>
              <p className="mt-1 text-xs opacity-52">Feels like {feelsLike}</p>
              <p className="mt-1 text-sm opacity-55">{current.condition}</p>
            </div>
          </div>
        </div>

        <div
          className={`mt-2 grid grid-cols-3 rounded-2xl p-1 ${
            hideWidgetBorders
              ? darkMode
                ? "bg-white/4"
                : "bg-white/72"
              : darkMode
                ? "divide-x divide-white/10 border border-white/40 bg-white/4"
                : "divide-x divide-black/10 border border-black bg-white/72"
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
          className={`mt-2 rounded-2xl p-1 ${
            hideWidgetBorders
              ? darkMode
                ? "bg-white/4"
                : "bg-white/72"
              : darkMode
                ? "border border-white/40 bg-white/4"
                : "border border-black bg-white/72"
          }`}
        >
          <PreviewWeatherHourlyChart entries={hourly} darkMode={darkMode} />
        </div>

        <div
          className={`mt-2 grid grid-cols-3 rounded-2xl px-1 py-2 ${
            hideWidgetBorders
              ? darkMode
                ? "bg-white/4"
                : "bg-white/72"
              : darkMode
                ? "border border-white/40 divide-x divide-white/10 bg-white/4"
                : "border border-black divide-x divide-black/10 bg-white/72"
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
                <p className="text-[8px] tracking-[0.14em] opacity-45">
                  {entry.label}
                </p>
                <div className="flex min-h-8 items-center justify-center">
                  <WeatherIcon
                    condition={entry.condition}
                    className="h-6 w-6"
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
    </>
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
      className={`flex h-full items-center justify-center overflow-hidden rounded-2xl ${
        darkMode ? "bg-black text-zinc-100" : "text-zinc-900"
      }`}
    >
      <div className="flex w-full max-w-88 flex-col items-center justify-center px-4 py-6 text-center">
        <div className="h-52 w-52 overflow-hidden rounded-xl border border-current/12 ">
          {hasContent ? (
            media.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media.coverUrl}
                alt={`${media.title} album cover`}
                className="h-full w-full object-cover grayscale"
              />
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
              <p className="mt-4 text-[0.92rem] uppercase  opacity-35">
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
          <p className="mt-6 text-[0.95rem] tracking-[0.2em] opacity-40">
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
  hideWidgetBorders,
}: {
  widget: WidgetConfig;
  now: Date | null;
  darkMode: boolean;
  hideWidgetBorders: boolean;
}) {
  const showSeconds = widget.showSeconds !== false;

  return (
    <div
      className={`rounded-2xl px-2 py-1 ${previewCardClasses(
        darkMode,
        hideWidgetBorders,
        !hideWidgetBorders && !darkMode ? "bg-white/60" : "",
      )}`}
    >
      <p className="text-xs opacity-55">{widget.label}</p>
      <div className="text-center py-2">
        <time
          aria-label="Preview clock time"
          dateTime={now ? now.toISOString() : undefined}
          className="tabular-nums font-segment text-7xl"
        >
          {formatClock(now, showSeconds)}
        </time>
      </div>
    </div>
  );
}

function PreviewAnalogClock({
  widget,
  now,
  darkMode,
  hideWidgetBorders,
}: {
  widget: WidgetConfig;
  now: Date | null;
  darkMode: boolean;
  hideWidgetBorders: boolean;
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
      className={`rounded-2xl px-2 py-1 ${previewCardClasses(
        darkMode,
        hideWidgetBorders,
        !hideWidgetBorders && !darkMode ? "bg-white/60" : "",
      )}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs opacity-55">{widget.label}</p>
      </div>
      <div className="mt-1 flex justify-center">
        <svg viewBox="0 0 160 160" className="h-28 w-28">
          <circle
            cx="80"
            cy="80"
            r="70"
            fill={darkMode ? "rgba(8,8,8,0.98)" : "rgba(255,255,255,0.82)"}
            stroke="currentColor"
            strokeWidth="1"
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
  hideWidgetBorders,
}: {
  widget: WidgetConfig;
  now: Date | null;
  darkMode: boolean;
  hideWidgetBorders: boolean;
}) {
  if (widget.clockStyle === "analog") {
    return (
      <PreviewAnalogClock
        widget={widget}
        now={now}
        darkMode={darkMode}
        hideWidgetBorders={hideWidgetBorders}
      />
    );
  }
  return (
    <PreviewDigitalClock
      widget={widget}
      now={now}
      darkMode={darkMode}
      hideWidgetBorders={hideWidgetBorders}
    />
  );
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
  const orderedWidgets = page.widgets.map((widget, index) => ({
    widget,
    index,
  }));
  const stackEntries = orderedWidgets.filter(
    (entry) =>
      entry.widget.type === "clock" ||
      entry.widget.type === "weather" ||
      entry.widget.type === "progress" ||
      (entry.widget.type === "text" && entry.widget.label.trim().length > 0),
  );
  const buttonWidgets = page.widgets
    .filter((widget) => widget.type === "button")
    .slice(0, 6);
  const buttonRowCounts =
    buttonWidgets.length >= 6
      ? [3, 3]
      : buttonWidgets.length === 5
        ? [3, 2]
        : buttonWidgets.length === 4
          ? [2, 2]
          : buttonWidgets.length === 3
            ? [3]
            : buttonWidgets.length === 2
              ? [2]
              : buttonWidgets.length === 1
                ? [1]
                : [];
  const buttonRows = buttonRowCounts.reduce<WidgetConfig[][]>((rows, count) => {
    const consumed = rows.reduce((total, row) => total + row.length, 0);
    rows.push(buttonWidgets.slice(consumed, consumed + count));
    return rows;
  }, []);
  const hours = now ? now.getHours() % 12 : 10;
  const minutes = now ? now.getMinutes() : 10;
  const seconds = now ? now.getSeconds() : 30;
  const hourAngle = (hours + minutes / 60) * 30;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const secondAngle = seconds * 6;
  const renderOverviewEntry = (entry: {
    widget: WidgetConfig;
    index: number;
  }) => {
    if (entry.widget.type === "clock") {
      const showSeconds = entry.widget.showSeconds !== false;
      return (
        <div
          key={entry.widget.id}
          className="flex min-h-52 w-full items-center justify-center"
        >
          {entry.widget.clockStyle === "analog" ? (
            <svg viewBox="0 0 220 220" className="h-56 w-56">
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
            <time
              aria-label="Preview clock time"
              dateTime={now ? now.toISOString() : undefined}
              className="font-segment tabular-nums leading-none text-7xl tracking-tight"
            >
              {formatClock(now, showSeconds)}
            </time>
          )}
        </div>
      );
    }

    if (entry.widget.type === "weather") {
      return (
        <PreviewOverviewWeather
          key={entry.widget.id}
          entity={getBoundEntityState(entry.widget, homeAssistantStates)}
          index={entry.index}
          darkMode={darkMode}
        />
      );
    }

    if (entry.widget.type === "progress") {
      return (
        <PreviewOverviewProgress
          key={entry.widget.id}
          widget={entry.widget}
          entity={getBoundEntityState(entry.widget, homeAssistantStates)}
          darkMode={darkMode}
        />
      );
    }

    return (
      <p
        key={entry.widget.id}
        className="whitespace-pre-line px-3 text-center text-[1.28rem] leading-[2.28]"
      >
        {entry.widget.label}
      </p>
    );
  };

  return (
    <div className="flex h-full flex-col px-2 pt-2 pb-3">
      <div className="flex flex-1 flex-col justify-evenly">
        {stackEntries.map(renderOverviewEntry)}
      </div>

      {buttonWidgets.length > 0 ? (
        <div className="mt-auto flex justify-center pb-3">
          <div className="flex flex-col gap-4">
            {buttonRows.map((row, rowIndex) => (
              <div
                key={`overview-row-${rowIndex}`}
                className="flex justify-center gap-5"
              >
                {row.map((widget) => {
                  const entity = getBoundEntityState(
                    widget,
                    homeAssistantStates,
                  );
                  const enabled = getPreviewButtonEnabled(widget, entity);
                  const filled = darkMode ? !enabled : enabled;
                  const offStateClasses = darkMode
                    ? "border border-zinc-100 bg-black text-zinc-100"
                    : "border border-zinc-900 bg-white text-zinc-900";
                  return (
                    <div
                      key={widget.id}
                      className={`flex h-[4.35rem] w-[4.35rem] items-center justify-center rounded-full ${
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
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DevicePreview({
  appBasePath,
  darkMode,
  hideWidgetBorders,
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
  const mediaPreview = resolvePreviewMediaPlayer(
    activePage,
    homeAssistantStates,
    homeAssistantConfig.url,
  );
  const fallbackMediaMock = useMemo(
    () => ({
      ...MEDIA_MOCK,
      coverUrl: resolveAppPath(MEDIA_MOCK.coverUrl, appBasePath),
    }),
    [appBasePath],
  );
  const shellClasses = useMemo(
    () =>
      darkMode
        ? "border-zinc-700 bg-[linear-gradient(180deg,#161616_0%,#070707_100%)] text-zinc-100"
        : "border-zinc-300 bg-[linear-gradient(180deg,#ffffff_0%,#ececeb_100%)] text-zinc-900",
    [darkMode],
  );

  if (!activePage) {
    return null;
  }

  return (
    <div
      className={`mx-auto aspect-9/16 w-full max-w-xs rounded-4xl border p-4 shadow-2xl ${shellClasses} ${fontClass}`}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-current/10 bg-white/5 p-2">
        {showPageHeader ? (
          <div className="flex items-center justify-center text-sm">
            {activePage.name}
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
              hideWidgetBorders={hideWidgetBorders}
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
                  : fallbackMediaMock
              }
              darkMode={darkMode}
              fontClass={fontClass}
            />
          ) : (
            <div className="space-y-2 overflow-hidden">
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
                        hideWidgetBorders={hideWidgetBorders}
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
                        hideWidgetBorders={hideWidgetBorders}
                      />
                    );
                  case "progress":
                    return (
                      <PreviewProgress
                        key={widget.id}
                        widget={widget}
                        entity={entity}
                        darkMode={darkMode}
                        hideWidgetBorders={hideWidgetBorders}
                      />
                    );
                  case "switch":
                    return (
                      <PreviewSwitch
                        key={widget.id}
                        widget={widget}
                        entity={entity}
                        darkMode={darkMode}
                        hideWidgetBorders={hideWidgetBorders}
                      />
                    );
                  case "button":
                    return (
                      <PreviewSwitch
                        key={widget.id}
                        widget={widget}
                        entity={entity}
                        darkMode={darkMode}
                        hideWidgetBorders={hideWidgetBorders}
                      />
                    );
                  case "slider":
                    return (
                      <PreviewSlider
                        key={widget.id}
                        widget={widget}
                        entity={entity}
                        darkMode={darkMode}
                        hideWidgetBorders={hideWidgetBorders}
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
                        hideWidgetBorders={hideWidgetBorders}
                      />
                    );
                  case "text":
                    return <PreviewText key={widget.id} widget={widget} />;
                  case "title":
                    return (
                      <PreviewTitleSeparator key={widget.id} widget={widget} />
                    );
                  default:
                    return null;
                }
              })}
            </div>
          )}
        </div>

        {showNavigation ? (
          <div className="mt-1 flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                onPageChange((safePageIndex - 1 + pages.length) % pages.length)
              }
              className="flex h-8 w-8 items-center justify-center rounded-full text-current/80 transition hover:bg-current/10"
            >
              <ChevronLeft className="h-4 w-4 stroke-[2.6]" />
            </button>

            <div className="flex items-center gap-2">
              {pages.map((page, index) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => onPageChange(index)}
                  aria-label={`Open ${page.name}`}
                  className={`h-2 rounded-full transition ${
                    index === safePageIndex
                      ? "w-2 bg-current"
                      : "w-2 bg-current/25"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => onPageChange((safePageIndex + 1) % pages.length)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-current/80 transition hover:bg-current/10"
            >
              <ChevronRight className="h-4 w-4 stroke-[2.6]" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
