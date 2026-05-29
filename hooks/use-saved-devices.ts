"use client";

import { useEffect, useMemo, useState } from "react";

export type SavedDevice = {
  id: string;
  name: string;
  ip: string;
  lastSeen: string;
};

export function isSavedDevice(value: unknown): value is SavedDevice {
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

export function useSavedDevices() {
  const [savedDevices, setSavedDevices] = useState<SavedDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState("");
  const [showUsbSetup, setShowUsbSetup] = useState(false);
  const [deviceStoreReady, setDeviceStoreReady] = useState(false);

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

  return {
    activeDevice,
    activeDeviceId,
    handleDeleteActiveDevice,
    handleSaveActiveDevice,
    setActiveDeviceId,
    setShowUsbSetup,
    showUsbOnboarding,
    showUsbSetup,
    validSavedDevices,
  };
}
