"use client";

import { Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";

import { DevicePreview } from "@/components/dashboard/device-preview";
import { HomeAssistantCard } from "@/components/dashboard/home-assistant-card";
import { LayoutEditorCard } from "@/components/dashboard/layout-editor-card";
import { MdiIcon } from "@/components/dashboard/mdi-icon";
import { OtaFlashCard } from "@/components/dashboard/ota-flash";
import { UsbFlashCard } from "@/components/dashboard/usb-flash";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useHomeAssistantLiveStates } from "@/hooks/use-home-assistant-live-states";
import { useHomeAssistantSessionConfig } from "@/hooks/use-home-assistant-session-config";
import { useLayoutEditor } from "@/hooks/use-layout-editor";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useRuntimeInfo } from "@/hooks/use-runtime-info";
import { useSavedDevices } from "@/hooks/use-saved-devices";
import { useTextWidgetMqttValidation } from "@/hooks/use-text-widget-mqtt-validation";
import {
  DEFAULT_BUILD_CONFIG,
  FONT_OPTIONS,
  getClockFontClass,
  getFontClass,
  getFirmwareFontName,
  normalizeBuildConfig,
  type BuildConfig,
  type FontName,
  type PageConfig,
} from "@/lib/layout-config";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [darkMode, setDarkMode] = useLocalStorage(
    "hass.darkMode",
    DEFAULT_BUILD_CONFIG.darkMode,
  );
  const [hideWidgetBorders, setHideWidgetBorders] = useLocalStorage(
    "hass.layout.hideWidgetBorders",
    DEFAULT_BUILD_CONFIG.hideWidgetBorders,
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
  const [homeAssistant, setHomeAssistant] = useHomeAssistantSessionConfig();
  const {
    activeDevice,
    activeDeviceId,
    handleDeleteActiveDevice,
    handleSaveActiveDevice,
    setActiveDeviceId,
    setShowUsbSetup,
    showUsbOnboarding,
    showUsbSetup,
    validSavedDevices,
  } = useSavedDevices();
  const [themeModeReady, setThemeModeReady] = useState(false);
  const { appBasePath, resolveBrowserAppPath, runtimeInfo } = useRuntimeInfo();

  const buildConfig = useMemo<BuildConfig>(
    () =>
      normalizeBuildConfig({
        darkMode,
        hideWidgetBorders,
        fontName: getFirmwareFontName(selectedFont),
        partialRefreshMs: DEFAULT_BUILD_CONFIG.partialRefreshMs,
        fullRefreshEvery,
        homeAssistant,
        pages,
      }),
    [
      darkMode,
      fullRefreshEvery,
      hideWidgetBorders,
      homeAssistant,
      pages,
      selectedFont,
    ],
  );
  const fontClass = useMemo(() => getFontClass(selectedFont), [selectedFont]);
  const clockFontClass = useMemo(
    () => getClockFontClass(selectedFont),
    [selectedFont],
  );
  const {
    boundEntityCount,
    homeAssistantConnectionReady,
    homeAssistantRequestConfig,
    homeAssistantStates,
  } = useHomeAssistantLiveStates({
    buildConfig,
    resolveBrowserAppPath,
    runtimeInfo,
  });
  const { textWidgetMqttValidationById } = useTextWidgetMqttValidation({
    homeAssistantConnectionReady,
    homeAssistantRequestConfig,
    pages: buildConfig.pages,
    resolveBrowserAppPath,
  });
  const {
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
    setMediaPlayerBindingSlotsByPageId,
    updateCurrentPage,
    updateWidget,
  } = useLayoutEditor({
    buildConfig,
    darkMode,
    fullRefreshEvery,
    hideWidgetBorders,
    homeAssistant,
    selectedFont,
    setPages,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setThemeModeReady(true), 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <main className="min-h-screen text-foreground">
      <div className="mx-auto flex w-full max-w-350 flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="rounded-4xl border border-border-strong bg-panel px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              E-Ink Frame Configurator
            </h1>
            <div className="min-w-40">
              <Label htmlFor="site-theme" className="sr-only">
                Site theme
              </Label>
              <Select
                value={themeModeReady ? (theme ?? "system") : "system"}
                onValueChange={(value) =>
                  setTheme(value as "light" | "dark" | "system")
                }
              >
                <SelectTrigger id="site-theme" aria-label="Site theme mode">
                  <SelectValue placeholder="Theme mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">
                    <span className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span>System</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="light">
                    <span className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      <span>Light</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="dark">
                    <span className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      <span>Dark</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card>
            <CardHeader className="h-18 border-b border-border bg-panel-strong flex justify-center">
              <CardTitle>Device</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-3">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Device</span>
                  <Select
                    value={activeDeviceId || undefined}
                    onValueChange={setActiveDeviceId}
                  >
                    <SelectTrigger aria-label="Device">
                      <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent>
                      {validSavedDevices.map((device) => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name} ({device.ip})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <Button
                  type="button"
                  variant={showUsbSetup ? "secondary" : "outline"}
                  onClick={() => setShowUsbSetup((current) => !current)}
                >
                  <MdiIcon icon="usb-port" className="mr-2 h-4 w-4" />
                  {/* <Usb className="mr-2 h-4 w-4" /> */}
                  {showUsbSetup ? "Hide USB" : "New"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDeleteActiveDevice}
                  disabled={!activeDevice}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>

          <HomeAssistantCard
            appBasePath={appBasePath}
            value={homeAssistant}
            onChange={setHomeAssistant}
            boundEntityCount={boundEntityCount}
            addonMode={runtimeInfo.addonMode}
            supervisorConnected={runtimeInfo.supervisorConnected}
            hasDeviceHomeAssistantDefaults={
              runtimeInfo.hasDeviceHomeAssistantDefaults
            }
            deviceHomeAssistantUrl={runtimeInfo.deviceHomeAssistantUrl}
            deviceHomeAssistantUrlSource={
              runtimeInfo.deviceHomeAssistantUrlSource
            }
          />
        </section>

        {showUsbOnboarding ? (
          <UsbFlashCard
            appBasePath={appBasePath}
            onSaveActiveDevice={handleSaveActiveDevice}
          />
        ) : null}

        {activeDevice ? (
          <>
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
              <div className="space-y-4">
                <Card>
                  <CardContent className="grid gap-3 pt-6 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="fontSelect">Font</Label>
                      <Select
                        value={selectedFont}
                        onValueChange={(value) =>
                          setSelectedFont(value as FontName)
                        }
                      >
                        <SelectTrigger id="fontSelect">
                          <SelectValue placeholder="Select font" />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map((font) => (
                            <SelectItem key={font.name} value={font.name}>
                              {font.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fullRefreshEvery">Refresh (s)</Label>
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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>

                      <div className="rounded-2xl border border-border bg-panel-subtle px-4 py-2">
                        <Switch
                          id="theme"
                          label={`${darkMode ? "Dark" : "Light"}`}
                          ariaLabel={`Preview mode: ${
                            darkMode ? "Dark" : "Light"
                          }`}
                          checked={darkMode}
                          onCheckedChange={setDarkMode}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="widgetBorders">Widget Borders</Label>

                      <div className="rounded-2xl border border-border bg-panel-subtle px-4 py-2">
                        <Switch
                          id="widgetBorders"
                          label={`${hideWidgetBorders ? "Hidden" : "Shown"}`}
                          ariaLabel={`Widget borders: ${
                            hideWidgetBorders ? "Hidden" : "Shown"
                          }`}
                          checked={hideWidgetBorders}
                          onCheckedChange={setHideWidgetBorders}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <LayoutEditorCard
                  appBasePath={appBasePath}
                  pages={buildConfig.pages}
                  editorPage={editorPage}
                  editorMediaPlayerBindings={editorMediaPlayerBindings}
                  editorMediaPlayerBindingSlotCount={
                    editorMediaPlayerBindingSlotCount
                  }
                  homeAssistant={homeAssistant}
                  homeAssistantRequestConfig={homeAssistantRequestConfig}
                  homeAssistantConnectionReady={homeAssistantConnectionReady}
                  homeAssistantManagedByAddon={runtimeInfo.addonMode}
                  textWidgetMqttValidationById={
                    textWidgetMqttValidationById
                  }
                  onAddPage={addPage}
                  onSelectPage={setEditorPageId}
                  onRemovePage={removePage}
                  onReorderPages={reorderPages}
                  onUpdateCurrentPage={updateCurrentPage}
                  onAddWidget={addWidget}
                  onUpdateWidget={updateWidget}
                  onRemoveWidget={removeWidget}
                  onReorderWidgets={reorderWidgets}
                  setMediaPlayerBindingSlotsByPageId={
                    setMediaPlayerBindingSlotsByPageId
                  }
                />
              </div>

              <div className="h-fit xl:sticky xl:top-4">
                <Card className="overflow-hidden">
                  <CardHeader className="border-b border-border bg-panel-strong">
                    <CardTitle>Live Preview</CardTitle>
                  </CardHeader>

                  <CardContent className="pt-6">
                    <div className="rounded-4xl border border-border bg-panel-strong p-4">
                      <DevicePreview
                        appBasePath={appBasePath}
                        darkMode={buildConfig.darkMode}
                        hideWidgetBorders={buildConfig.hideWidgetBorders}
                        fontClass={fontClass}
                        clockFontClass={clockFontClass}
                        pages={buildConfig.pages}
                        homeAssistantConfig={buildConfig.homeAssistant}
                        homeAssistantStates={homeAssistantStates}
                        activePageIndex={editorPageIndex}
                        onPageChange={(pageIndex) =>
                          setEditorPageId(
                            buildConfig.pages[pageIndex]?.id ?? editorPageId,
                          )
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            <OtaFlashCard
              appBasePath={appBasePath}
              buildConfig={buildConfig}
              activeDevice={activeDevice}
            />
          </>
        ) : null}
      </div>
    </main>
  );
}
