"use client";

import { GripVertical, Plus, Search, Trash2, X } from "lucide-react";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { AnimatePresence, Reorder, useDragControls } from "motion/react";

import { HomeAssistantEntityPicker } from "@/components/dashboard/home-assistant-entity-picker";
import {
  formatMdiIconLabel,
  getAllMdiIconNames,
  MdiIcon,
} from "@/components/dashboard/mdi-icon";
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
import { MAX_MEDIA_PLAYER_BINDINGS } from "@/hooks/use-layout-editor";
import type { TextWidgetMqttValidation } from "@/hooks/use-text-widget-mqtt-validation";
import {
  getCompatibleDomainsForPage,
  getCompatibleDomainsForWidget,
  pageSupportsHomeAssistant,
  type HomeAssistantBinding,
  type HomeAssistantConfig,
  widgetSupportsHomeAssistant,
} from "@/lib/home-assistant";
import {
  CLOCK_STYLE_OPTIONS,
  createWidget,
  getMaxWidgetsPerPage,
  MAX_PAGES,
  normalizeTextWidgetMqttMode,
  normalizeTextWidgetMqttName,
  PAGE_TYPE_OPTIONS,
  SLIDER_ICON_OPTIONS,
  type PageConfig,
  type PageType,
  type SliderIconName,
  type WidgetConfig,
  type WidgetType,
  WIDGET_OPTIONS,
} from "@/lib/layout-config";

const textareaClassName =
  "min-h-24 w-full rounded-2xl border border-border-strong bg-input px-4 py-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-border-strong";
// Reused surface tokens keep the configurator styling consistent across sections.
const mutedPanelClass = "rounded-3xl border border-border bg-panel-subtle";
const raisedPanelClass = "rounded-3xl border border-border bg-panel";
const compactMutedPanelClass =
  "rounded-2xl border border-border bg-panel-subtle";

type EditableWidgetCardProps = {
  widget: WidgetConfig;
  widgetIndex: number;
  appBasePath?: string;
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
  appBasePath,
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
            appBasePath={appBasePath}
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
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-2">
                <Label htmlFor={`${widget.id}-mqtt-mode`}>MQTT Entity</Label>
                <Select
                  value={normalizeTextWidgetMqttMode(widget.mqttMode)}
                  onValueChange={(value) =>
                    onUpdate(widget.id, (current) => ({
                      ...current,
                      mqttMode: normalizeTextWidgetMqttMode(value),
                    }))
                  }
                >
                  <SelectTrigger id={`${widget.id}-mqtt-mode`}>
                    <SelectValue placeholder="MQTT Entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">input_text</SelectItem>
                    <SelectItem value="notify">notify</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${widget.id}-mqtt-name`}>MQTT Name</Label>
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
              </div>
              {textWidgetEntityId ? (
                <p className="text-xs font-mono text-muted-foreground md:col-span-2">
                  {textWidgetEntityId}
                </p>
              ) : null}
              {textWidgetMqttValidation?.invalidReason ? (
                <p className="text-xs text-red-700 md:col-span-2">
                  {textWidgetMqttValidation.invalidReason}
                </p>
              ) : null}
              {textWidgetMqttValidation?.duplicateInLayout ? (
                <p className="text-xs text-red-700 md:col-span-2">
                  Name already used in this layout.
                </p>
              ) : null}
              {textWidgetMqttValidation?.checking ? (
                <p className="text-xs text-muted-foreground md:col-span-2">
                  Checking…
                </p>
              ) : textWidgetMqttValidation?.lookupError ? (
                <p className="text-xs text-amber-700 md:col-span-2">
                  {textWidgetMqttValidation.lookupError}
                </p>
              ) : textWidgetMqttValidation?.existsInHomeAssistant ? (
                <p className="text-xs text-red-700 md:col-span-2">
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

type LayoutEditorCardProps = {
  appBasePath?: string;
  editorMediaPlayerBindings: HomeAssistantBinding[];
  editorMediaPlayerBindingSlotCount: number;
  editorPage?: PageConfig;
  homeAssistant: HomeAssistantConfig;
  homeAssistantConnectionReady: boolean;
  homeAssistantManagedByAddon: boolean;
  homeAssistantRequestConfig: HomeAssistantConfig;
  pages: PageConfig[];
  textWidgetMqttValidationById: Record<string, TextWidgetMqttValidation>;
  onAddPage: (type: PageType) => void;
  onAddWidget: (type: WidgetType) => void;
  onRemovePage: (pageId: string) => void;
  onRemoveWidget: (widgetId: string) => void;
  onReorderPages: (pageIds: string[]) => void;
  onReorderWidgets: (widgetIds: string[]) => void;
  onSelectPage: (pageId: string) => void;
  onUpdateCurrentPage: (updater: (page: PageConfig) => PageConfig) => void;
  onUpdateWidget: (
    widgetId: string,
    updater: (widget: WidgetConfig) => WidgetConfig,
  ) => void;
  setMediaPlayerBindingSlotsByPageId: Dispatch<
    SetStateAction<Record<string, number>>
  >;
};

export function LayoutEditorCard({
  appBasePath,
  editorMediaPlayerBindings,
  editorMediaPlayerBindingSlotCount,
  editorPage,
  homeAssistant,
  homeAssistantConnectionReady,
  homeAssistantManagedByAddon,
  homeAssistantRequestConfig,
  pages,
  textWidgetMqttValidationById,
  onAddPage,
  onAddWidget,
  onRemovePage,
  onRemoveWidget,
  onReorderPages,
  onReorderWidgets,
  onSelectPage,
  onUpdateCurrentPage,
  onUpdateWidget,
  setMediaPlayerBindingSlotsByPageId,
}: LayoutEditorCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-panel-strong">
        <CardTitle>Pages & Widgets</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        <div className={`space-y-4 p-4 ${mutedPanelClass}`}>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => onAddPage("standard")}
              disabled={pages.length >= MAX_PAGES}
            >
              <Plus className="mr-2 h-4 w-4" />
              Standard
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddPage("overview")}
              disabled={pages.length >= MAX_PAGES}
            >
              <Plus className="mr-2 h-4 w-4" />
              Overview
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddPage("weather-focus")}
              disabled={pages.length >= MAX_PAGES}
            >
              <Plus className="mr-2 h-4 w-4" />
              Weather
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddPage("media-player")}
              disabled={pages.length >= MAX_PAGES}
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
              values={pages.map((page) => page.id)}
              onReorder={onReorderPages}
              className="flex min-w-max gap-2"
            >
              {pages.map((page, index) => (
                <EditablePageTab
                  key={page.id}
                  page={page}
                  index={index}
                  selected={page.id === editorPage?.id}
                  onSelect={() => onSelectPage(page.id)}
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
                    onUpdateCurrentPage((page) => ({
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
                    onUpdateCurrentPage((page) => {
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
                        const nextBindings =
                          nextType === "media-player"
                            ? page.homeAssistantBindings &&
                              page.homeAssistantBindings.length > 0
                              ? page.homeAssistantBindings
                              : page.homeAssistant
                                ? [page.homeAssistant]
                                : []
                            : undefined;
                        return {
                          ...page,
                          type: nextType,
                          homeAssistant: pageSupportsHomeAssistant(
                            nextType,
                          )
                            ? page.homeAssistant
                            : undefined,
                          homeAssistantBindings: nextBindings,
                          mediaShowActiveOnly:
                            nextType === "media-player"
                              ? page.mediaShowActiveOnly !== false
                              : undefined,
                          widgets: [],
                        };
                      }
                      return {
                        ...page,
                        type: nextType,
                        homeAssistant: undefined,
                        homeAssistantBindings: undefined,
                        mediaShowActiveOnly: undefined,
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
                                  createWidget("weather"),
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
                  onClick={() => onRemovePage(editorPage.id)}
                  disabled={pages.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {editorPage.type === "weather-focus" ? (
              <HomeAssistantEntityPicker
                appBasePath={appBasePath}
                homeAssistant={homeAssistant}
                requestHomeAssistant={homeAssistantRequestConfig}
                connectionReady={homeAssistantConnectionReady}
                managedByAddon={homeAssistantManagedByAddon}
                supportedDomains={getCompatibleDomainsForPage(
                  "weather-focus",
                )}
                value={editorPage.homeAssistant}
                onChange={(homeAssistantBinding) =>
                  onUpdateCurrentPage((page) => ({
                    ...page,
                    homeAssistant: homeAssistantBinding,
                  }))
                }
              />
            ) : editorPage.type === "media-player" ? (
              <div className="space-y-3">
                {Array.from(
                  { length: editorMediaPlayerBindingSlotCount },
                  (_, bindingIndex) =>
                    editorMediaPlayerBindings[bindingIndex],
                ).map((binding, bindingIndex) => (
                  <div
                    key={`${editorPage.id}-media-player-${bindingIndex}`}
                    className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <HomeAssistantEntityPicker
                      appBasePath={appBasePath}
                      homeAssistant={homeAssistant}
                      requestHomeAssistant={homeAssistantRequestConfig}
                      connectionReady={homeAssistantConnectionReady}
                      managedByAddon={homeAssistantManagedByAddon}
                      supportedDomains={getCompatibleDomainsForPage(
                        "media-player",
                      )}
                      value={binding}
                      onChange={(homeAssistantBinding) =>
                        onUpdateCurrentPage((page) => {
                          const currentBindings =
                            page.homeAssistantBindings &&
                            page.homeAssistantBindings.length > 0
                              ? [...page.homeAssistantBindings]
                              : page.homeAssistant
                                ? [page.homeAssistant]
                                : [];
                          if (homeAssistantBinding) {
                            currentBindings[bindingIndex] =
                              homeAssistantBinding;
                          } else {
                            currentBindings.splice(bindingIndex, 1);
                          }
                          const nextBindings = currentBindings.filter(
                            Boolean,
                          );
                          setMediaPlayerBindingSlotsByPageId(
                            (prev) => ({
                              ...prev,
                              [page.id]: Math.max(
                                prev[page.id] ?? 1,
                                bindingIndex + 1,
                              ),
                            }),
                          );
                          return {
                            ...page,
                            homeAssistant: nextBindings[0],
                            homeAssistantBindings: nextBindings,
                          };
                        })
                      }
                    />
                    <Button
                      variant="destructive"
                      onClick={() =>
                        onUpdateCurrentPage((page) => {
                          const currentBindings =
                            page.homeAssistantBindings &&
                            page.homeAssistantBindings.length > 0
                              ? [...page.homeAssistantBindings]
                              : page.homeAssistant
                                ? [page.homeAssistant]
                                : [];
                          currentBindings.splice(bindingIndex, 1);
                          setMediaPlayerBindingSlotsByPageId(
                            (prev) => ({
                              ...prev,
                              [page.id]: Math.max(
                                currentBindings.length,
                                1,
                              ),
                            }),
                          );
                          return {
                            ...page,
                            homeAssistant: currentBindings[0],
                            homeAssistantBindings: currentBindings,
                          };
                        })
                      }
                      disabled={
                        editorMediaPlayerBindingSlotCount <= 1
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div className={`${compactMutedPanelClass} px-4 py-3`}>
                    <Switch
                      id={`${editorPage.id}-active-media-only`}
                      label="Active player only"
                      checked={
                        editorPage.mediaShowActiveOnly !== false
                      }
                      onCheckedChange={(checked) =>
                        onUpdateCurrentPage((page) => ({
                          ...page,
                          mediaShowActiveOnly: checked,
                        }))
                      }
                    />
                  </div>
                  <Button
                    onClick={() =>
                      setMediaPlayerBindingSlotsByPageId((prev) => ({
                        ...prev,
                        [editorPage.id]:
                          Math.min(
                            editorMediaPlayerBindingSlotCount + 1,
                            MAX_MEDIA_PLAYER_BINDINGS,
                          ),
                      }))
                    }
                    disabled={
                      editorMediaPlayerBindingSlotCount >=
                      MAX_MEDIA_PLAYER_BINDINGS
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add Player
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Reorder.Group
                  axis="y"
                  values={editorPage.widgets.map(
                    (widget) => widget.id,
                  )}
                  onReorder={onReorderWidgets}
                  className="space-y-3"
                >
                  <AnimatePresence initial={false}>
                    {editorPage.widgets.map(
                      (widget, widgetIndex) => (
                        <EditableWidgetCard
                          key={widget.id}
                          widget={widget}
                          widgetIndex={widgetIndex}
                          appBasePath={appBasePath}
                          homeAssistant={homeAssistant}
                          homeAssistantRequestConfig={
                            homeAssistantRequestConfig
                          }
                          homeAssistantConnectionReady={
                            homeAssistantConnectionReady
                          }
                          homeAssistantManagedByAddon={
                            homeAssistantManagedByAddon
                          }
                          textWidgetMqttValidation={
                            widget.type === "text" &&
                            widget.mqttExpose === true
                              ? (textWidgetMqttValidationById[
                                  widget.id
                                ] ?? { entityId: "" })
                              : undefined
                          }
                          onRemove={onRemoveWidget}
                          onUpdate={onUpdateWidget}
                        />
                      ),
                    )}
                  </AnimatePresence>
                </Reorder.Group>
                <div className="flex flex-wrap gap-2">
                  {(editorPage.type === "overview"
                    ? WIDGET_OPTIONS.filter(
                        (widgetOption) =>
                          widgetOption.type === "weather" ||
                          widgetOption.type === "clock" ||
                          widgetOption.type === "progress" ||
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
                      onClick={() => onAddWidget(widgetOption.type)}
                      disabled={
                        editorPage.widgets.length >=
                          getMaxWidgetsPerPage(
                            editorPage.type,
                          ) ||
                        (editorPage.type === "overview" &&
                          ((widgetOption.type === "clock" &&
                            editorPage.widgets.some(
                              (widget) => widget.type === "clock",
                            )) ||
                            (widgetOption.type === "weather" &&
                              editorPage.widgets.some(
                                (widget) =>
                                  widget.type === "weather",
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
  );
}
