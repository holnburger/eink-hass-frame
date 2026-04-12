"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { ChevronDown, Wifi } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveAppPath } from "@/lib/app-path";
import {
  isHomeAssistantConfigured,
  type HomeAssistantConfig,
} from "@/lib/home-assistant";

type HomeAssistantCardProps = {
  appBasePath?: string;
  value: HomeAssistantConfig;
  onChange: Dispatch<SetStateAction<HomeAssistantConfig>>;
  boundEntityCount: number;
  addonMode?: boolean;
  supervisorConnected?: boolean;
  hasDeviceHomeAssistantDefaults?: boolean;
  deviceHomeAssistantUrl?: string;
  deviceHomeAssistantUrlSource?: "configured" | "detected" | "";
};

function summarizeUrl(rawUrl: string) {
  try {
    return new URL(rawUrl).host;
  } catch {
    return rawUrl;
  }
}

export function HomeAssistantCard({
  appBasePath,
  value,
  onChange,
  boundEntityCount,
  addonMode = false,
  supervisorConnected = false,
  hasDeviceHomeAssistantDefaults = false,
  deviceHomeAssistantUrl = "",
  deviceHomeAssistantUrlSource = "",
}: HomeAssistantCardProps) {
  const [status, setStatus] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [draftConfig, setDraftConfig] = useState(value);
  const isManualDeviceUrlOverride = draftConfig.manualUrlOverride === true;
  const resolvedDeviceUrl = addonMode
    ? isManualDeviceUrlOverride && draftConfig.url
      ? draftConfig.url
      : deviceHomeAssistantUrl || draftConfig.url
    : draftConfig.url;
  const hasResolvedDeviceToken =
    draftConfig.token.trim().length > 0 || hasDeviceHomeAssistantDefaults;
  const hasDeviceFirmwareConfig =
    resolvedDeviceUrl.length > 0 && hasResolvedDeviceToken;
  const showDeviceUrlInput =
    !addonMode || resolvedDeviceUrl.length === 0 || isManualDeviceUrlOverride;
  const isConfigured = useMemo(
    () => isHomeAssistantConfigured(draftConfig),
    [draftConfig],
  );
  const hasActiveConnection = addonMode
    ? supervisorConnected || isConfigured
    : isConfigured;
  const [collapsed, setCollapsed] = useState(hasActiveConnection);
  const hadActiveConnection = useRef(hasActiveConnection);

  useEffect(() => {
    if (!hasActiveConnection) {
      setCollapsed(false);
    } else if (!hadActiveConnection.current && hasActiveConnection) {
      setCollapsed(true);
    }

    hadActiveConnection.current = hasActiveConnection;
  }, [hasActiveConnection]);

  useEffect(() => {
    setDraftConfig(value);
  }, [value]);

  useEffect(() => {
    setStatus("");
  }, [draftConfig.url, draftConfig.token]);

  async function testConnection() {
    if (!addonMode && !isConfigured) {
      setStatus("Enter URL and token.");
      return;
    }

    setIsTesting(true);
    setStatus(
      addonMode && !hasDeviceFirmwareConfig
        ? "Testing add-on connection…"
        : "Testing…",
    );

    try {
      const response = await fetch(
        resolveAppPath("/api/home-assistant/entities", appBasePath),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: draftConfig.url,
            token: draftConfig.token,
            limit: 1,
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || payload.ok === false) {
        setStatus(payload.error ?? "Connection failed.");
        return;
      }

      setStatus(
        addonMode && !hasDeviceFirmwareConfig
          ? "Connected through the add-on."
          : "Connected.",
      );
      setCollapsed(true);
    } catch {
      setStatus("Connection failed.");
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="h-18 border-b border-border bg-panel-strong">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Home Assistant</CardTitle>
          <div className="flex items-center gap-2">
            {boundEntityCount > 0 ? (
              <div className="rounded-full border border-border-strong bg-panel px-3 py-1.5 text-xs font-medium text-muted-foreground">
                {boundEntityCount} bound
              </div>
            ) : null}
            {hasActiveConnection ? (
              <Button
                type="button"
                variant="outline"
                className="h-8"
                size="sm"
                onClick={() => setCollapsed((current) => !current)}
              >
                <ChevronDown
                  className={`mr-2 h-4 w-4 transition ${
                    collapsed ? "" : "rotate-180"
                  }`}
                />
                {collapsed ? "Edit" : "Done"}
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {collapsed && hasActiveConnection ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-panel-subtle px-4 py-3 text-sm text-muted-foreground">
            <span>
              {addonMode
                ? hasDeviceFirmwareConfig
                    ? `Preview via add-on, firmware via ${summarizeUrl(resolvedDeviceUrl)}`
                    : "Preview via add-on"
                : summarizeUrl(resolvedDeviceUrl)}
            </span>
            {status ? <span>{status}</span> : <span>Connected</span>}
          </div>
        ) : (
          <div className="space-y-4">
            {addonMode ? (
              <div className="rounded-3xl border border-border bg-panel-subtle px-4 py-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  Home Assistant is available through the add-on.
                </p>
                <p className="mt-1">
                  Search, preview, and validation use the Supervisor proxy automatically.
                  The display firmware still needs a direct Home Assistant
                  connection, so the detected device address and the long-lived
                  access token below are what get written into the firmware.
                </p>
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              {showDeviceUrlInput ? (
                <div className="space-y-2">
                  <Label htmlFor="home-assistant-url">
                    {addonMode
                      ? "Device Home Assistant Address"
                      : "Home Assistant Address"}
                  </Label>
                  <Input
                    id="home-assistant-url"
                    value={draftConfig.url}
                    onChange={(event) => {
                      const nextUrl = event.target.value;
                      setDraftConfig((current) => ({
                        ...current,
                        url: nextUrl,
                        manualUrlOverride: addonMode
                          ? current.manualUrlOverride
                          : false,
                      }));
                      onChange((current) => ({
                        ...current,
                        url: nextUrl,
                        manualUrlOverride: addonMode
                          ? current.manualUrlOverride
                          : false,
                      }));
                    }}
                    placeholder="https://homeassistant.local:8123"
                  />
                  {addonMode && deviceHomeAssistantUrl ? (
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>
                        Leave the override disabled to keep using{" "}
                        {summarizeUrl(deviceHomeAssistantUrl)}.
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => {
                          setDraftConfig((current) => ({
                            ...current,
                            manualUrlOverride: false,
                          }));
                          onChange((current) => ({
                            ...current,
                            manualUrlOverride: false,
                          }));
                        }}
                      >
                        Use Detected
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>
                    {deviceHomeAssistantUrlSource === "configured"
                      ? "Configured Device Address"
                      : "Detected Device Address"}
                  </Label>
                  <div className="rounded-2xl border border-border-strong bg-panel-subtle px-4 py-3 text-sm text-muted-foreground">
                    {resolvedDeviceUrl}
                  </div>
                  {addonMode && deviceHomeAssistantUrl ? (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => {
                          setDraftConfig((current) => ({
                            ...current,
                            url: current.url || deviceHomeAssistantUrl,
                            manualUrlOverride: true,
                          }));
                          onChange((current) => ({
                            ...current,
                            url: current.url || deviceHomeAssistantUrl,
                            manualUrlOverride: true,
                          }));
                        }}
                      >
                        Override
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="home-assistant-token">
                  {addonMode
                    ? "Device Long-Lived Access Token"
                    : "Long-Lived Access Token"}
                </Label>
                <Input
                  id="home-assistant-token"
                  type="password"
                  value={draftConfig.token}
                  onChange={(event) => {
                    const nextToken = event.target.value;
                    setDraftConfig((current) => ({
                      ...current,
                      token: nextToken,
                    }));
                    onChange((current) => ({
                      ...current,
                      token: nextToken,
                    }));
                  }}
                  placeholder={
                    addonMode
                      ? "Token written into the device firmware"
                      : "Paste token"
                  }
                />
              </div>
            </div>

            {addonMode ? (
              <p className="text-xs text-muted-foreground">
                The device address is resolved automatically when possible.
                Keep the long-lived access token in the add-on configuration so
                each firmware build can embed it for the device.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={testConnection}
                disabled={isTesting}
              >
                <Wifi className="mr-2 h-4 w-4" />
                {isTesting
                  ? "Testing..."
                  : addonMode
                    ? hasDeviceFirmwareConfig
                      ? "Test Device Access"
                      : "Test Add-on Link"
                    : "Test"}
              </Button>
              {status ? (
                <p className="text-sm text-muted-foreground">{status}</p>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
