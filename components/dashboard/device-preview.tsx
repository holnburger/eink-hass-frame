"use client";

import { ChevronLeft, ChevronRight, Cloud, CloudRain, Lightbulb, SunMedium, Wind } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { PageConfig, WidgetConfig } from "@/lib/layout-config";

type DevicePreviewProps = {
  darkMode: boolean;
  fontClass: string;
  pages: PageConfig[];
  activePageIndex: number;
  onPageChange: (pageIndex: number) => void;
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
  elapsed: "01:42",
  duration: "03:57",
  progress: 43,
  coverUrl: "/mock/black-cover.jpg",
} as const;

function truncateMediaTitle(title: string, fontClass: string) {
  const hardLimit = fontClass.includes("font-mono") ? 22 : 30;
  if (title.length <= hardLimit) {
    return title;
  }
  return `${title.slice(0, hardLimit)}...`;
}

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

function PreviewSwitch({ widget, darkMode }: { widget: WidgetConfig; darkMode: boolean }) {
  const [enabled, setEnabled] = useState(Boolean(widget.enabled));

  useEffect(() => {
    setEnabled(Boolean(widget.enabled));
  }, [widget.enabled, widget.id]);

  return (
    <button
      type="button"
      onClick={() => setEnabled((current) => !current)}
      className={`rounded-[1.25rem] px-4 py-3 text-left ${previewCardClasses(darkMode)}`}
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

function PreviewProgress({ widget, darkMode }: { widget: WidgetConfig; darkMode: boolean }) {
  const value = Math.max(0, Math.min(100, widget.value ?? 0));

  return (
    <div className={`rounded-[1.25rem] px-4 py-3 ${previewCardClasses(darkMode)}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-55">Progress</p>
          <p className="mt-0.5 text-base font-semibold">{widget.label}</p>
        </div>
        <p className="text-lg font-semibold tabular-nums">{value}%</p>
      </div>
      <div className={`mt-3 h-3 rounded-full p-0.5 ${darkMode ? "bg-white/10" : "bg-zinc-400/25"}`}>
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#111827_0%,#6b7280_100%)]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function PreviewSlider({ widget, darkMode }: { widget: WidgetConfig; darkMode: boolean }) {
  const [value, setValue] = useState(Math.max(0, Math.min(100, widget.value ?? 0)));
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue(Math.max(0, Math.min(100, widget.value ?? 0)));
  }, [widget.id, widget.value]);

  const ratio = (value / 100).toFixed(3);
  const knobPosition = `calc(44px + ${ratio} * (100% - 66px))`;
  const fillWidth = value > 0 ? `calc(22px + ${ratio} * (100% - 66px))` : "0px";

  const updateFromPointer = (clientX: number) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const rect = track.getBoundingClientRect();
    const sliderStart = 44;
    const sliderEnd = rect.width - 22;
    const localX = Math.max(sliderStart, Math.min(sliderEnd, clientX - rect.left));
    const nextValue = Math.round(((localX - sliderStart) / Math.max(1, sliderEnd - sliderStart)) * 100);
    setValue(nextValue);
  };

  return (
    <div className={`rounded-[1.35rem] p-4 ${previewCardClasses(darkMode)}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-55">Slider</p>
          <p className="mt-1 text-lg font-semibold">{widget.label}</p>
        </div>
        <p className="text-sm font-medium tabular-nums opacity-70">{value}%</p>
      </div>
      <div className="mt-4">
        <div
          ref={trackRef}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            updateFromPointer(event.clientX);
          }}
          onPointerMove={(event) => {
            if (event.buttons === 1) {
              updateFromPointer(event.clientX);
            }
          }}
          className="relative h-11 cursor-ew-resize touch-none select-none"
        >
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
            <Lightbulb className="h-[1.05rem] w-[1.05rem]" />
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

function PreviewThermostat({ widget, darkMode }: { widget: WidgetConfig; darkMode: boolean }) {
  const [targetTemp, setTargetTemp] = useState(widget.value ?? 22.5);
  const currentTemp = widget.currentValue ?? 20.5;

  useEffect(() => {
    setTargetTemp(widget.value ?? 22.5);
  }, [widget.id, widget.value]);

  return (
    <div
      className={`rounded-[1.45rem] px-4 py-5.5 ${
        darkMode
          ? "border border-white/12 bg-black"
          : "border border-current/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.74)_0%,rgba(238,238,234,0.92)_100%)]"
      }`}
    >
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

function PreviewWeather({ widget, index, darkMode }: { widget: WidgetConfig; index: number; darkMode: boolean }) {
  const weather = WEATHER_STATES[index % WEATHER_STATES.length];

  return (
    <div className={`rounded-[1.35rem] p-4 ${previewCardClasses(darkMode)}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-55">Weather</p>
          <p className="mt-1 text-lg font-semibold">{widget.label}</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums">{weather.temperature}°C</p>
          <p className="text-sm opacity-70">{weather.condition}</p>
        </div>
        <div className={`mt-0.5 flex h-32 w-32 items-center justify-center rounded-[1.35rem] ${darkMode ? "bg-white/6" : "bg-zinc-400/6"}`}>
          <WeatherIcon condition={weather.condition} className="h-28 w-28" />
        </div>
      </div>
    </div>
  );
}

function PreviewWeatherFocusPage({ pageIndex, darkMode }: { pageIndex: number; darkMode: boolean }) {
  const current = WEATHER_STATES[pageIndex % WEATHER_STATES.length];
  const upcoming = Array.from({ length: 4 }, (_, index) => WEATHER_STATES[(pageIndex + index + 1) % WEATHER_STATES.length]);
  const hours = ["+2h", "+4h", "+6h", "+8h"];

  return (
    <div
      className={`relative h-full overflow-hidden rounded-[1.8rem] ${
        darkMode
          ? "border border-white/12 bg-black text-zinc-100"
          : "border border-current/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(244,243,238,0.96)_100%)] text-zinc-900"
      }`}
    >
      <div className="pointer-events-none absolute -left-24 top-1/2 -translate-y-[52%] opacity-95">
        <WeatherIcon condition={current.condition} className="h-[24rem] w-[24rem]" />
      </div>

      <div className="relative z-10 flex h-full flex-col px-5 pb-4 pt-5">
        <div className="ml-auto mt-14 max-w-[11rem] text-right">
          <p className="text-[10px] uppercase tracking-[0.28em] opacity-45">Current Weather</p>
          <p className="mt-5 text-[5.1rem] font-semibold leading-[0.88] tabular-nums">
            {current.temperature}°C
          </p>
          <p className="mt-2 text-base tracking-[0.08em] opacity-70">{current.condition}</p>
        </div>

        <div className={`mt-auto border-t ${darkMode ? "border-white/10" : "border-black/10"} pt-3`}>
          <div className="grid grid-cols-4 gap-2">
            {upcoming.map((entry, index) => (
              <div key={`${hours[index]}-${entry.condition}`} className="text-center">
                <p className="text-[9px] uppercase tracking-[0.18em] opacity-45">{hours[index]}</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <WeatherIcon condition={entry.condition} className="h-9 w-9" />
                  <p className="text-[1rem] font-medium tabular-nums">{entry.temperature}°</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMediaPlayerPage({ darkMode, fontClass }: { darkMode: boolean; fontClass: string }) {
  const mediaTitle = truncateMediaTitle(MEDIA_MOCK.title, fontClass);

  return (
    <div
      className={`flex h-full items-center justify-center overflow-hidden rounded-[1.8rem] ${
        darkMode
          ? "border border-white/12 bg-black text-zinc-100"
          : "border border-current/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(241,239,234,0.98)_100%)] text-zinc-900"
      }`}
    >
      <div className="flex w-full max-w-[22rem] flex-col items-center justify-center px-4 py-6 text-center">
        <div className="h-[20rem] w-[20rem] overflow-hidden rounded-[2.35rem] border border-current/12 shadow-[0_26px_58px_rgba(0,0,0,0.16)]">
          <img
            src={MEDIA_MOCK.coverUrl}
            alt={`${MEDIA_MOCK.title} album cover`}
            className="h-full w-full object-cover grayscale"
          />
        </div>
        <p className="mt-4 text-[0.92rem] uppercase tracking-[0.18em] opacity-35">{MEDIA_MOCK.artist}</p>
        <p className="mt-4 max-w-[19.75rem] text-[1.1rem] font-medium leading-tight" title={MEDIA_MOCK.title}>
          {mediaTitle}
        </p>
        <div className={`mt-5 h-2.5 w-[21rem] max-w-full overflow-hidden rounded-full ${darkMode ? "bg-white/12" : "bg-zinc-400/20"}`}>
          <div
            className={`h-full rounded-full ${darkMode ? "bg-zinc-100" : "bg-zinc-900"}`}
            style={{ width: `${MEDIA_MOCK.progress}%` }}
          />
        </div>
        <div className="mt-2 flex w-[21rem] max-w-full items-center justify-between text-sm tabular-nums opacity-70">
          <span>{MEDIA_MOCK.elapsed}</span>
          <span>{MEDIA_MOCK.duration}</span>
        </div>
      </div>
    </div>
  );
}

function PreviewDigitalClock({ widget, now, darkMode }: { widget: WidgetConfig; now: Date | null; darkMode: boolean }) {
  return (
    <div className={`rounded-[1.6rem] px-5 py-6 text-center ${previewCardClasses(darkMode, darkMode ? "" : "bg-white/60")}`}>
      <p className="text-xs uppercase tracking-[0.22em] opacity-55">Clock</p>
      <p className="mt-3 text-[2.2rem] font-semibold tracking-[0.12em] tabular-nums">
        {formatClock(now, widget.showSeconds !== false)}
      </p>
    </div>
  );
}

function PreviewAnalogClock({ widget, now, darkMode }: { widget: WidgetConfig; now: Date | null; darkMode: boolean }) {
  const hours = now ? now.getHours() % 12 : 10;
  const minutes = now ? now.getMinutes() : 10;
  const seconds = now ? now.getSeconds() : 30;
  const hourAngle = (hours + minutes / 60) * 30;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const secondAngle = seconds * 6;
  const showSeconds = widget.showSeconds !== false;

  return (
    <div className={`rounded-[1.6rem] px-5 py-5 ${previewCardClasses(darkMode, darkMode ? "" : "bg-white/60")}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.22em] opacity-55">Clock</p>
        <p className="text-xs uppercase tracking-[0.18em] opacity-55">
          {showSeconds ? "Seconds" : "Minutes"}
        </p>
      </div>
      <div className="mt-3 flex justify-center">
        <svg viewBox="0 0 160 160" className="h-36 w-36">
          <circle cx="80" cy="80" r="70" fill={darkMode ? "rgba(8,8,8,0.98)" : "rgba(255,255,255,0.82)"} stroke="currentColor" strokeWidth="4" />
          <circle cx="80" cy="80" r="58" fill="none" stroke="currentColor" strokeOpacity={darkMode ? "0.36" : "0.22"} strokeWidth="1.5" />
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

function PreviewClock({ widget, now, darkMode }: { widget: WidgetConfig; now: Date | null; darkMode: boolean }) {
  if (widget.clockStyle === "analog") {
    return <PreviewAnalogClock widget={widget} now={now} darkMode={darkMode} />;
  }
  return <PreviewDigitalClock widget={widget} now={now} darkMode={darkMode} />;
}

export function DevicePreview({
  darkMode,
  fontClass,
  pages,
  activePageIndex,
  onPageChange,
}: DevicePreviewProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
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
              <p className="mt-1 text-[1.02rem] font-medium tracking-[-0.01em]">{activePage.name}</p>
            </div>
            <div className="rounded-full border border-current/15 px-2 py-1 text-[10px] uppercase tracking-[0.18em] opacity-70">
              {fontClass.replace("font-", "")}
            </div>
          </div>
        ) : null}

        <div className={`${showNavigation ? "mt-3" : ""} flex-1 overflow-hidden`}>
          {activePage.type === "weather-focus" ? (
            <PreviewWeatherFocusPage pageIndex={safePageIndex} darkMode={darkMode} />
          ) : activePage.type === "media-player" ? (
            <PreviewMediaPlayerPage darkMode={darkMode} fontClass={fontClass} />
          ) : (
            <div className="space-y-3 overflow-hidden">
              {activePage.widgets.map((widget, index) => {
                switch (widget.type) {
                  case "clock":
                    return <PreviewClock key={widget.id} widget={widget} now={now} darkMode={darkMode} />;
                  case "weather":
                    return <PreviewWeather key={widget.id} widget={widget} index={index} darkMode={darkMode} />;
                  case "progress":
                    return <PreviewProgress key={widget.id} widget={widget} darkMode={darkMode} />;
                  case "switch":
                    return <PreviewSwitch key={widget.id} widget={widget} darkMode={darkMode} />;
                  case "slider":
                    return <PreviewSlider key={widget.id} widget={widget} darkMode={darkMode} />;
                  case "thermostat":
                    return <PreviewThermostat key={widget.id} widget={widget} darkMode={darkMode} />;
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
