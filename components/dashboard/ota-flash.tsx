"use client";

import { useState } from "react";
import { LoaderCircle, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BuildConfig } from "@/lib/layout-config";

type SavedDevice = {
  id: string;
  name: string;
  ip: string;
  lastSeen: string;
};

type OtaFlashCardProps = {
  buildConfig: BuildConfig;
  activeDevice: SavedDevice | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function OtaFlashCard({ buildConfig, activeDevice }: OtaFlashCardProps) {
  const [status, setStatus] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  async function waitForReboot(deviceIp: string) {
    let sawOffline = false;
    for (let attempt = 0; attempt < 40; attempt++) {
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
      setStatus("Select a device.");
      return;
    }

    setIsUpdating(true);
    setStatus("Building…");

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
      };

      if (!buildResponse.ok || buildResult.ok === false) {
        setStatus(
          `Build failed${buildResult.stage ? ` (${buildResult.stage})` : ""}.`,
        );
        return;
      }

      setStatus("Updating…");

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
      };

      if (!otaResponse.ok || otaResult.ok === false) {
        const detail =
          otaResult.error ||
          (otaResult.deviceStatus
            ? `device returned ${otaResult.deviceStatus}`
            : `HTTP ${otaResponse.status}`);
        setStatus(`OTA failed: ${detail}`);
        return;
      }

      setStatus("Waiting for reboot…");

      const rebooted = await waitForReboot(activeDevice.ip);
      setStatus(rebooted ? "Updated." : "Sent. Reboot not confirmed.");
    } catch {
      setStatus("Update failed.");
    } finally {
      setIsUpdating(false);
    }
  }

  if (!activeDevice) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-xs flex-col items-end gap-2">
      {status ? (
        <div className="pointer-events-auto rounded-[22px] border border-zinc-950/80 bg-white px-4 py-3 text-sm text-zinc-700 shadow-[0_12px_30px_rgba(17,17,17,0.12)]">
          {status}
        </div>
      ) : null}
      <Button
        type="button"
        size="lg"
        className="pointer-events-auto h-14 px-6 shadow-[0_14px_30px_rgba(17,17,17,0.18)]"
        onClick={buildAndUpdate}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {isUpdating ? "Working..." : "Build & Update"}
      </Button>
    </div>
  );
}
