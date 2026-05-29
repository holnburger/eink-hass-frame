"use client";

import { useMemo, useState } from "react";

import {
  createPageOfType,
  createWidget,
  DEFAULT_BUILD_CONFIG,
  getMaxWidgetsPerPage,
  MAX_PAGES,
  normalizeBuildConfig,
  type BuildConfig,
  type FontName,
  type PageConfig,
  type PageType,
  type WidgetConfig,
  type WidgetType,
} from "@/lib/layout-config";
import type { HomeAssistantConfig } from "@/lib/home-assistant";

export const MAX_MEDIA_PLAYER_BINDINGS = 4;

type UseLayoutEditorOptions = {
  buildConfig: BuildConfig;
  darkMode: boolean;
  fullRefreshEvery: number;
  hideWidgetBorders: boolean;
  homeAssistant: HomeAssistantConfig;
  selectedFont: FontName;
  setPages: (
    value:
      | PageConfig[]
      | ((current: PageConfig[]) => PageConfig[]),
  ) => void;
};

export function useLayoutEditor({
  buildConfig,
  darkMode,
  fullRefreshEvery,
  hideWidgetBorders,
  homeAssistant,
  selectedFont,
  setPages,
}: UseLayoutEditorOptions) {
  const [editorPageId, setEditorPageId] = useState(
    DEFAULT_BUILD_CONFIG.pages[0]?.id ?? "",
  );
  const [mediaPlayerBindingSlotsByPageId, setMediaPlayerBindingSlotsByPageId] =
    useState<Record<string, number>>({});

  const editorPageIndex = useMemo(() => {
    const index = buildConfig.pages.findIndex(
      (page) => page.id === editorPageId,
    );
    return index >= 0 ? index : 0;
  }, [buildConfig.pages, editorPageId]);
  const editorPage = buildConfig.pages[editorPageIndex] ?? buildConfig.pages[0];
  const editorMediaPlayerBindings =
    editorPage?.type === "media-player"
      ? editorPage.homeAssistantBindings &&
        editorPage.homeAssistantBindings.length > 0
        ? editorPage.homeAssistantBindings
        : editorPage.homeAssistant
          ? [editorPage.homeAssistant]
          : []
      : [];
  const editorMediaPlayerBindingSlotCount =
    editorPage?.type === "media-player"
      ? Math.min(
          MAX_MEDIA_PLAYER_BINDINGS,
          Math.max(
            editorMediaPlayerBindings.length,
            mediaPlayerBindingSlotsByPageId[editorPage.id] ?? 1,
          ),
        )
      : 0;

  function updatePages(updater: (current: PageConfig[]) => PageConfig[]) {
    setPages(
      (current) =>
        normalizeBuildConfig({
          darkMode,
          hideWidgetBorders,
          fontName: selectedFont,
          partialRefreshMs: DEFAULT_BUILD_CONFIG.partialRefreshMs,
          fullRefreshEvery,
          homeAssistant,
          pages: updater(
            normalizeBuildConfig({
              darkMode,
              hideWidgetBorders,
              fontName: selectedFont,
              partialRefreshMs: DEFAULT_BUILD_CONFIG.partialRefreshMs,
              fullRefreshEvery,
              homeAssistant,
              pages: Array.isArray(current)
                ? current
                : DEFAULT_BUILD_CONFIG.pages,
            }).pages,
          ),
        }).pages,
    );
  }

  function updateCurrentPage(updater: (page: PageConfig) => PageConfig) {
    if (!editorPage) {
      return;
    }
    updatePages((current) =>
      current.map((page) => (page.id === editorPage.id ? updater(page) : page)),
    );
  }

  function addPage(type: PageType) {
    if (buildConfig.pages.length >= MAX_PAGES) {
      return;
    }
    const nextPage = createPageOfType(buildConfig.pages.length, type);
    updatePages((current) => [...current, nextPage]);
    setEditorPageId(nextPage.id);
  }

  function removePage(pageId: string) {
    if (buildConfig.pages.length <= 1) {
      return;
    }
    updatePages((current) => current.filter((page) => page.id !== pageId));
  }

  function reorderPages(pageIds: string[]) {
    updatePages((current) => {
      const currentById = new Map(current.map((page) => [page.id, page]));
      const reordered = pageIds
        .map((pageId) => currentById.get(pageId))
        .filter((page): page is PageConfig => Boolean(page));

      return reordered.length === current.length ? reordered : current;
    });
  }

  function addWidget(type: WidgetType) {
    if (
      !editorPage ||
      editorPage.widgets.length >= getMaxWidgetsPerPage(editorPage.type)
    ) {
      return;
    }
    if (editorPage.type === "overview") {
      if (
        type !== "clock" &&
        type !== "weather" &&
        type !== "progress" &&
        type !== "button" &&
        type !== "text"
      ) {
        return;
      }
      if (
        type === "clock" &&
        editorPage.widgets.some((widget) => widget.type === "clock")
      ) {
        return;
      }
      if (
        type === "weather" &&
        editorPage.widgets.some((widget) => widget.type === "weather")
      ) {
        return;
      }
      if (
        type === "button" &&
        editorPage.widgets.filter((widget) => widget.type === "button")
          .length >= 6
      ) {
        return;
      }
    }
    updateCurrentPage((page) => ({
      ...page,
      widgets: [
        ...page.widgets,
        createWidget(
          type,
          page.widgets.filter((widget) => widget.type === type).length,
        ),
      ],
    }));
  }

  function updateWidget(
    widgetId: string,
    updater: (widget: WidgetConfig) => WidgetConfig,
  ) {
    updateCurrentPage((page) => ({
      ...page,
      widgets: page.widgets.map((widget) =>
        widget.id === widgetId ? updater(widget) : widget,
      ),
    }));
  }

  function removeWidget(widgetId: string) {
    updateCurrentPage((page) => ({
      ...page,
      widgets: page.widgets.filter((widget) => widget.id !== widgetId),
    }));
  }

  function reorderWidgets(widgetIds: string[]) {
    updateCurrentPage((page) => {
      const currentById = new Map(
        page.widgets.map((widget) => [widget.id, widget]),
      );
      const reordered = widgetIds
        .map((widgetId) => currentById.get(widgetId))
        .filter((widget): widget is WidgetConfig => Boolean(widget));

      return {
        ...page,
        widgets:
          reordered.length === page.widgets.length ? reordered : page.widgets,
      };
    });
  }

  function setMediaPlayerBindingSlotCount(
    pageId: string,
    updater: (current: number) => number,
  ) {
    setMediaPlayerBindingSlotsByPageId((prev) => ({
      ...prev,
      [pageId]: Math.min(
        MAX_MEDIA_PLAYER_BINDINGS,
        Math.max(1, updater(prev[pageId] ?? 1)),
      ),
    }));
  }

  return {
    addPage,
    addWidget,
    editorMediaPlayerBindings,
    editorMediaPlayerBindingSlotCount,
    editorPage,
    editorPageId,
    editorPageIndex,
    removePage,
    removeWidget,
    reorderPages,
    reorderWidgets,
    setEditorPageId,
    setMediaPlayerBindingSlotCount,
    setMediaPlayerBindingSlotsByPageId,
    updateCurrentPage,
    updateWidget,
  };
}
