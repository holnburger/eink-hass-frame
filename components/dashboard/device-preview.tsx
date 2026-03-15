"use client";

import { ChevronLeft, ChevronRight, Cloud, CloudRain, Lightbulb, SunMedium, Wind } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { PageConfig, WidgetConfig } from "@/lib/layout-config";

type DevicePreviewProps = {
  darkMode: boolean;
  fontClass: string;
  pages: PageConfig[];
  activePageIndex: number;
  onPageChange: (pageIndex: number) => void;
};

const WEATHER_STATES = [
  { temperature: 7, condition: "Cloudy" },
  { temperature: 8, condition: "Light rain" },
  { temperature: 10, condition: "Clear" },
  { temperature: 6, condition: "Windy" },
] as const;

function WeatherIcon({ condition, className = "h-14 w-14" }: { condition: string; className?: string }) {
  if (condition.includes("Clear")) {
    return <SunMedium className={className} />;
  }
  if (condition.includes("Wind")) {
    return <Wind className={className} />;
  }
  if (condition.includes("rain") || condition.includes("Rain")) {
    return <CloudRain className={className} />;
  }
  return <Cloud className={className} />;
}

function formatClock(date: Date, showSeconds: boolean) {
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    ...(showSeconds ? { second: "2-digit" } : {}),
  });
}

function PreviewSwitch({ widget }: { widget: WidgetConfig }) {
  const [enabled, setEnabled] = useState(Boolean(widget.enabled));

  useEffect(() => {
    setEnabled(Boolean(widget.enabled));
  }, [widget.enabled, widget.id]);

  return (
    <button
      type="button"
      onClick={() => setEnabled((current) => !current)}
      className="rounded-[1.25rem] border border-current/15 bg-white/55 px-4 py-3 text-left"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-55">Switch</p>
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
    </button>
  );
}

function PreviewProgress({ widget }: { widget: WidgetConfig }) {
  const value = Math.max(0, Math.min(100, widget.value ?? 0));

  return (
    <div className="rounded-[1.25rem] border border-current/15 bg-white/55 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-55">Progress</p>
          <p className="mt-0.5 text-base font-semibold">{widget.label}</p>
        </div>
        <p className="text-lg font-semibold tabular-nums">{value}%</p>
      </div>
      <div className="mt-3 h-3 rounded-full bg-zinc-400/25 p-0.5">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#111827_0%,#6b7280_100%)]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function PreviewSlider({ widget }: { widget: WidgetConfig }) {
  const value = Math.max(0, Math.min(100, widget.value ?? 0));
  const ratio = (value / 100).toFixed(3);
  const knobPosition = `calc(8px + ${ratio} * (100% - 16px))`;
  const fillWidth = `max(0px, calc(${ratio} * (100% - 16px)))`;

  return (
    <div className="rounded-[1.35rem] border border-current/15 bg-white/55 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-55">Slider</p>
          <p className="mt-1 text-lg font-semibold">{widget.label}</p>
        </div>
        <p className="text-xl font-semibold tabular-nums">{value}%</p>
      </div>
      <div className="mt-5">
        <div className="relative h-12 rounded-full border border-current/15 bg-zinc-400/15 px-2">
          <div
            className="absolute inset-y-2 left-2 rounded-full bg-zinc-500/25"
            style={{ width: fillWidth }}
          />
          <div
            className="absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-white shadow-sm"
            style={{ left: knobPosition }}
          >
            <Lightbulb className="h-4 w-4 text-zinc-700" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewThermostat({ widget }: { widget: WidgetConfig }) {
  const [targetTemp, setTargetTemp] = useState(widget.value ?? 22.5);
  const currentTemp = widget.currentValue ?? 20.5;

  useEffect(() => {
    setTargetTemp(widget.value ?? 22.5);
  }, [widget.id, widget.value]);

  return (
    <div className="rounded-[1.45rem] border border-current/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.74)_0%,rgba(238,238,234,0.92)_100%)] px-4 py-5.5">
      <p className="text-[10px] uppercase tracking-[0.22em] opacity-55">Thermostat</p>
      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="min-w-0 truncate text-lg">{widget.label}</p>

        <div className="mr-5 flex items-start gap-3">
          <div className="w-[8.75rem] shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-[0.16em] opacity-45">Current / Target</p>
            <div className="mt-1 flex items-end gap-2">
              <p className="text-[1.9rem] font-black tabular-nums leading-none">{currentTemp.toFixed(1)}°C</p>
              <span className="pb-0.5 text-sm opacity-55">/</span>
            </div>
          </div>

          <div className="flex items-center pl-1 pr-0.5 py-2">
            <p className="text-[1.45rem] font-medium tabular-nums leading-none">{targetTemp.toFixed(1)}°C</p>
            <div className="ml-2 flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setTargetTemp((current) => Math.min(30, Number((current + 0.5).toFixed(1))))}
                className="flex h-6 w-6 items-center justify-center rounded-full text-current/80 transition hover:bg-current/8"
                aria-label="Increase target temperature"
              >
                <ChevronRight className="h-4.5 w-4.5 -rotate-90 stroke-[3.2]" />
              </button>
              <button
                type="button"
                onClick={() => setTargetTemp((current) => Math.max(12, Number((current - 0.5).toFixed(1))))}
                className="flex h-6 w-6 items-center justify-center rounded-full text-current/80 transition hover:bg-current/8"
                aria-label="Decrease target temperature"
              >
                <ChevronRight className="h-4.5 w-4.5 rotate-90 stroke-[3.2]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewWeather({ widget, index }: { widget: WidgetConfig; index: number }) {
  const weather = WEATHER_STATES[index % WEATHER_STATES.length];

  return (
    <div className="rounded-[1.35rem] border border-current/15 bg-white/55 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-55">Weather</p>
          <p className="mt-1 text-lg font-semibold">{widget.label}</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums">{weather.temperature}°C</p>
          <p className="text-sm opacity-70">{weather.condition}</p>
        </div>
        <div className="mt-0.5 flex h-32 w-32 items-center justify-center rounded-[1.35rem] bg-zinc-400/6">
          <WeatherIcon condition={weather.condition} className="h-28 w-28" />
        </div>
      </div>
    </div>
  );
}

function PreviewWeatherFocusPage({ pageIndex }: { pageIndex: number }) {
  const current = WEATHER_STATES[pageIndex % WEATHER_STATES.length];
  const upcoming = Array.from({ length: 4 }, (_, index) => WEATHER_STATES[(pageIndex + index + 1) % WEATHER_STATES.length]);
  const hours = ["+2h", "+4h", "+6h", "+8h"];

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-[1.7rem] border border-current/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(240,240,236,0.92)_100%)] p-5">
        <p className="text-[11px] uppercase tracking-[0.22em] opacity-55">Weather Overview</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-5xl font-semibold tabular-nums">{current.temperature}°C</p>
            <p className="mt-2 text-base opacity-75">{current.condition}</p>
          </div>
          <div className="rounded-[1.5rem] border border-current/15 bg-white/60 p-3">
            <WeatherIcon condition={current.condition} className="h-24 w-24" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {upcoming.map((entry, index) => (
          <div key={`${hours[index]}-${entry.condition}`} className="rounded-[1.2rem] border border-current/15 bg-white/55 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.16em] opacity-50">{hours[index]}</p>
              <WeatherIcon condition={entry.condition} className="h-[18px] w-[18px]" />
            </div>
            <p className="mt-2 text-lg font-medium tabular-nums">{entry.temperature}°</p>
            <p className="mt-0.5 text-[11px] opacity-60">{entry.condition}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewDigitalClock({ widget, now }: { widget: WidgetConfig; now: Date }) {
  return (
    <div className="rounded-[1.6rem] border border-current/15 bg-white/60 px-5 py-6 text-center">
      <p className="text-xs uppercase tracking-[0.22em] opacity-55">Clock</p>
      <p className="mt-3 text-[2.2rem] font-semibold tracking-[0.12em] tabular-nums">
        {formatClock(now, widget.showSeconds !== false)}
      </p>
    </div>
  );
}

function PreviewAnalogClock({ widget, now }: { widget: WidgetConfig; now: Date }) {
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const hourAngle = (hours + minutes / 60) * 30;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const secondAngle = seconds * 6;
  const showSeconds = widget.showSeconds !== false;

  return (
    <div className="rounded-[1.6rem] border border-current/15 bg-white/60 px-5 py-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.22em] opacity-55">Clock</p>
        <p className="text-xs uppercase tracking-[0.18em] opacity-55">
          {showSeconds ? "Seconds" : "Minutes"}
        </p>
      </div>
      <div className="mt-3 flex justify-center">
        <svg viewBox="0 0 160 160" className="h-36 w-36">
          <circle cx="80" cy="80" r="70" fill="rgba(255,255,255,0.82)" stroke="currentColor" strokeWidth="4" />
          <circle cx="80" cy="80" r="58" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.5" />
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
            y2="44"
            stroke="currentColor"
            strokeWidth="6"
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

function PreviewClock({ widget, now }: { widget: WidgetConfig; now: Date }) {
  if (widget.clockStyle === "analog") {
    return <PreviewAnalogClock widget={widget} now={now} />;
  }
  return <PreviewDigitalClock widget={widget} now={now} />;
}

export function DevicePreview({
  darkMode,
  fontClass,
  pages,
  activePageIndex,
  onPageChange,
}: DevicePreviewProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const safePageIndex = useMemo(() => {
    if (pages.length === 0) {
      return 0;
    }
    return Math.max(0, Math.min(activePageIndex, pages.length - 1));
  }, [activePageIndex, pages.length]);
  const activePage = pages[safePageIndex];
  const showNavigation = pages.length > 1;
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
      className={`mx-auto aspect-[9/16] w-full max-w-xs rounded-[2rem] border p-4 shadow-2xl ${shellClasses} ${fontClass}`}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-current/10 bg-white/5 p-3">
        {showNavigation ? (
          <div className="flex items-start justify-between gap-3 border-b border-current/10 pb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] opacity-55">M5PaperS3</p>
              <p className="mt-1 text-xl font-semibold tracking-tight">{activePage.name}</p>
            </div>
            <div className="rounded-full border border-current/15 px-2 py-1 text-[10px] uppercase tracking-[0.18em] opacity-70">
              {fontClass.replace("font-", "")}
            </div>
          </div>
        ) : null}

        <div className={`${showNavigation ? "mt-3" : ""} flex-1 overflow-hidden`}>
          {activePage.type === "weather-focus" ? (
            <PreviewWeatherFocusPage pageIndex={safePageIndex} />
          ) : (
            <div className="space-y-3 overflow-hidden">
              {activePage.widgets.map((widget, index) => {
                switch (widget.type) {
                  case "clock":
                    return <PreviewClock key={widget.id} widget={widget} now={now} />;
                  case "weather":
                    return <PreviewWeather key={widget.id} widget={widget} index={index} />;
                  case "progress":
                    return <PreviewProgress key={widget.id} widget={widget} />;
                  case "switch":
                    return <PreviewSwitch key={widget.id} widget={widget} />;
                  case "slider":
                    return <PreviewSlider key={widget.id} widget={widget} />;
                  case "thermostat":
                    return <PreviewThermostat key={widget.id} widget={widget} />;
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
              onClick={() => onPageChange((safePageIndex - 1 + pages.length) % pages.length)}
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
                    index === safePageIndex ? "w-6 bg-current" : "w-2.5 bg-current/25"
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
