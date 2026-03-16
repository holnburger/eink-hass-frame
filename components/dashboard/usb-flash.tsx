"use client";

import { useCallback, useEffect, useState } from "react";

import { UsbInstallButton } from "@/components/dashboard/usb-install-button";
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
import type { BuildConfig } from "@/lib/layout-config";

type SavedDevice = {
  id: string;
  name: string;
  ip: string;
  lastSeen: string;
};

type UsbFlashCardProps = {
  buildConfig: BuildConfig;
  onSaveActiveDevice: (device: SavedDevice) => void;
};

export function UsbFlashCard({
  buildConfig,
  onSaveActiveDevice,
}: UsbFlashCardProps) {
  const [artifactsReady, setArtifactsReady] = useState(false);
  const [checkingBinaries, setCheckingBinaries] = useState(true);
  const [buildStatus, setBuildStatus] = useState("Not built yet");
  const [buildLogs, setBuildLogs] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [deviceName, setDeviceName] = useState("M5PaperS3");
  const [deviceSaveStatus, setDeviceSaveStatus] = useState("");
  const [manualIp, setManualIp] = useState("");

  const checkFirmwareBinaries = useCallback(async () => {
    setCheckingBinaries(true);
    try {
      const response = await fetch("/api/firmware/status", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        setArtifactsReady(false);
        return;
      }

      const result = (await response.json()) as { artifactsReady?: boolean };
      setArtifactsReady(Boolean(result.artifactsReady));
    } catch {
      setArtifactsReady(false);
    } finally {
      setCheckingBinaries(false);
    }
  }, []);

  useEffect(() => {
    void checkFirmwareBinaries();
  }, [checkFirmwareBinaries]);

  const saveActiveDevice = useCallback(() => {
    const chosenIp = manualIp.trim();
    if (!chosenIp) {
      setDeviceSaveStatus("Enter the device IP first.");
      return;
    }
    const normalizedName = deviceName.trim() || "M5PaperS3";
    try {
      onSaveActiveDevice({
        id: chosenIp,
        name: normalizedName,
        ip: chosenIp,
        lastSeen: new Date().toISOString(),
      });
      setDeviceSaveStatus(`Saved "${normalizedName}" as active device.`);
    } catch {
      setDeviceSaveStatus("Saving failed. Please reload and try again.");
    }
  }, [deviceName, manualIp, onSaveActiveDevice]);

  const handleDetectedDeviceUrl = useCallback((deviceUrl: string) => {
    try {
      const parsed = new URL(deviceUrl);
      if (!parsed.hostname) {
        return;
      }
      setManualIp(parsed.hostname);
      setDeviceSaveStatus(
        `Wi-Fi provisioned via ESP Web Tools. Detected device IP ${parsed.hostname}. Save it as the active device when ready.`,
      );
    } catch {
      // Ignore malformed URLs from external tooling.
    }
  }, []);

  const buildFirmware = useCallback(async () => {
    setIsBuilding(true);
    setBuildStatus("Building firmware...");
    setBuildLogs("");
    try {
      const response = await fetch("/api/firmware/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildConfig),
      });
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
        error?: string;
        stage?: string;
        log?: string;
      };

      setBuildLogs(result.log ?? "");
      if (!response.ok || !result.ok) {
        setBuildStatus(
          `Build failed${result.stage ? ` (${result.stage})` : ""}: ${result.error ?? "unknown error"}`,
        );
      } else {
        setBuildStatus(result.message ?? "Build finished.");
        await checkFirmwareBinaries();
      }
    } catch {
      setBuildStatus("Build request failed.");
    } finally {
      setIsBuilding(false);
    }
  }, [buildConfig, checkFirmwareBinaries]);

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle>USB Flash Setup</CardTitle>
        <CardDescription>
          First boot happens via USB. ESP Web Tools now handles Wi-Fi
          provisioning over Improv after flashing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-zinc-300">
        <div className="space-y-2 rounded-md border border-zinc-700 p-3">
          <p className="font-medium text-zinc-100">Build Current Layout</p>
          <p className="text-xs text-zinc-400">
            The build uses your current widget/layout settings. Wi-Fi is
            configured afterwards by ESP Web Tools.
          </p>
          <Button onClick={buildFirmware} disabled={isBuilding}>
            {isBuilding ? "Building..." : "Build Firmware"}
          </Button>
          <p className="text-xs text-zinc-400">{buildStatus}</p>
          {buildLogs ? (
            <div className="max-h-32 overflow-auto rounded-md bg-zinc-950 p-2 font-mono text-[11px] text-zinc-300">
              {buildLogs}
            </div>
          ) : null}
        </div>

        <div className="space-y-2 rounded-md border border-zinc-700 p-3">
          <p className="font-medium text-zinc-100">
            Flash & Wi-Fi Provisioning
          </p>
          <p className="text-xs text-zinc-400">
            After writing the firmware, ESP Web Tools will detect Improv and ask
            for your Wi-Fi credentials. When the device joins the network, the
            detected IP will appear below automatically.
          </p>
          {checkingBinaries ? (
            <p className="text-xs text-zinc-500">Checking build status...</p>
          ) : artifactsReady ? (
            <UsbInstallButton
              manifest="/api/firmware/manifest"
              onDetectedDeviceUrl={handleDetectedDeviceUrl}
            />
          ) : (
            <p className="text-xs text-zinc-500">
              Build firmware first to enable USB flashing.
            </p>
          )}
        </div>

        <div
          id="finalize-setup"
          className="space-y-2 rounded-md border border-zinc-700 p-3"
        >
          <p className="font-medium text-zinc-100">Save As Active Device</p>
          <div className="space-y-1">
            <Label htmlFor="device-name-final">Device Name</Label>
            <Input
              id="device-name-final"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Kitchen Display"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="device-ip-final">Device IP</Label>
            <Input
              id="device-ip-final"
              value={manualIp}
              onChange={(e) => setManualIp(e.target.value)}
              placeholder="192.168.1.172"
            />
          </div>
          <Button onClick={saveActiveDevice} disabled={!manualIp.trim()}>
            Save Active Device
          </Button>
          <p className="text-xs text-zinc-400">
            {deviceSaveStatus ||
              "After Wi-Fi provisioning, the detected IP will be filled in here."}
          </p>
        </div>

        <p className="text-xs text-zinc-500">
          Manifest and binaries are served by backend API endpoints. For local
          `pio` runs, your `.env` Wi-Fi fallback still works.
        </p>
      </CardContent>
    </Card>
  );
}
