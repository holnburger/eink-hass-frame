"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { countWidgets, type BuildConfig } from "@/lib/layout-config";

type SavedDevice = {
  id: string;
  name: string;
  ip: string;
  lastSeen: string;
};

type OtaFlashCardProps = {
  buildConfig: BuildConfig;
  devices: SavedDevice[];
  activeDeviceId: string;
  onActiveDeviceChange: (id: string) => void;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function OtaFlashCard({
  buildConfig,
  devices,
  activeDeviceId,
  onActiveDeviceChange,
}: OtaFlashCardProps) {
  const activeDevice = useMemo(
    () => devices.find((device) => device.id === activeDeviceId) ?? null,
    [activeDeviceId, devices],
  );

  const [status, setStatus] = useState("Idle");
  const [progress, setProgress] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  async function waitForReboot(deviceIp: string) {
    let sawOffline = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      const nextProgress = 82 + Math.floor((attempt / 39) * 17);
      setProgress(nextProgress);
      let online = false;
      try {
        const response = await fetch("/api/device/health", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceIp }),
        });
        if (response.ok) {
          online = true;
        } else {
          sawOffline = true;
        }
      } catch {
        sawOffline = true;
      }

      if (!online) {
        try {
          await fetch(`http://${deviceIp}/api/health?t=${Date.now()}`, {
            method: "GET",
            mode: "no-cors",
            cache: "no-store",
          });
          online = true;
        } catch {
          sawOffline = true;
        }
      }

      if (online && (sawOffline || attempt >= 5)) {
        return true;
      }
      await sleep(2000);
    }
    return false;
  }

  async function buildAndUpdate() {
    if (!activeDevice?.ip) {
      setStatus("Select an active device first.");
      return;
    }

    setIsUpdating(true);
    setProgress(5);
    setStatus("Building firmware from current layout...");

    try {
      const buildResponse = await fetch("/api/firmware/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildConfig),
      });
      const buildResult = (await buildResponse.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        stage?: string;
        buildId?: string;
      };
      if (!buildResponse.ok || buildResult.ok === false) {
        setStatus(
          `Build failed${buildResult.stage ? ` (${buildResult.stage})` : ""}: ${buildResult.error ?? "unknown error"}`,
        );
        setProgress(0);
        return;
      }

      setProgress(65);
      setStatus("Sending OTA update to device...");

      const otaResponse = await fetch("/api/device/ota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceIp: activeDevice.ip,
        }),
      });
      const otaResult = (await otaResponse.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        deviceStatus?: number;
        mode?: "upload" | "url";
        firmwareUrl?: string;
        artifactSha256?: string;
        artifactSize?: number;
      };

      if (!otaResponse.ok || otaResult.ok === false) {
        const detail =
          otaResult.error ||
          (otaResult.deviceStatus ? `device returned ${otaResult.deviceStatus}` : `HTTP ${otaResponse.status}`);
        setStatus(`OTA failed: ${detail}`);
        setProgress(0);
        return;
      }

      setProgress(80);
      const modeLabel = otaResult.mode === "url" ? "URL fallback" : "direct upload";
      const details: string[] = [];
      if (buildResult.buildId) {
        details.push(`build ${buildResult.buildId}`);
      }
      details.push(`${buildConfig.pages.length} page${buildConfig.pages.length === 1 ? "" : "s"}`);
      details.push(`${countWidgets(buildConfig.pages)} widgets`);
      if (otaResult.artifactSha256) {
        details.push(`sha ${otaResult.artifactSha256.slice(0, 12)}`);
      }
      if (otaResult.artifactSize) {
        details.push(`${otaResult.artifactSize} bytes`);
      }
      if (otaResult.mode === "url" && otaResult.firmwareUrl) {
        details.push(otaResult.firmwareUrl);
      }
      const suffix = details.length > 0 ? ` (${details.join(" | ")})` : "";
      setStatus(`OTA sent via ${modeLabel}${suffix}. Waiting for device reboot...`);

      const rebooted = await waitForReboot(activeDevice.ip);
      if (rebooted) {
        setProgress(100);
        setStatus("Update successful. Device restarted and is online.");
      } else {
        setProgress(95);
        setStatus("OTA sent, but reboot confirmation timed out.");
      }
    } catch {
      setStatus("Update failed due to network/backend error.");
      setProgress(0);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>OTA Update</CardTitle>
        <CardDescription>Build the current layout and update the active device in one step.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="active-device">Active Device</Label>
          <select
            id="active-device"
            className="h-10 w-full rounded-md border border-zinc-600 bg-zinc-950 px-3 text-sm"
            value={activeDeviceId}
            onChange={(e) => onActiveDeviceChange(e.target.value)}
          >
            <option value="">Select saved device</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} ({device.ip})
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-md border border-zinc-700 p-3 text-sm text-zinc-300">
          <p>
            <span className="text-zinc-400">Name:</span> {activeDevice?.name ?? "-"}
          </p>
          <p>
            <span className="text-zinc-400">IP:</span> {activeDevice?.ip ?? "-"}
          </p>
        </div>

        <Button onClick={buildAndUpdate} disabled={isUpdating || !activeDevice?.ip}>
          {isUpdating ? "Updating..." : "Build & Update"}
        </Button>

        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-xs text-zinc-400">{progress}%</p>
          <p className="text-sm text-zinc-300">{status}</p>
        </div>
      </CardContent>
    </Card>
  );
}
