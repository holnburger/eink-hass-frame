"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PreviewPageRenderer } from "@/components/dashboard/preview/page-renderer";
import type { HomeAssistantConfig, HomeAssistantEntityState } from "@/lib/home-assistant";
import type { PageConfig } from "@/lib/layout-config";

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
          <PreviewPageRenderer
            activePage={activePage}
            appBasePath={appBasePath}
            darkMode={darkMode}
            fontClass={fontClass}
            hideWidgetBorders={hideWidgetBorders}
            homeAssistantConfig={homeAssistantConfig}
            homeAssistantStates={homeAssistantStates}
            now={now}
            pageIndex={safePageIndex}
          />
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
