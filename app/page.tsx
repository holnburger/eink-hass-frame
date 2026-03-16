"use client";

import {
  CheckCircle2,
  GripVertical,
  Moon,
  Palette,
  Plus,
  Sun,
  Trash2,
  Usb,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, Reorder, useDragControls } from "motion/react";

import { DevicePreview } from "@/components/dashboard/device-preview";
import { MdiIcon } from "@/components/dashboard/mdi-icon";
import { OtaFlashCard } from "@/components/dashboard/ota-flash";
import { UsbFlashCard } from "@/components/dashboard/usb-flash";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  CLOCK_STYLE_OPTIONS,
  countWidgets,
  createPageOfType,
  createWidget,
  DEFAULT_BUILD_CONFIG,
  FONT_OPTIONS,
  getFontClass,
  MAX_PAGES,
  MAX_WIDGETS_PER_PAGE,
  normalizeBuildConfig,
  PAGE_TYPE_OPTIONS,
  SLIDER_ICON_OPTIONS,
  type BuildConfig,
  type FontName,
  type PageConfig,
  type PageType,
  type SliderIconName,
  type WidgetConfig,
  type WidgetType,
  WIDGET_OPTIONS,
} from "@/lib/layout-config";

type SavedDevice = {
  id: string;
  name: string;
  ip: string;
  lastSeen: string;
};

function isSavedDevice(value: unknown): value is SavedDevice {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.ip === "string" &&
    typeof candidate.lastSeen === "string"
  );
}

type StepStateBadgeProps = {
  done: boolean;
  pendingLabel: string;
};

type EditableWidgetCardProps = {
  widget: WidgetConfig;
  widgetIndex: number;
  widgetsCount: number;
  onRemove: (widgetId: string) => void;
  onUpdate: (
    widgetId: string,
    updater: (widget: WidgetConfig) => WidgetConfig,
  ) => void;
};

function StepStateBadge({ done, pendingLabel }: StepStateBadgeProps) {
  return done ? (
    <Badge className="border-emerald-500/50 bg-emerald-500/10 text-emerald-300">
      <CheckCircle2 className="mr-1 h-3 w-3" /> Done
    </Badge>
  ) : (
    <Badge className="border-zinc-600 text-zinc-300">{pendingLabel}</Badge>
  );
}

type SliderIconPickerDialogProps = {
  open: boolean;
  selectedIcon: SliderIconName;
  onClose: () => void;
  onSelect: (icon: SliderIconName) => void;
};

function SliderIconPickerDialog({
  open,
  selectedIcon,
  onClose,
  onSelect,
}: SliderIconPickerDialogProps) {
  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">
                  Choose Slider Icon
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Pick the MDI icon that should be rendered on the device and in
                  the preview.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100"
                aria-label="Close slider icon picker"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SLIDER_ICON_OPTIONS.map((option) => {
                const isSelected = option.value === selectedIcon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onSelect(option.value);
                      onClose();
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? "border-zinc-100 bg-zinc-100 text-zinc-950"
                        : "border-zinc-800 bg-zinc-900/70 text-zinc-100 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                          isSelected
                            ? "border-zinc-300 bg-zinc-950/5"
                            : "border-zinc-700 bg-zinc-950"
                        }`}
                      >
                        <MdiIcon
                          icon={option.value}
                          size={18}
                          className="h-[1.05rem] w-[1.05rem]"
                        />
                      </span>
                      <span className="text-sm font-medium">{option.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function EditableWidgetCard({
  widget,
  widgetIndex,
  widgetsCount,
  onRemove,
  onUpdate,
}: EditableWidgetCardProps) {
  const dragControls = useDragControls();
  const [sliderIconPickerOpen, setSliderIconPickerOpen] = useState(false);
  const sliderIconOption = widget.type === "slider"
    ? SLIDER_ICON_OPTIONS.find((option) => option.value === widget.icon)
    : null;

  return (
    <Reorder.Item
      value={widget.id}
      dragListener={false}
      dragControls={dragControls}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -10 }}
      whileDrag={{
        scale: 1.01,
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.28)",
      }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onPointerDown={(event) => dragControls.start(event)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100"
            aria-label={`Drag ${widget.label}`}
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div>
            <p className="text-sm font-medium text-zinc-100">
              {widgetIndex + 1}.{" "}
              {WIDGET_OPTIONS.find((entry) => entry.type === widget.type)
                ?.label ?? widget.type}
            </p>
            <p className="text-xs text-zinc-500">
              Type: {widget.type} · Position {widgetIndex + 1} of {widgetsCount}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(widget.id)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 text-zinc-400 transition hover:border-red-500/60 hover:text-red-300"
          aria-label={`Delete ${widget.label}`}
          title="Delete widget"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${widget.id}-label`}>Label</Label>
          <Input
            id={`${widget.id}-label`}
            value={widget.label}
            onChange={(event) =>
              onUpdate(widget.id, (current) => ({
                ...current,
                label: event.target.value,
              }))
            }
          />
        </div>

        {(widget.type === "progress" || widget.type === "slider") && (
          <div className="space-y-2">
            <Label htmlFor={`${widget.id}-value`}>Initial Value (%)</Label>
            <Input
              id={`${widget.id}-value`}
              type="number"
              min={0}
              max={100}
              value={widget.value ?? 0}
              onChange={(event) =>
                onUpdate(widget.id, (current) => ({
                  ...current,
                  value: Math.max(
                    0,
                    Math.min(100, Number(event.target.value) || 0),
                  ),
                  max: 100,
                }))
              }
            />
          </div>
        )}

        {widget.type === "slider" && (
          <div className="space-y-2">
            <Label>Slider Icon</Label>
            <button
              type="button"
              onClick={() => setSliderIconPickerOpen(true)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 transition hover:border-zinc-500"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900">
                  <MdiIcon
                    icon={widget.icon ?? SLIDER_ICON_OPTIONS[0].value}
                    size={16}
                    className="h-4 w-4"
                  />
                </span>
                <span>{sliderIconOption?.label ?? "Lightbulb"}</span>
              </span>
              <span className="text-xs text-zinc-500">Choose</span>
            </button>
          </div>
        )}

        {widget.type === "thermostat" && (
          <>
            <div className="space-y-2">
              <Label htmlFor={`${widget.id}-current`}>
                Current Temperature (°C)
              </Label>
              <Input
                id={`${widget.id}-current`}
                type="number"
                min={12}
                max={30}
                step={0.1}
                value={widget.currentValue ?? 20}
                onChange={(event) =>
                  onUpdate(widget.id, (current) => ({
                    ...current,
                    currentValue: Number(
                      Math.max(
                        12,
                        Math.min(30, Number(event.target.value) || 20),
                      ).toFixed(1),
                    ),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${widget.id}-target`}>
                Target Temperature (°C)
              </Label>
              <Input
                id={`${widget.id}-target`}
                type="number"
                min={12}
                max={30}
                step={0.5}
                value={widget.value ?? 22}
                onChange={(event) =>
                  onUpdate(widget.id, (current) => ({
                    ...current,
                    value: Number(
                      (
                        Math.round(
                          Math.max(
                            12,
                            Math.min(30, Number(event.target.value) || 22),
                          ) * 2,
                        ) / 2
                      ).toFixed(1),
                    ),
                    max: 30,
                  }))
                }
              />
            </div>
          </>
        )}

        {widget.type === "clock" && (
          <>
            <div className="space-y-2">
              <Label htmlFor={`${widget.id}-clock-style`}>Clock Style</Label>
              <select
                id={`${widget.id}-clock-style`}
                className="h-10 w-full rounded-md border border-zinc-600 bg-zinc-950 px-3 text-sm"
                value={widget.clockStyle ?? "digital"}
                onChange={(event) =>
                  onUpdate(widget.id, (current) => ({
                    ...current,
                    clockStyle:
                      event.target.value === "analog" ? "analog" : "digital",
                  }))
                }
              >
                {CLOCK_STYLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${widget.id}-seconds`} className="sr-only">
                Show Seconds
              </Label>
              <div className="rounded-md border border-zinc-800 px-3 py-2">
                <Switch
                  id={`${widget.id}-seconds`}
                  label="Show seconds"
                  checked={widget.showSeconds !== false}
                  onCheckedChange={(checked) =>
                    onUpdate(widget.id, (current) => ({
                      ...current,
                      showSeconds: checked,
                    }))
                  }
                />
              </div>
            </div>
          </>
        )}

        {widget.type === "switch" && (
          <div className="space-y-2">
            <Label htmlFor={`${widget.id}-enabled`} className="sr-only">
              Default State
            </Label>
            <div className="rounded-md border border-zinc-800 px-3 py-2">
              <Switch
                id={`${widget.id}-enabled`}
                label="Default enabled"
                checked={Boolean(widget.enabled)}
                onCheckedChange={(checked) =>
                  onUpdate(widget.id, (current) => ({
                    ...current,
                    enabled: checked,
                  }))
                }
              />
            </div>
          </div>
        )}
      </div>

      {widget.type === "slider" ? (
        <SliderIconPickerDialog
          open={sliderIconPickerOpen}
          selectedIcon={widget.icon ?? SLIDER_ICON_OPTIONS[0].value}
          onClose={() => setSliderIconPickerOpen(false)}
          onSelect={(icon) =>
            onUpdate(widget.id, (current) => ({
              ...current,
              icon,
            }))
          }
        />
      ) : null}
    </Reorder.Item>
  );
}

export default function Home() {
  const [darkMode, setDarkMode] = useLocalStorage(
    "hass.darkMode",
    DEFAULT_BUILD_CONFIG.darkMode,
  );
  const [selectedFont, setSelectedFont] = useLocalStorage<FontName>(
    "hass.layout.font",
    DEFAULT_BUILD_CONFIG.fontName,
  );
  const [pages, setPages] = useLocalStorage<PageConfig[]>(
    "hass.layout.pages",
    DEFAULT_BUILD_CONFIG.pages,
  );
  const [fullRefreshEvery, setFullRefreshEvery] = useLocalStorage<number>(
    "hass.layout.fullRefreshEvery",
    DEFAULT_BUILD_CONFIG.fullRefreshEvery,
  );

  const [savedDevices, setSavedDevices] = useState<SavedDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState("");
  const [deviceStoreReady, setDeviceStoreReady] = useState(false);
  const [editorPageId, setEditorPageId] = useState(
    DEFAULT_BUILD_CONFIG.pages[0]?.id ?? "",
  );

  const buildConfig = useMemo<BuildConfig>(
    () =>
      normalizeBuildConfig({
        darkMode,
        fontName: selectedFont,
        partialRefreshMs: DEFAULT_BUILD_CONFIG.partialRefreshMs,
        fullRefreshEvery,
        pages,
      }),
    [darkMode, fullRefreshEvery, pages, selectedFont],
  );
  const fontClass = useMemo(
    () => getFontClass(buildConfig.fontName),
    [buildConfig.fontName],
  );
  const validSavedDevices = useMemo(
    () =>
      Array.isArray(savedDevices) ? savedDevices.filter(isSavedDevice) : [],
    [savedDevices],
  );
  const activeDevice = useMemo(
    () =>
      validSavedDevices.find((device) => device.id === activeDeviceId) ?? null,
    [activeDeviceId, validSavedDevices],
  );
  const pageCount = buildConfig.pages.length;
  const widgetCount = countWidgets(buildConfig.pages);
  const editorPageIndex = useMemo(() => {
    const index = buildConfig.pages.findIndex(
      (page) => page.id === editorPageId,
    );
    return index >= 0 ? index : 0;
  }, [buildConfig.pages, editorPageId]);
  const editorPage = buildConfig.pages[editorPageIndex] ?? buildConfig.pages[0];

  useEffect(() => {
    if (buildConfig.pages.length === 0) {
      return;
    }
    if (!buildConfig.pages.some((page) => page.id === editorPageId)) {
      setEditorPageId(buildConfig.pages[0].id);
    }
  }, [buildConfig.pages, editorPageId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const rawDevices = window.localStorage.getItem("hass.savedDevices");
      const rawActive = window.localStorage.getItem("hass.activeDeviceId");
      const parsedDevices = rawDevices ? JSON.parse(rawDevices) : [];
      if (Array.isArray(parsedDevices)) {
        setSavedDevices(parsedDevices.filter(isSavedDevice));
      }
      if (typeof rawActive === "string") {
        setActiveDeviceId(rawActive);
      }
    } catch {
      setSavedDevices([]);
      setActiveDeviceId("");
    } finally {
      setDeviceStoreReady(true);
    }
  }, []);

  useEffect(() => {
    if (!deviceStoreReady || typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        "hass.savedDevices",
        JSON.stringify(validSavedDevices),
      );
      window.localStorage.setItem("hass.activeDeviceId", activeDeviceId);
    } catch {
      // ignore persistence issues
    }
  }, [activeDeviceId, deviceStoreReady, validSavedDevices]);

  function handleSaveActiveDevice(device: SavedDevice) {
    setSavedDevices((prev) => {
      const safePrev = Array.isArray(prev) ? prev.filter(isSavedDevice) : [];
      const withoutCurrent = safePrev.filter((entry) => entry.id !== device.id);
      return [device, ...withoutCurrent].slice(0, 10);
    });
    setActiveDeviceId(device.id);
  }

  function updatePages(updater: (current: PageConfig[]) => PageConfig[]) {
    setPages((current) =>
      updater(Array.isArray(current) ? current : DEFAULT_BUILD_CONFIG.pages),
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

  function addWidget(type: WidgetType) {
    if (!editorPage || editorPage.widgets.length >= MAX_WIDGETS_PER_PAGE) {
      return;
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

  const hasActiveDevice = Boolean(activeDevice);

  return (
    <div className={darkMode ? "dark" : ""}>
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                E-Ink Home Assistant Manager
              </h1>
              <p className="text-zinc-400">
                M5PaperS3 + FastEPD with a clear USB-to-OTA workflow
              </p>
            </div>
          </header>

          {/* <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step 1: USB Flash</CardTitle>
                <CardDescription>
                  Build the current layout, flash over USB, then provision Wi-Fi
                  via Improv.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StepStateBadge
                  done={hasActiveDevice}
                  pendingLabel="Pending USB setup"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Step 2: Configure Layout
                </CardTitle>
                <CardDescription>
                  Compose pages, add widgets, and preview the exact OTA layout.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StepStateBadge
                  done={pageCount > 0}
                  pendingLabel="Add your first page"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step 3: OTA Update</CardTitle>
                <CardDescription>
                  Build from the current page set and push it to the active
                  device.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StepStateBadge
                  done={false}
                  pendingLabel={
                    hasActiveDevice ? "Ready for OTA" : "Needs active device"
                  }
                />
              </CardContent>
            </Card>
          </section> */}

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Usb className="h-5 w-5" />
              <h2 className="text-xl font-semibold">
                1. USB Setup & Initial Flash
              </h2>
            </div>
            <UsbFlashCard
              buildConfig={buildConfig}
              onSaveActiveDevice={handleSaveActiveDevice}
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <h2 className="text-xl font-semibold">
                2. Active Device + Interactive Layout
              </h2>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Layout Builder</CardTitle>
                  <CardDescription>
                    Add pages, stack widgets in order, and set the full-refresh
                    cadence. Widget partial refresh stays in firmware logic.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="fontSelect">Font Profile</Label>
                      <select
                        id="fontSelect"
                        className="h-10 w-full rounded-md border border-zinc-600 bg-zinc-950 px-3 text-sm"
                        value={selectedFont}
                        onChange={(event) =>
                          setSelectedFont(event.target.value as FontName)
                        }
                      >
                        {FONT_OPTIONS.map((font) => (
                          <option key={font.name} value={font.name}>
                            {font.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-zinc-500">
                        The selected profile now affects both the browser
                        preview and the on-device text rendering.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullRefreshEvery">
                        Full refresh interval (seconds)
                      </Label>
                      <Input
                        id="fullRefreshEvery"
                        type="number"
                        min={10}
                        step={10}
                        value={fullRefreshEvery}
                        onChange={(event) =>
                          setFullRefreshEvery(Number(event.target.value) || 60)
                        }
                      />
                      <p className="text-xs text-zinc-500">
                        Widgets keep their own partial update cadence between
                        full refreshes.
                      </p>
                    </div>
                    <div className="space-y-2 flex-col flex">
                      <Label htmlFor="fontSelect">Mode</Label>
                      <Button
                        variant="outline"
                        onClick={() => setDarkMode(!darkMode)}
                      >
                        {darkMode ? (
                          <Sun className="mr-2 h-4 w-4" />
                        ) : (
                          <Moon className="mr-2 h-4 w-4" />
                        )}
                        {darkMode ? "Light" : "Dark"} UI
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-100">
                          Pages
                        </p>
                        <p className="text-xs text-zinc-500">
                          {pageCount} page{pageCount === 1 ? "" : "s"} and{" "}
                          {widgetCount} widget{widgetCount === 1 ? "" : "s"} in
                          this layout.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => addPage("standard")}
                        disabled={buildConfig.pages.length >= MAX_PAGES}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Page
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addPage("weather-focus")}
                        disabled={buildConfig.pages.length >= MAX_PAGES}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Weather Page
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addPage("media-player")}
                        disabled={buildConfig.pages.length >= MAX_PAGES}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Media Page
                      </Button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {buildConfig.pages.map((page, index) => (
                        <button
                          key={page.id}
                          type="button"
                          onClick={() => setEditorPageId(page.id)}
                          className={`rounded-full border px-4 py-2 text-sm transition ${
                            page.id === editorPage?.id
                              ? "border-zinc-100 bg-zinc-100 text-zinc-950"
                              : "border-zinc-700 bg-zinc-900/70 text-zinc-300"
                          }`}
                        >
                          {index + 1}. {page.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {editorPage ? (
                    <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                          <Label htmlFor="page-name">Page Name</Label>
                          <Input
                            id="page-name"
                            value={editorPage.name}
                            onChange={(event) =>
                              updateCurrentPage((page) => ({
                                ...page,
                                name: event.target.value || "Untitled Page",
                              }))
                            }
                          />
                        </div>
                        <div className="w-full max-w-xs space-y-2">
                          <Label htmlFor="page-type">Page Type</Label>
                          <select
                            id="page-type"
                            className="h-10 w-full rounded-md border border-zinc-600 bg-zinc-950 px-3 text-sm"
                            value={editorPage.type}
                            onChange={(event) =>
                              updateCurrentPage((page) => {
                                const nextType =
                                  event.target.value === "weather-focus"
                                    ? "weather-focus"
                                    : event.target.value === "media-player"
                                      ? "media-player"
                                    : "standard";
                                if (nextType === "weather-focus" || nextType === "media-player") {
                                  return {
                                    ...page,
                                    type: nextType,
                                    widgets: [],
                                  };
                                }
                                return {
                                  ...page,
                                  type: nextType,
                                  widgets:
                                    page.widgets.length > 0
                                      ? page.widgets
                                      : [
                                          createWidget("clock"),
                                          createWidget("weather"),
                                        ],
                                };
                              })
                            }
                          >
                            {PAGE_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-zinc-500">
                            Weather Focus and Media Player pages use dedicated
                            device render paths instead of the normal widget
                            stack.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removePage(editorPage.id)}
                          disabled={buildConfig.pages.length <= 1}
                          className="mt-7"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Page
                        </Button>
                      </div>

                      {editorPage.type === "weather-focus" ? (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300">
                          <p className="font-medium text-zinc-100">
                            Dedicated weather page
                          </p>
                          <p className="mt-2 text-zinc-400">
                            This page renders a large weather composition on
                            the device instead of normal widgets. It is now
                            optimized for a crisp 1-bit render path.
                          </p>
                        </div>
                      ) : editorPage.type === "media-player" ? (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300">
                          <p className="font-medium text-zinc-100">
                            Dedicated media player page
                          </p>
                          <p className="mt-2 text-zinc-400">
                            This page renders a centered grayscale album view
                            with cover art, runtime progress and playtime. It
                            does not use the normal widget stack.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-zinc-100">
                              Add Widget
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {WIDGET_OPTIONS.map((widgetOption) => (
                                <Button
                                  key={widgetOption.type}
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addWidget(widgetOption.type)}
                                  disabled={
                                    editorPage.widgets.length >=
                                    MAX_WIDGETS_PER_PAGE
                                  }
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  {widgetOption.label}
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-zinc-500">
                              Up to {MAX_WIDGETS_PER_PAGE} widgets per page.
                              Widget order maps directly to the device layout.
                            </p>
                          </div>

                          <Reorder.Group
                            axis="y"
                            values={editorPage.widgets.map(
                              (widget) => widget.id,
                            )}
                            onReorder={reorderWidgets}
                            className="space-y-3"
                          >
                            <AnimatePresence initial={false}>
                              {editorPage.widgets.map((widget, widgetIndex) => (
                                <EditableWidgetCard
                                  key={widget.id}
                                  widget={widget}
                                  widgetIndex={widgetIndex}
                                  widgetsCount={editorPage.widgets.length}
                                  onRemove={removeWidget}
                                  onUpdate={updateWidget}
                                />
                              ))}
                            </AnimatePresence>
                          </Reorder.Group>
                        </>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Live Preview</CardTitle>
                    <CardDescription>
                      {editorPage?.name ?? "Preview"} · {buildConfig.fontName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DevicePreview
                      darkMode={buildConfig.darkMode}
                      fontClass={fontClass}
                      pages={buildConfig.pages}
                      activePageIndex={editorPageIndex}
                      onPageChange={(pageIndex) =>
                        setEditorPageId(
                          buildConfig.pages[pageIndex]?.id ?? editorPageId,
                        )
                      }
                    />
                  </CardContent>
                </Card>
                <OtaFlashCard
                  buildConfig={buildConfig}
                  devices={validSavedDevices}
                  activeDeviceId={activeDeviceId}
                  onActiveDeviceChange={setActiveDeviceId}
                />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
