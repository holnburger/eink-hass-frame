"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
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
  { temperature: "7 C", condition: "Cloudy" },
  { temperature: "8 C", condition: "Light rain" },
  { temperature: "10 C", condition: "Sunny" },
];

function PreviewSwitch({ widget }: { widget: WidgetConfig }) {
  const [enabled, setEnabled] = useState(Boolean(widget.enabled));

  useEffect(() => {
    setEnabled(Boolean(widget.enabled));
  }, [widget.enabled, widget.id]);

  return (
    <button
      type="button"
      onClick={() => setEnabled((current) => !current)}
      className="rounded-[1.35rem] border border-current/15 bg-white/55 p-4 text-left"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-55">Switch</p>
          <p className="mt-1 text-lg font-semibold">{widget.label}</p>
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
    <div className="rounded-[1.35rem] border border-current/15 bg-white/55 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-55">Progress</p>
          <p className="mt-1 text-lg font-semibold">{widget.label}</p>
        </div>
        <p className="text-xl font-semibold tabular-nums">{value}%</p>
      </div>
      <div className="mt-4 h-4 rounded-full bg-zinc-400/25 p-0.5">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#1f2937_0%,#6b7280_100%)]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function PreviewSlider({ widget }: { widget: WidgetConfig }) {
  const value = Math.max(0, Math.min(100, widget.value ?? 0));

  return (
    <div className="rounded-[1.35rem] border border-current/15 bg-white/55 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-55">Slider</p>
          <p className="mt-1 text-lg font-semibold">{widget.label}</p>
        </div>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
      </div>
      <div className="mt-5 h-4 rounded-full bg-zinc-400/20">
        <div className="relative h-full rounded-full bg-zinc-500/40">
          <div
            className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-zinc-700 bg-white shadow-sm"
            style={{ left: `calc(${value}% - 12px)` }}
          />
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
          <p className="mt-3 text-3xl font-semibold tabular-nums">{weather.temperature}</p>
          <p className="text-sm opacity-70">{weather.condition}</p>
        </div>
        <div className="mt-1 h-14 w-14 rounded-full border border-current/20 bg-zinc-400/10" />
      </div>
    </div>
  );
}

function PreviewClock({ timeText }: { timeText: string }) {
  return (
    <div className="rounded-[1.6rem] border border-current/15 bg-white/60 px-5 py-6 text-center">
      <p className="text-xs uppercase tracking-[0.22em] opacity-55">Clock</p>
      <p className="mt-3 text-[2.3rem] font-semibold tracking-[0.12em] tabular-nums">{timeText}</p>
    </div>
  );
}

export function DevicePreview({
  darkMode,
  fontClass,
  pages,
  activePageIndex,
  onPageChange,
}: DevicePreviewProps) {
  const [clock, setClock] = useState<string>("--:--:--");

  useEffect(() => {
    const updateClock = () => {
      setClock(
        new Date().toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const safePageIndex = useMemo(() => {
    if (pages.length === 0) {
      return 0;
    }
    return Math.max(0, Math.min(activePageIndex, pages.length - 1));
  }, [activePageIndex, pages.length]);
  const activePage = pages[safePageIndex];
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
    <div className={`mx-auto aspect-[9/16] w-full max-w-xs rounded-[2rem] border p-4 shadow-2xl ${shellClasses} ${fontClass}`}>
      <div className="flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-current/10 bg-white/5 p-3">
        <div className="flex items-start justify-between gap-3 border-b border-current/10 pb-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] opacity-55">M5PaperS3</p>
            <p className="mt-1 text-lg font-semibold">{activePage.name}</p>
          </div>
          <div className="rounded-full border border-current/15 px-2 py-1 text-[10px] uppercase tracking-[0.18em] opacity-70">
            {fontClass.replace("font-", "")}
          </div>
        </div>

        <div className="mt-3 flex-1 space-y-3 overflow-hidden">
          {activePage.widgets.map((widget, index) => {
            switch (widget.type) {
              case "clock":
                return <PreviewClock key={widget.id} timeText={clock} />;
              case "weather":
                return <PreviewWeather key={widget.id} widget={widget} index={index} />;
              case "progress":
                return <PreviewProgress key={widget.id} widget={widget} />;
              case "switch":
                return <PreviewSwitch key={widget.id} widget={widget} />;
              case "slider":
                return <PreviewSlider key={widget.id} widget={widget} />;
              default:
                return null;
            }
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-current/10 pt-3">
          <button
            type="button"
            onClick={() => onPageChange((safePageIndex - 1 + pages.length) % pages.length)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-current/15 bg-white/40"
          >
            <ChevronLeft className="h-5 w-5" />
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
            className="flex h-10 w-10 items-center justify-center rounded-full border border-current/15 bg-white/40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
