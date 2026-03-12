"use client";

import {
  CheckCircle2,
  Moon,
  Palette,
  Plus,
  Sun,
  Trash2,
  Usb,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DevicePreview } from "@/components/dashboard/device-preview";
import { OtaFlashCard } from "@/components/dashboard/ota-flash";
import { UsbFlashCard } from "@/components/dashboard/usb-flash";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  countWidgets,
  createPage,
  createWidget,
  DEFAULT_BUILD_CONFIG,
  FONT_OPTIONS,
  getFontClass,
  MAX_PAGES,
  MAX_WIDGETS_PER_PAGE,
  normalizeBuildConfig,
  type BuildConfig,
  type FontName,
  type PageConfig,
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

function StepStateBadge({ done, pendingLabel }: StepStateBadgeProps) {
  return done ? (
    <Badge className="border-emerald-500/50 bg-emerald-500/10 text-emerald-300">
      <CheckCircle2 className="mr-1 h-3 w-3" /> Done
    </Badge>
  ) : (
    <Badge className="border-zinc-600 text-zinc-300">{pendingLabel}</Badge>
  );
}

function moveItem<T>(items: T[], fromIndex: number, direction: -1 | 1) {
  const toIndex = fromIndex + direction;
  if (toIndex < 0 || toIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export default function Home() {
  const [darkMode, setDarkMode] = useLocalStorage("hass.darkMode", DEFAULT_BUILD_CONFIG.darkMode);
  const [selectedFont, setSelectedFont] = useLocalStorage<FontName>("hass.layout.font", DEFAULT_BUILD_CONFIG.fontName);
  const [pages, setPages] = useLocalStorage<PageConfig[]>("hass.layout.pages", DEFAULT_BUILD_CONFIG.pages);
  const [fullRefreshEvery, setFullRefreshEvery] = useLocalStorage<number>(
    "hass.layout.fullRefreshEvery",
    DEFAULT_BUILD_CONFIG.fullRefreshEvery,
  );

  const [savedDevices, setSavedDevices] = useState<SavedDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState("");
  const [deviceStoreReady, setDeviceStoreReady] = useState(false);
  const [editorPageId, setEditorPageId] = useState(DEFAULT_BUILD_CONFIG.pages[0]?.id ?? "");

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
  const fontClass = useMemo(() => getFontClass(buildConfig.fontName), [buildConfig.fontName]);
  const validSavedDevices = useMemo(
    () => (Array.isArray(savedDevices) ? savedDevices.filter(isSavedDevice) : []),
    [savedDevices],
  );
  const activeDevice = useMemo(
    () => validSavedDevices.find((device) => device.id === activeDeviceId) ?? null,
    [activeDeviceId, validSavedDevices],
  );
  const pageCount = buildConfig.pages.length;
  const widgetCount = countWidgets(buildConfig.pages);
  const editorPageIndex = useMemo(() => {
    const index = buildConfig.pages.findIndex((page) => page.id === editorPageId);
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
      window.localStorage.setItem("hass.savedDevices", JSON.stringify(validSavedDevices));
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
    setPages((current) => updater(Array.isArray(current) ? current : DEFAULT_BUILD_CONFIG.pages));
  }

  function updateCurrentPage(updater: (page: PageConfig) => PageConfig) {
    if (!editorPage) {
      return;
    }
    updatePages((current) =>
      current.map((page) => (page.id === editorPage.id ? updater(page) : page)),
    );
  }

  function addPage() {
    if (buildConfig.pages.length >= MAX_PAGES) {
      return;
    }
    const nextPage = createPage(buildConfig.pages.length);
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
      widgets: [...page.widgets, createWidget(type, page.widgets.filter((widget) => widget.type === type).length)],
    }));
  }

  function updateWidget(widgetId: string, updater: (widget: WidgetConfig) => WidgetConfig) {
    updateCurrentPage((page) => ({
      ...page,
      widgets: page.widgets.map((widget) => (widget.id === widgetId ? updater(widget) : widget)),
    }));
  }

  function removeWidget(widgetId: string) {
    updateCurrentPage((page) => ({
      ...page,
      widgets: page.widgets.filter((widget) => widget.id !== widgetId),
    }));
  }

  function moveWidget(widgetId: string, direction: -1 | 1) {
    updateCurrentPage((page) => {
      const index = page.widgets.findIndex((widget) => widget.id === widgetId);
      return {
        ...page,
        widgets: moveItem(page.widgets, index, direction),
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
              <h1 className="text-3xl font-semibold tracking-tight">E-Ink Home Assistant Manager</h1>
              <p className="text-zinc-400">M5PaperS3 + FastEPD with a clear USB-to-OTA workflow</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>grayscale</Badge>
              <Badge>touch</Badge>
              <Badge>OTA</Badge>
              <Button variant="outline" onClick={() => setDarkMode(!darkMode)}>
                {darkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                {darkMode ? "Light" : "Dark"} UI
              </Button>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step 1: USB Flash</CardTitle>
                <CardDescription>Build the current layout, flash over USB, then provision Wi-Fi via Improv.</CardDescription>
              </CardHeader>
              <CardContent>
                <StepStateBadge done={hasActiveDevice} pendingLabel="Pending USB setup" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step 2: Configure Layout</CardTitle>
                <CardDescription>Compose pages, add widgets, and preview the exact OTA layout.</CardDescription>
              </CardHeader>
              <CardContent>
                <StepStateBadge done={pageCount > 0} pendingLabel="Add your first page" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step 3: OTA Update</CardTitle>
                <CardDescription>Build from the current page set and push it to the active device.</CardDescription>
              </CardHeader>
              <CardContent>
                <StepStateBadge done={false} pendingLabel={hasActiveDevice ? "Ready for OTA" : "Needs active device"} />
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Usb className="h-5 w-5" />
              <h2 className="text-xl font-semibold">1. USB Setup & Initial Flash</h2>
            </div>
            <UsbFlashCard buildConfig={buildConfig} onSaveActiveDevice={handleSaveActiveDevice} />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <h2 className="text-xl font-semibold">2. Active Device + Interactive Layout</h2>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Layout Builder</CardTitle>
                  <CardDescription>
                    Add pages, stack widgets in order, and set the full-refresh cadence. Widget partial refresh stays in
                    firmware logic.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fontSelect">Font Profile</Label>
                      <select
                        id="fontSelect"
                        className="h-10 w-full rounded-md border border-zinc-600 bg-zinc-950 px-3 text-sm"
                        value={selectedFont}
                        onChange={(event) => setSelectedFont(event.target.value as FontName)}
                      >
                        {FONT_OPTIONS.map((font) => (
                          <option key={font.name} value={font.name}>
                            {font.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-zinc-500">
                        The selected profile now affects both the browser preview and the on-device text rendering.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullRefreshEvery">Full refresh interval (seconds)</Label>
                      <Input
                        id="fullRefreshEvery"
                        type="number"
                        min={10}
                        step={10}
                        value={fullRefreshEvery}
                        onChange={(event) => setFullRefreshEvery(Number(event.target.value) || 60)}
                      />
                      <p className="text-xs text-zinc-500">Widgets keep their own partial update cadence between full refreshes.</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-100">Pages</p>
                        <p className="text-xs text-zinc-500">
                          {pageCount} page{pageCount === 1 ? "" : "s"} and {widgetCount} widget{widgetCount === 1 ? "" : "s"} in this layout.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={addPage}
                        disabled={buildConfig.pages.length >= MAX_PAGES}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Page
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
                              updateCurrentPage((page) => ({ ...page, name: event.target.value || "Untitled Page" }))
                            }
                          />
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

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-zinc-100">Add Widget</p>
                        <div className="flex flex-wrap gap-2">
                          {WIDGET_OPTIONS.map((widgetOption) => (
                            <Button
                              key={widgetOption.type}
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addWidget(widgetOption.type)}
                              disabled={editorPage.widgets.length >= MAX_WIDGETS_PER_PAGE}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              {widgetOption.label}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-zinc-500">
                          Up to {MAX_WIDGETS_PER_PAGE} widgets per page. Widget order maps directly to the device layout.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {editorPage.widgets.map((widget, widgetIndex) => (
                          <div key={widget.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-zinc-100">
                                  {widgetIndex + 1}. {WIDGET_OPTIONS.find((entry) => entry.type === widget.type)?.label ?? widget.type}
                                </p>
                                <p className="text-xs text-zinc-500">Type: {widget.type}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => moveWidget(widget.id, -1)}
                                  disabled={widgetIndex === 0}
                                >
                                  Up
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => moveWidget(widget.id, 1)}
                                  disabled={widgetIndex === editorPage.widgets.length - 1}
                                >
                                  Down
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => removeWidget(widget.id)}>
                                  Remove
                                </Button>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor={`${widget.id}-label`}>Label</Label>
                                <Input
                                  id={`${widget.id}-label`}
                                  value={widget.label}
                                  onChange={(event) =>
                                    updateWidget(widget.id, (current) => ({ ...current, label: event.target.value }))
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
                                      updateWidget(widget.id, (current) => ({
                                        ...current,
                                        value: Math.max(0, Math.min(100, Number(event.target.value) || 0)),
                                        max: 100,
                                      }))
                                    }
                                  />
                                </div>
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
                                        updateWidget(widget.id, (current) => ({ ...current, enabled: checked }))
                                      }
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Device</CardTitle>
                    <CardDescription>Target used for OTA updates.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-zinc-300">
                    {activeDevice ? (
                      <>
                        <p>
                          <span className="text-zinc-400">Name:</span> {activeDevice.name}
                        </p>
                        <p>
                          <span className="text-zinc-400">IP:</span> {activeDevice.ip}
                        </p>
                      </>
                    ) : (
                      <p>No active device yet. Complete step 1 first.</p>
                    )}
                  </CardContent>
                </Card>

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
                      onPageChange={(pageIndex) => setEditorPageId(buildConfig.pages[pageIndex]?.id ?? editorPageId)}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              <h2 className="text-xl font-semibold">3. OTA Update To Active Device</h2>
            </div>
            <OtaFlashCard
              buildConfig={buildConfig}
              devices={validSavedDevices}
              activeDeviceId={activeDeviceId}
              onActiveDeviceChange={setActiveDeviceId}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
