"use client";

import { useMemo, useState } from "react";
import { Link2, Shield, Wifi } from "lucide-react";

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
import {
  isHomeAssistantConfigured,
  type HomeAssistantConfig,
} from "@/lib/home-assistant";

type HomeAssistantCardProps = {
  value: HomeAssistantConfig;
  onChange: (config: HomeAssistantConfig) => void;
  boundEntityCount: number;
};

export function HomeAssistantCard({
  value,
  onChange,
  boundEntityCount,
}: HomeAssistantCardProps) {
  const [status, setStatus] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const isConfigured = useMemo(
    () => isHomeAssistantConfigured(value),
    [value],
  );

  async function testConnection() {
    if (!isConfigured) {
      setStatus("Enter a URL and long-lived access token first.");
      return;
    }

    setIsTesting(true);
    setStatus("Testing Home Assistant connection...");

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
        total?: number;
      };

      if (!response.ok || payload.ok === false) {
        setStatus(payload.error ?? "Connection failed.");
        return;
      }

      setStatus(
        `Connected to Home Assistant. ${
          typeof payload.total === "number"
            ? `${payload.total} entities available.`
            : ""
        }`,
      );
    } catch {
      setStatus("Connection failed.");
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Home Assistant</CardTitle>
        <CardDescription>
          Search entities in the configurator and embed the same connection in
          the firmware for live device updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor="home-assistant-url">Home Assistant URL</Label>
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
            <Label htmlFor="home-assistant-token">
              Long-Lived Access Token
            </Label>
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
              placeholder="Paste your token"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={testConnection}
            disabled={isTesting}
          >
            <Wifi className="mr-2 h-4 w-4" />
            {isTesting ? "Testing..." : "Test Connection"}
          </Button>

          <div className="rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-400">
            <Link2 className="mr-1 inline h-3.5 w-3.5" />
            {boundEntityCount} bound entit{boundEntityCount === 1 ? "y" : "ies"}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-xs text-zinc-400">
          <p className="flex items-start gap-2">
            <Shield className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              These values stay in your local browser storage, and when you
              build firmware they are compiled into the device so it can talk to
              Home Assistant directly.
            </span>
          </p>
        </div>

        {status ? <p className="text-sm text-zinc-300">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
