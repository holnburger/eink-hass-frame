"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, Usb } from "lucide-react";

import { UsbInstallButton } from "@/components/dashboard/usb-install-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SavedDevice = {
  id: string;
  name: string;
  ip: string;
  lastSeen: string;
};

type UsbFlashCardProps = {
  onSaveActiveDevice: (device: SavedDevice) => void;
};

export function UsbFlashCard({ onSaveActiveDevice }: UsbFlashCardProps) {
  const [artifactsReady, setArtifactsReady] = useState(false);
  const [checkingBinaries, setCheckingBinaries] = useState(true);
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
      setDeviceSaveStatus("Enter the device IP.");
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
      setDeviceSaveStatus(`Saved ${normalizedName}.`);
    } catch {
      setDeviceSaveStatus("Save failed.");
    }
  }, [deviceName, manualIp, onSaveActiveDevice]);

  const handleDetectedDeviceUrl = useCallback((deviceUrl: string) => {
    try {
      const parsed = new URL(deviceUrl);
      if (!parsed.hostname) {
        return;
      }
      setManualIp(parsed.hostname);
      setDeviceSaveStatus(`Detected ${parsed.hostname}.`);
    } catch {
      // Ignore malformed URLs coming from the external flash tool.
    }
  }, []);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-panel-strong">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle>Flash Device</CardTitle>
          <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-panel px-4 py-2 text-sm font-medium text-muted-foreground">
            {checkingBinaries ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Checking
              </>
            ) : artifactsReady ? (
              <>
                <Check className="h-4 w-4" />
                Ready
              </>
            ) : (
              <>
                <Usb className="h-4 w-4" />
                Missing
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 p-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl border border-border bg-panel-subtle p-4">
          {checkingBinaries ? (
            <p className="text-sm text-muted-foreground">
              Checking firmware…
            </p>
          ) : artifactsReady ? (
            <UsbInstallButton
              manifest="/api/firmware/manifest"
              onDetectedDeviceUrl={handleDetectedDeviceUrl}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Firmware unavailable.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void checkFirmwareBinaries()}
              >
                Check Again
              </Button>
            </div>
          )}
        </div>

        <div
          id="finalize-setup"
          className="rounded-3xl border border-border bg-panel p-4"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device-name-final">Device Name</Label>
              <Input
                id="device-name-final"
                value={deviceName}
                onChange={(event) => setDeviceName(event.target.value)}
                placeholder="Kitchen Display"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-ip-final">Device IP</Label>
              <Input
                id="device-ip-final"
                value={manualIp}
                onChange={(event) => setManualIp(event.target.value)}
                placeholder="192.168.1.172"
              />
            </div>

            <Button onClick={saveActiveDevice} disabled={!manualIp.trim()}>
              Save Device
            </Button>

            <div className="rounded-2xl border border-border bg-panel-subtle px-4 py-3 text-sm text-muted-foreground">
              {deviceSaveStatus || "IP appears here after Wi-Fi setup."}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
