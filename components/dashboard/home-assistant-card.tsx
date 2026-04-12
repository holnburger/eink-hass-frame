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
  deviceHomeAssistantUrlSource?: "configured" | "";
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
            <span>{summarizeUrl(resolvedDeviceUrl)}</span>
            {status ? <span>{status}</span> : <span>Connected</span>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4">
              {showDeviceUrlInput ? (
                <div className="space-y-2">
                  <Label htmlFor="home-assistant-url">
                    {addonMode
                      ? "Device Home Assistant Local Address"
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
                    placeholder="http://homeassistant.local:8123 or 192.168.1.20"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Configured Device Local Address</Label>
                  <div className="rounded-2xl border border-border-strong bg-panel-subtle px-4 py-3 text-sm text-muted-foreground">
                    {resolvedDeviceUrl}
                  </div>
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
                Set a LAN hostname or IP that the display can reach directly in
                the add-on configuration. Keep the long-lived access token there
                as well so each firmware build can embed both values.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 justify-end">
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
