"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Wifi } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isHomeAssistantConfigured,
  type HomeAssistantConfig,
} from "@/lib/home-assistant";

type HomeAssistantCardProps = {
  value: HomeAssistantConfig;
  onChange: (config: HomeAssistantConfig) => void;
  boundEntityCount: number;
};

function summarizeUrl(rawUrl: string) {
  try {
    return new URL(rawUrl).host;
  } catch {
    return rawUrl;
  }
}

export function HomeAssistantCard({
  value,
  onChange,
  boundEntityCount,
}: HomeAssistantCardProps) {
  const [status, setStatus] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const isConfigured = useMemo(() => isHomeAssistantConfigured(value), [value]);
  const [collapsed, setCollapsed] = useState(isConfigured);
  const wasConfigured = useRef(isConfigured);

  useEffect(() => {
    if (!isConfigured) {
      setCollapsed(false);
    } else if (!wasConfigured.current && isConfigured) {
      setCollapsed(true);
    }

    wasConfigured.current = isConfigured;
  }, [isConfigured]);

  async function testConnection() {
    if (!isConfigured) {
      setStatus("Enter URL and token.");
      return;
    }

    setIsTesting(true);
    setStatus("Testing…");

    try {
      const response = await fetch("/api/home-assistant/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: value.url,
          token: value.token,
          limit: 1,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || payload.ok === false) {
        setStatus(payload.error ?? "Connection failed.");
        return;
      }

      setStatus("Connected.");
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
            {isConfigured ? (
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
        {collapsed && isConfigured ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-panel-subtle px-4 py-3 text-sm text-muted-foreground">
            <span>{summarizeUrl(value.url)}</span>
            {status ? <span>{status}</span> : <span>Connected</span>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-2">
                <Label htmlFor="home-assistant-url">URL</Label>
                <Input
                  id="home-assistant-url"
                  value={value.url}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      url: event.target.value,
                    })
                  }
                  placeholder="https://homeassistant.local:8123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="home-assistant-token">Token</Label>
                <Input
                  id="home-assistant-token"
                  type="password"
                  value={value.token}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      token: event.target.value,
                    })
                  }
                  placeholder="Paste token"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={testConnection}
                disabled={isTesting}
              >
                <Wifi className="mr-2 h-4 w-4" />
                {isTesting ? "Testing..." : "Test"}
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
