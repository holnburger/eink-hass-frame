"use client";

import {
  GripVertical,
  Monitor,
  Moon,
  Plus,
  Search,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, Reorder, useDragControls } from "motion/react";
import { useTheme } from "next-themes";

import { DevicePreview } from "@/components/dashboard/device-preview";
import { HomeAssistantCard } from "@/components/dashboard/home-assistant-card";
import { HomeAssistantEntityPicker } from "@/components/dashboard/home-assistant-entity-picker";
import {
  formatMdiIconLabel,
  getAllMdiIconNames,
  MdiIcon,
} from "@/components/dashboard/mdi-icon";
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
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  collectBoundEntityIds,
  collectThermostatHistoryEntityIds,
  DEFAULT_HOME_ASSISTANT_CONFIG,
  getCompatibleDomainsForPage,
  getCompatibleDomainsForWidget,
  isHomeAssistantConfigured,
  pageSupportsHomeAssistant,
  type HomeAssistantEntityState,
  type HomeAssistantConfig,
  widgetSupportsHomeAssistant,
} from "@/lib/home-assistant";
import {
  CLOCK_STYLE_OPTIONS,
  createPageOfType,
  createWidget,
  DEFAULT_BUILD_CONFIG,
  FONT_OPTIONS,
  getClockFontClass,
  getFontClass,
  getFirmwareFontName,
  getTextWidgetMqttEntityId,
  MAX_PAGES,
  MAX_WIDGETS_PER_PAGE,
  normalizeTextWidgetMqttName,
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
import {
  DEFAULT_APP_RUNTIME_INFO,
  type AppRuntimeInfo,
} from "@/lib/runtime-info";

type SavedDevice = {
  id: string;
  name: string;
  ip: string;
  lastSeen: string;
};

const textareaClassName =
  "min-h-24 w-full rounded-2xl border border-border-strong bg-input px-4 py-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-border-strong";
// Reused surface tokens keep the configurator styling consistent across sections.
const mutedPanelClass = "rounded-3xl border border-border bg-panel-subtle";
const raisedPanelClass = "rounded-3xl border border-border bg-panel";
const compactMutedPanelClass =
  "rounded-2xl border border-border bg-panel-subtle";

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

type EditableWidgetCardProps = {
  widget: WidgetConfig;
  widgetIndex: number;
  homeAssistant: HomeAssistantConfig;
  homeAssistantRequestConfig: HomeAssistantConfig;
  homeAssistantConnectionReady: boolean;
  homeAssistantManagedByAddon?: boolean;
  textWidgetMqttValidation?: {
    entityId: string;
    invalidReason?: string;
    duplicateInLayout?: boolean;
    existsInHomeAssistant?: boolean;
    checking?: boolean;
    lookupError?: string;
  };
  onRemove: (widgetId: string) => void;
  onUpdate: (
    widgetId: string,
    updater: (widget: WidgetConfig) => WidgetConfig,
  ) => void;
};

type EditablePageTabProps = {
  page: PageConfig;
  index: number;
  selected: boolean;
  onSelect: () => void;
};

type SliderIconPickerDialogProps = {
  open: boolean;
  selectedIcon: SliderIconName;
  title: string;
  onClose: () => void;
  onSelect: (icon: SliderIconName) => void;
};

function SliderIconPickerDialog({
  open,
  selectedIcon,
  title,
  onClose,
  onSelect,
}: SliderIconPickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const allMdiIconNames = useMemo(() => getAllMdiIconNames(), []);
  const presetIconValues = useMemo<Set<string>>(
    () => new Set<string>(SLIDER_ICON_OPTIONS.map((option) => option.value)),
    [],
  );
  const normalizedQuery = searchQuery
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  const selectedPreset = SLIDER_ICON_OPTIONS.find(
    (option) => option.value === selectedIcon,
  );
  const selectedLabel =
    selectedPreset?.label ?? formatMdiIconLabel(selectedIcon);
  const searchResults = useMemo(() => {
    if (normalizedQuery.length === 0) {
      return [];
    }

    const rankedResults = allMdiIconNames
      .map((iconName) => {
        const normalizedName = iconName.toLowerCase();
        const formattedLabel = formatMdiIconLabel(iconName).toLowerCase();
        const startsWith = normalizedName.startsWith(normalizedQuery);
        const labelStartsWith = formattedLabel.startsWith(
          normalizedQuery.replace(/-/g, " "),
        );
        const matches =
          startsWith ||
          labelStartsWith ||
          normalizedName.includes(normalizedQuery) ||
          formattedLabel.includes(normalizedQuery.replace(/-/g, " "));
        if (!matches) {
          return null;
        }
        return {
          iconName,
          rank: startsWith || labelStartsWith ? 0 : 1,
          label: formatMdiIconLabel(iconName),
        };
      })
      .filter(
        (result): result is { iconName: string; rank: number; label: string } =>
          result !== null,
      )
      .sort((left, right) =>
        left.rank !== right.rank
          ? left.rank - right.rank
          : left.iconName.localeCompare(right.iconName),
      );

    return rankedResults.slice(0, 60);
  }, [allMdiIconNames, normalizedQuery]);
  const showCustomSelection =
    selectedIcon.trim().length > 0 && !presetIconValues.has(selectedIcon);

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <div
            className="w-full max-w-lg rounded-4xl border border-border-strong bg-panel p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick from the presets or search the full MDI set. The selected
                  icon is used in both the preview and firmware build.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-panel text-muted-foreground transition hover:border-foreground hover:text-foreground"
                aria-label="Close icon picker"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <Label htmlFor="mdi-icon-search" className="sr-only">
                Search all MDI icons
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="mdi-icon-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search the full MDI set"
                  className="pl-10"
                />
              </div>
            </div>

            {showCustomSelection ? (
              <div className={`mt-4 p-3 ${mutedPanelClass}`}>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Selected icon
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(selectedIcon);
                    onClose();
                  }}
                  className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-border-strong bg-panel p-3 text-left text-foreground transition hover:border-foreground"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-panel-strong">
                    <MdiIcon
                      icon={selectedIcon}
                      size={18}
                      className="h-[1.05rem] w-[1.05rem]"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {selectedLabel}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {selectedIcon}
                    </span>
                  </span>
                </button>
              </div>
            ) : null}

            <div className="mt-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Quick picks
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                    className={`rounded-2xl border p-3 text-left transition ${
                      isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border-strong bg-panel text-foreground hover:border-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                          isSelected
                            ? "border-white/20 bg-white/10"
                            : "border-border-strong bg-panel-strong"
                        }`}
                      >
                        <MdiIcon
                          icon={option.value}
                          size={18}
                          className="h-[1.05rem] w-[1.05rem]"
                        />
                      </span>
                      <span className="text-sm font-medium">
                        {option.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {normalizedQuery.length > 0 ? (
              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Search results
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {searchResults.length === 0
                      ? "No icons found"
                      : `${searchResults.length} shown`}
                  </p>
                </div>
                {searchResults.length > 0 ? (
                  <div className="mt-3 grid max-h-80 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
                    {searchResults.map((result) => {
                      const isSelected = result.iconName === selectedIcon;
                      return (
                        <button
                          key={result.iconName}
                          type="button"
                          onClick={() => {
                            onSelect(result.iconName);
                            onClose();
                          }}
                          className={`rounded-2xl border p-3 text-left transition ${
                            isSelected
                              ? "border-foreground bg-foreground text-background"
                              : "border-border-strong bg-panel text-foreground hover:border-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                                isSelected
                                  ? "border-white/20 bg-white/10"
                                  : "border-border-strong bg-panel-strong"
                              }`}
                            >
                              <MdiIcon
                                icon={result.iconName}
                                size={18}
                                className="h-[1.05rem] w-[1.05rem]"
                              />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">
                                {result.label}
                              </span>
                              <span
                                className={`mt-0.5 block truncate text-xs ${
                                  isSelected
                                    ? "text-white/75"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {result.iconName}
                              </span>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function EditablePageTab({
  page,
  index,
  selected,
  onSelect,
}: EditablePageTabProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={page.id}
      dragListener={false}
      dragControls={dragControls}
      layout
      className="list-none shrink-0"
    >
      <div
        className={`group flex min-w-36 items-center rounded-full border transition ${
          selected
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-panel text-muted-foreground hover:border-border-strong hover:bg-panel-subtle"
        }`}
      >
        <button
          type="button"
          onPointerDown={(event) => dragControls.start(event)}
          className={`flex h-10 w-9 items-center justify-center rounded-l-full border-r transition ${
            selected
              ? "border-white/15 text-white/75 hover:text-white"
              : "border-border text-muted-foreground group-hover:text-foreground"
          }`}
          aria-label={`Reorder ${page.name}`}
          title="Drag to reorder page"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 truncate px-3.5 py-2 text-left text-sm font-medium"
        >
          {index + 1}. {page.name}
        </button>
      </div>
    </Reorder.Item>
  );
}

function EditableWidgetCard({
  widget,
  widgetIndex,
  homeAssistant,
  homeAssistantRequestConfig,
  homeAssistantConnectionReady,
  homeAssistantManagedByAddon = false,
  textWidgetMqttValidation,
  onRemove,
  onUpdate,
}: EditableWidgetCardProps) {
  const dragControls = useDragControls();
  const [sliderIconPickerOpen, setSliderIconPickerOpen] = useState(false);
  const sliderIconOption =
    widget.type === "slider" || widget.type === "button"
      ? SLIDER_ICON_OPTIONS.find((option) => option.value === widget.icon)
      : null;
  const sliderIconLabel =
    widget.type === "slider" || widget.type === "button"
      ? (sliderIconOption?.label ??
        formatMdiIconLabel(widget.icon ?? SLIDER_ICON_OPTIONS[0].value))
      : "";
  const textWidgetEntityId = textWidgetMqttValidation?.entityId ?? "";

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
      className={`${raisedPanelClass} p-4`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onPointerDown={(event) => dragControls.start(event)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-panel-strong text-muted-foreground transition hover:border-foreground hover:text-foreground"
            aria-label={`Drag ${widget.label}`}
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <p className="text-sm font-medium text-foreground">
            {WIDGET_OPTIONS.find((entry) => entry.type === widget.type)
              ?.label ?? widget.type}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(widget.id)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-panel text-muted-foreground transition hover:border-red-700 hover:text-red-700"
          aria-label={`Delete ${widget.label}`}
          title="Delete widget"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div
        className={`mt-4 grid gap-4 items-end ${
          widget.type === "text" || widget.type === "title"
            ? "md:grid-cols-1"
            : "md:grid-cols-3"
        }`}
      >
        <div className="space-y-2">
          <Label htmlFor={`${widget.id}-label`}>
            {widget.type === "text"
              ? "Text"
              : widget.type === "title"
                ? "Title"
                : "Label"}
          </Label>
          {widget.type === "text" ? (
            <textarea
              id={`${widget.id}-label`}
              value={widget.label}
              rows={3}
              className={textareaClassName}
              onChange={(event) =>
                onUpdate(widget.id, (current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
            />
          ) : (
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
          )}
        </div>

        {(widget.type === "slider" || widget.type === "button") && (
          <div className="space-y-2">
            <Label>Icon</Label>
            <button
              type="button"
              onClick={() => setSliderIconPickerOpen(true)}
              className="flex h-11 w-full items-center justify-between rounded-2xl border border-border-strong bg-panel px-4 text-sm text-foreground transition hover:border-foreground"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-panel-strong">
                  <MdiIcon
                    icon={widget.icon ?? SLIDER_ICON_OPTIONS[0].value}
                    size={16}
                    className="h-4 w-4"
                  />
                </span>
                <span>{sliderIconLabel}</span>
              </span>
            </button>
          </div>
        )}

        {(widget.type === "slider" || widget.type === "button") && (
          <div className="space-y-2">
            <Label htmlFor={`${widget.id}-invert-logic`} className="sr-only">
              Invert logic
            </Label>
            <div className={`${compactMutedPanelClass} px-4 py-2.5`}>
              <Switch
                id={`${widget.id}-invert-logic`}
                label="Invert logic"
                checked={widget.invert === true}
                onCheckedChange={(checked) =>
                  onUpdate(widget.id, (current) => ({
                    ...current,
                    invert: checked,
                  }))
                }
              />
            </div>
          </div>
        )}

        {widget.type === "thermostat" && (
          <div className="space-y-2">
            <Label htmlFor={`${widget.id}-history-graph`} className="sr-only">
              Show temperature history graph
            </Label>
            <div className={`${compactMutedPanelClass} px-2 py-2.5`}>
              <Switch
                id={`${widget.id}-history-graph`}
                label="History graph"
                checked={widget.showHistoryGraph === true}
                onCheckedChange={(checked) =>
                  onUpdate(widget.id, (current) => ({
                    ...current,
                    showHistoryGraph: checked,
                  }))
                }
              />
            </div>
          </div>
        )}

        {widget.type === "progress" && (
          <div className="space-y-2 col-span-2">
            <Label
              htmlFor={`${widget.id}-hide-when-unavailable`}
              className="sr-only"
            >
              Hide when entity is unavailable
            </Label>
            <div className={`${compactMutedPanelClass} p-2.5`}>
              <Switch
                id={`${widget.id}-hide-when-unavailable`}
                label="Hide if unavailable"
                checked={widget.hideWhenUnavailable === true}
                onCheckedChange={(checked) =>
                  onUpdate(widget.id, (current) => ({
                    ...current,
                    hideWhenUnavailable: checked,
                  }))
                }
              />
            </div>
          </div>
        )}

        {widget.type === "clock" && (
          <>
            <div className="space-y-2">
              <Label htmlFor={`${widget.id}-clock-style`}>Style</Label>
              <Select
                value={widget.clockStyle ?? "digital"}
                onValueChange={(value) =>
                  onUpdate(widget.id, (current) => ({
                    ...current,
                    clockStyle: value === "analog" ? "analog" : "digital",
                  }))
                }
              >
                <SelectTrigger id={`${widget.id}-clock-style`}>
                  <SelectValue placeholder="Style" />
                </SelectTrigger>
                <SelectContent>
                  {CLOCK_STYLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${widget.id}-seconds`} className="sr-only">
                Show Seconds
              </Label>
              <div className={`${compactMutedPanelClass} px-4 py-2.5`}>
                <Switch
                  id={`${widget.id}-seconds`}
                  label="Seconds"
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
      </div>

      {widgetSupportsHomeAssistant(widget.type) ? (
        <div className="mt-4">
          <HomeAssistantEntityPicker
            homeAssistant={homeAssistant}
            requestHomeAssistant={homeAssistantRequestConfig}
            connectionReady={homeAssistantConnectionReady}
            managedByAddon={homeAssistantManagedByAddon}
            supportedDomains={getCompatibleDomainsForWidget(widget.type)}
            value={widget.homeAssistant}
            onChange={(homeAssistantBinding) =>
              onUpdate(widget.id, (current) => ({
                ...current,
                homeAssistant: homeAssistantBinding,
              }))
            }
          />
        </div>
      ) : null}
      {widget.type === "text" ? (
        <div className="space-y-3">
          <Label htmlFor={`${widget.id}-mqtt-expose`} className="sr-only">
            Expose text widget via MQTT
          </Label>
          <div className={`${compactMutedPanelClass} px-4 py-3`}>
            <Switch
              id={`${widget.id}-mqtt-expose`}
              label="MQTT input"
              checked={widget.mqttExpose === true}
              onCheckedChange={(checked) =>
                onUpdate(widget.id, (current) => ({
                  ...current,
                  mqttExpose: checked,
                  mqttName:
                    checked &&
                    normalizeTextWidgetMqttName(current.mqttName).length === 0
                      ? normalizeTextWidgetMqttName(current.label) ||
                        `text_${widgetIndex + 1}`
                      : normalizeTextWidgetMqttName(current.mqttName),
                }))
              }
            />
          </div>

          {widget.mqttExpose === true ? (
            <div className="space-y-2">
              <Label className="col-span-1" htmlFor={`${widget.id}-mqtt-name`}>
                MQTT Name
              </Label>
              <Input
                id={`${widget.id}-mqtt-name`}
                value={widget.mqttName ?? ""}
                maxLength={48}
                placeholder="welcome_home"
                onChange={(event) =>
                  onUpdate(widget.id, (current) => ({
                    ...current,
                    mqttName: normalizeTextWidgetMqttName(event.target.value),
                  }))
                }
              />
              {textWidgetEntityId ? (
                <p className="text-xs font-mono text-muted-foreground">
                  {textWidgetEntityId}
                </p>
              ) : null}
              {textWidgetMqttValidation?.invalidReason ? (
                <p className="text-xs text-red-700">
                  {textWidgetMqttValidation.invalidReason}
                </p>
              ) : null}
              {textWidgetMqttValidation?.duplicateInLayout ? (
                <p className="text-xs text-red-700">
                  Name already used in this layout.
                </p>
              ) : null}
              {textWidgetMqttValidation?.checking ? (
                <p className="text-xs text-muted-foreground">Checking…</p>
              ) : textWidgetMqttValidation?.lookupError ? (
                <p className="text-xs text-amber-700">
                  {textWidgetMqttValidation.lookupError}
                </p>
              ) : textWidgetMqttValidation?.existsInHomeAssistant ? (
                <p className="text-xs text-red-700">
                  Home Assistant already has this entity.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {widget.type === "slider" || widget.type === "button" ? (
        <SliderIconPickerDialog
          key={`${widget.id}-${sliderIconPickerOpen ? "open" : "closed"}`}
          open={sliderIconPickerOpen}
          selectedIcon={widget.icon ?? SLIDER_ICON_OPTIONS[0].value}
          title={
            widget.type === "button"
              ? "Choose Button Icon"
              : "Choose Slider Icon"
          }
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
  const [homeAssistant, setHomeAssistant] =
    useLocalStorage<HomeAssistantConfig>(
      "hass.homeAssistant",
      DEFAULT_HOME_ASSISTANT_CONFIG,
    );

  const [savedDevices, setSavedDevices] = useState<SavedDevice[]>([]);
  const [themeModeReady, setThemeModeReady] = useState(false);
  const [activeDeviceId, setActiveDeviceId] = useState("");
  const [showUsbSetup, setShowUsbSetup] = useState(false);
  const [deviceStoreReady, setDeviceStoreReady] = useState(false);
  const [editorPageId, setEditorPageId] = useState(
    DEFAULT_BUILD_CONFIG.pages[0]?.id ?? "",
  );
  const [homeAssistantStates, setHomeAssistantStates] = useState<
    Record<string, HomeAssistantEntityState>
  >({});
  const [
    existingHomeAssistantTextEntityIds,
    setExistingHomeAssistantTextEntityIds,
  ] = useState<Record<string, true>>({});
  const [textWidgetValidationPending, setTextWidgetValidationPending] =
    useState(false);
  const [textWidgetValidationError, setTextWidgetValidationError] =
    useState("");
  const [runtimeInfo, setRuntimeInfo] =
    useState<AppRuntimeInfo>(DEFAULT_APP_RUNTIME_INFO);

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
  const showUsbOnboarding = showUsbSetup || !activeDevice;
  const boundEntityIds = useMemo(
    () => collectBoundEntityIds(buildConfig.pages),
    [buildConfig.pages],
  );
  const thermostatHistoryEntityIds = useMemo(
    () => collectThermostatHistoryEntityIds(buildConfig.pages),
    [buildConfig.pages],
  );
  const boundEntityCount = useMemo(
    () => boundEntityIds.length,
    [boundEntityIds],
  );
  const homeAssistantConnectionReady = useMemo(
    () =>
      isHomeAssistantConfigured(buildConfig.homeAssistant) ||
      (runtimeInfo.addonMode && runtimeInfo.supervisorConnected),
    [buildConfig.homeAssistant, runtimeInfo.addonMode, runtimeInfo.supervisorConnected],
  );
  const homeAssistantRequestConfig = useMemo(
    () =>
      runtimeInfo.addonMode && runtimeInfo.supervisorConnected
        ? DEFAULT_HOME_ASSISTANT_CONFIG
        : buildConfig.homeAssistant,
    [
      buildConfig.homeAssistant,
      runtimeInfo.addonMode,
      runtimeInfo.supervisorConnected,
    ],
  );
  const textWidgetMqttValidationById = useMemo(() => {
    const nameCounts = new Map<string, number>();
    const validationById = new Map<
      string,
      {
        entityId: string;
        invalidReason?: string;
        duplicateInLayout?: boolean;
      }
    >();

    for (const page of buildConfig.pages) {
      for (const widget of page.widgets) {
        if (widget.type !== "text" || widget.mqttExpose !== true) {
          continue;
        }

        const normalizedName = normalizeTextWidgetMqttName(widget.mqttName);
        const entityId = getTextWidgetMqttEntityId(normalizedName);
        validationById.set(widget.id, {
          entityId,
          invalidReason:
            normalizedName.length === 0
              ? "Enter an input name with letters, numbers, or underscores."
              : undefined,
        });

        if (entityId) {
          nameCounts.set(entityId, (nameCounts.get(entityId) ?? 0) + 1);
        }
      }
    }

    for (const [, validation] of validationById) {
      if (
        validation.entityId &&
        (nameCounts.get(validation.entityId) ?? 0) > 1
      ) {
        validation.duplicateInLayout = true;
      }
    }

    return Object.fromEntries(validationById);
  }, [buildConfig.pages]);
  const textWidgetEntityIdsToValidate = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(textWidgetMqttValidationById)
            .filter(
              (validation) =>
                validation.entityId.length > 0 &&
                !validation.invalidReason &&
                !validation.duplicateInLayout,
            )
            .map((validation) => validation.entityId),
        ),
      ),
    [textWidgetMqttValidationById],
  );
  const editorPageIndex = useMemo(() => {
    const index = buildConfig.pages.findIndex(
      (page) => page.id === editorPageId,
    );
    return index >= 0 ? index : 0;
  }, [buildConfig.pages, editorPageId]);
  const editorPage = buildConfig.pages[editorPageIndex] ?? buildConfig.pages[0];

  useEffect(() => {
    setThemeModeReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRuntimeInfo() {
      try {
        const response = await fetch("/api/runtime-info", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          runtime?: AppRuntimeInfo;
        };

        if (
          !cancelled &&
          response.ok &&
          payload.ok !== false &&
          payload.runtime
        ) {
          setRuntimeInfo(payload.runtime);
        }
      } catch {
        if (!cancelled) {
          setRuntimeInfo(DEFAULT_APP_RUNTIME_INFO);
        }
      }
    }

    void loadRuntimeInfo();

    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    if (validSavedDevices.length === 0) {
      if (activeDeviceId) {
        setActiveDeviceId("");
      }
      return;
    }

    if (!validSavedDevices.some((device) => device.id === activeDeviceId)) {
      setActiveDeviceId(validSavedDevices[0].id);
    }
  }, [activeDeviceId, validSavedDevices]);

  useEffect(() => {
    if (
      !homeAssistantConnectionReady || boundEntityIds.length === 0
    ) {
      setHomeAssistantStates({});
      return;
    }

    let cancelled = false;

    async function syncStates() {
      try {
        const response = await fetch("/api/home-assistant/states", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: homeAssistantRequestConfig.url,
            token: homeAssistantRequestConfig.token,
            entityIds: boundEntityIds,
            thermostatHistoryEntityIds,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          entities?: Record<string, HomeAssistantEntityState>;
        };
        if (!cancelled && response.ok && payload.ok !== false) {
          setHomeAssistantStates(payload.entities ?? {});
        }
      } catch {
        if (!cancelled) {
          setHomeAssistantStates({});
        }
      }
    }

    void syncStates();
    const timer = window.setInterval(() => {
      void syncStates();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    boundEntityIds,
    buildConfig.homeAssistant,
    homeAssistantRequestConfig,
    homeAssistantConnectionReady,
    thermostatHistoryEntityIds,
  ]);

  useEffect(() => {
    if (
      !homeAssistantConnectionReady ||
      textWidgetEntityIdsToValidate.length === 0
    ) {
      setExistingHomeAssistantTextEntityIds({});
      setTextWidgetValidationPending(false);
      setTextWidgetValidationError("");
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setTextWidgetValidationPending(true);
      setTextWidgetValidationError("");

      try {
        const response = await fetch("/api/home-assistant/entity-presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: homeAssistantRequestConfig.url,
            token: homeAssistantRequestConfig.token,
            entityIds: textWidgetEntityIdsToValidate,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          existingEntityIds?: string[];
          error?: string;
        };

        if (cancelled) {
          return;
        }

        if (!response.ok || payload.ok === false) {
          setExistingHomeAssistantTextEntityIds({});
          setTextWidgetValidationError(
            payload.error ?? "Unable to validate Home Assistant entity names.",
          );
          return;
        }

        const nextExisting = Object.fromEntries(
          (payload.existingEntityIds ?? []).map((entityId) => [
            entityId.toLowerCase(),
            true,
          ]),
        ) as Record<string, true>;
        setExistingHomeAssistantTextEntityIds(nextExisting);
        setTextWidgetValidationError("");
      } catch {
        if (!cancelled) {
          setExistingHomeAssistantTextEntityIds({});
          setTextWidgetValidationError(
            "Unable to validate Home Assistant entity names right now.",
          );
        }
      } finally {
        if (!cancelled) {
          setTextWidgetValidationPending(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    buildConfig.homeAssistant,
    homeAssistantRequestConfig,
    homeAssistantConnectionReady,
    textWidgetEntityIdsToValidate,
  ]);

  function handleSaveActiveDevice(device: SavedDevice) {
    setSavedDevices((prev) => {
      const safePrev = Array.isArray(prev) ? prev.filter(isSavedDevice) : [];
      const withoutCurrent = safePrev.filter((entry) => entry.id !== device.id);
      return [device, ...withoutCurrent].slice(0, 10);
    });
    setActiveDeviceId(device.id);
    setShowUsbSetup(false);
  }

  function handleDeleteActiveDevice() {
    if (!activeDevice) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete "${activeDevice.name}"?`)
    ) {
      return;
    }

    setSavedDevices((prev) =>
      prev.filter((device) => device.id !== activeDevice.id),
    );
    setActiveDeviceId("");
  }

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
    if (!editorPage || editorPage.widgets.length >= MAX_WIDGETS_PER_PAGE) {
      return;
    }
    if (editorPage.type === "overview") {
      if (type !== "clock" && type !== "button" && type !== "text") {
        return;
      }
      if (
        type === "clock" &&
        editorPage.widgets.some((widget) => widget.type === "clock")
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
            value={homeAssistant}
            onChange={setHomeAssistant}
            boundEntityCount={boundEntityCount}
            addonMode={runtimeInfo.addonMode}
            supervisorConnected={runtimeInfo.supervisorConnected}
            hasDeviceHomeAssistantDefaults={
              runtimeInfo.hasDeviceHomeAssistantDefaults
            }
          />
        </section>

        {showUsbOnboarding ? (
          <UsbFlashCard onSaveActiveDevice={handleSaveActiveDevice} />
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

                <Card className="overflow-hidden">
                  <CardHeader className="border-b border-border bg-panel-strong">
                    <CardTitle>Pages & Widgets</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-6">
                    <div className={`space-y-4 p-4 ${mutedPanelClass}`}>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => addPage("standard")}
                          disabled={buildConfig.pages.length >= MAX_PAGES}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Standard
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addPage("overview")}
                          disabled={buildConfig.pages.length >= MAX_PAGES}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Overview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addPage("weather-focus")}
                          disabled={buildConfig.pages.length >= MAX_PAGES}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Weather
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addPage("media-player")}
                          disabled={buildConfig.pages.length >= MAX_PAGES}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Media
                        </Button>
                      </div>

                      <div className="-mx-1 overflow-x-auto px-1 pb-1">
                        {/* Keep page tabs on one line so horizontal drag ordering
                            stays reliable even when many pages exist. */}
                        <Reorder.Group
                          axis="x"
                          values={buildConfig.pages.map((page) => page.id)}
                          onReorder={reorderPages}
                          className="flex min-w-max gap-2"
                        >
                          {buildConfig.pages.map((page, index) => (
                            <EditablePageTab
                              key={page.id}
                              page={page}
                              index={index}
                              selected={page.id === editorPage?.id}
                              onSelect={() => setEditorPageId(page.id)}
                            />
                          ))}
                        </Reorder.Group>
                      </div>
                    </div>

                    {editorPage ? (
                      <div className={`space-y-4 p-4 ${mutedPanelClass}`}>
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                          <div className="space-y-2">
                            <Label htmlFor="page-name">Page</Label>
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

                          <div className="space-y-2">
                            <Label htmlFor="page-type">Type</Label>
                            <Select
                              value={editorPage.type}
                              onValueChange={(value) =>
                                updateCurrentPage((page) => {
                                  const nextType =
                                    value === "overview"
                                      ? "overview"
                                      : value === "weather-focus"
                                        ? "weather-focus"
                                        : value === "media-player"
                                          ? "media-player"
                                          : "standard";
                                  if (
                                    nextType === "weather-focus" ||
                                    nextType === "media-player"
                                  ) {
                                    return {
                                      ...page,
                                      type: nextType,
                                      homeAssistant: pageSupportsHomeAssistant(
                                        nextType,
                                      )
                                        ? page.homeAssistant
                                        : undefined,
                                      widgets: [],
                                    };
                                  }
                                  return {
                                    ...page,
                                    type: nextType,
                                    homeAssistant: undefined,
                                    widgets:
                                      page.widgets.length > 0 &&
                                      nextType !== "overview"
                                        ? page.widgets.map((widget) =>
                                            widget.type === "button"
                                              ? {
                                                  ...widget,
                                                  type: "switch",
                                                  icon: undefined,
                                                }
                                              : widget,
                                          )
                                        : nextType === "overview"
                                          ? [
                                              createWidget("clock"),
                                              createWidget("text"),
                                            ]
                                          : [
                                              createWidget("clock"),
                                              createWidget("weather"),
                                            ],
                                  };
                                })
                              }
                            >
                              <SelectTrigger id="page-type">
                                <SelectValue placeholder="Page type" />
                              </SelectTrigger>
                              <SelectContent>
                                {PAGE_TYPE_OPTIONS.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-end">
                            <Button
                              variant="destructive"
                              onClick={() => removePage(editorPage.id)}
                              disabled={buildConfig.pages.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {editorPage.type === "weather-focus" ? (
                          <HomeAssistantEntityPicker
                            homeAssistant={homeAssistant}
                            requestHomeAssistant={homeAssistantRequestConfig}
                            connectionReady={homeAssistantConnectionReady}
                            managedByAddon={runtimeInfo.addonMode}
                            supportedDomains={getCompatibleDomainsForPage(
                              "weather-focus",
                            )}
                            value={editorPage.homeAssistant}
                            onChange={(homeAssistantBinding) =>
                              updateCurrentPage((page) => ({
                                ...page,
                                homeAssistant: homeAssistantBinding,
                              }))
                            }
                          />
                        ) : editorPage.type === "media-player" ? (
                          <HomeAssistantEntityPicker
                            homeAssistant={homeAssistant}
                            requestHomeAssistant={homeAssistantRequestConfig}
                            connectionReady={homeAssistantConnectionReady}
                            managedByAddon={runtimeInfo.addonMode}
                            supportedDomains={getCompatibleDomainsForPage(
                              "media-player",
                            )}
                            value={editorPage.homeAssistant}
                            onChange={(homeAssistantBinding) =>
                              updateCurrentPage((page) => ({
                                ...page,
                                homeAssistant: homeAssistantBinding,
                              }))
                            }
                          />
                        ) : (
                          <>
                            <Reorder.Group
                              axis="y"
                              values={editorPage.widgets.map(
                                (widget) => widget.id,
                              )}
                              onReorder={reorderWidgets}
                              className="space-y-3"
                            >
                              <AnimatePresence initial={false}>
                                {editorPage.widgets.map(
                                  (widget, widgetIndex) => (
                                    <EditableWidgetCard
                                      key={widget.id}
                                      widget={widget}
                                      widgetIndex={widgetIndex}
                                      homeAssistant={homeAssistant}
                                      homeAssistantRequestConfig={
                                        homeAssistantRequestConfig
                                      }
                                      homeAssistantConnectionReady={
                                        homeAssistantConnectionReady
                                      }
                                      homeAssistantManagedByAddon={
                                        runtimeInfo.addonMode
                                      }
                                      textWidgetMqttValidation={
                                        widget.type === "text" &&
                                        widget.mqttExpose === true
                                          ? {
                                              ...(textWidgetMqttValidationById[
                                                widget.id
                                              ] ?? { entityId: "" }),
                                              existsInHomeAssistant: Boolean(
                                                existingHomeAssistantTextEntityIds[
                                                  (
                                                    textWidgetMqttValidationById[
                                                      widget.id
                                                    ]?.entityId ?? ""
                                                  ).toLowerCase()
                                                ],
                                              ),
                                              checking:
                                                textWidgetValidationPending &&
                                                Boolean(
                                                  textWidgetMqttValidationById[
                                                    widget.id
                                                  ]?.entityId,
                                                ) &&
                                                !textWidgetMqttValidationById[
                                                  widget.id
                                                ]?.invalidReason &&
                                                !textWidgetMqttValidationById[
                                                  widget.id
                                                ]?.duplicateInLayout,
                                              lookupError:
                                                textWidgetValidationError ||
                                                undefined,
                                            }
                                          : undefined
                                      }
                                      onRemove={removeWidget}
                                      onUpdate={updateWidget}
                                    />
                                  ),
                                )}
                              </AnimatePresence>
                            </Reorder.Group>
                            <div className="flex flex-wrap gap-2">
                              {(editorPage.type === "overview"
                                ? WIDGET_OPTIONS.filter(
                                    (widgetOption) =>
                                      widgetOption.type === "clock" ||
                                      widgetOption.type === "button" ||
                                      widgetOption.type === "text",
                                  )
                                : WIDGET_OPTIONS.filter(
                                    (widgetOption) =>
                                      widgetOption.type !== "button",
                                  )
                              ).map((widgetOption) => (
                                <Button
                                  key={widgetOption.type}
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addWidget(widgetOption.type)}
                                  disabled={
                                    editorPage.widgets.length >=
                                      MAX_WIDGETS_PER_PAGE ||
                                    (editorPage.type === "overview" &&
                                      ((widgetOption.type === "clock" &&
                                        editorPage.widgets.some(
                                          (widget) => widget.type === "clock",
                                        )) ||
                                        (widgetOption.type === "button" &&
                                          editorPage.widgets.filter(
                                            (widget) =>
                                              widget.type === "button",
                                          ).length >= 6)))
                                  }
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  {widgetOption.label}
                                </Button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <div className="h-fit xl:sticky xl:top-4">
                <Card className="overflow-hidden">
                  <CardHeader className="border-b border-border bg-panel-strong">
                    <CardTitle>Live Preview</CardTitle>
                  </CardHeader>

                  <CardContent className="pt-6">
                    <div className="rounded-4xl border border-border bg-panel-strong p-4">
                      <DevicePreview
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
              buildConfig={buildConfig}
              activeDevice={activeDevice}
            />
          </>
        ) : null}
      </div>
    </main>
  );
}
