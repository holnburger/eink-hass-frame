"use client";

import { useEffect } from "react";

import { useSessionStorage } from "@/hooks/use-local-storage";
import {
  DEFAULT_HOME_ASSISTANT_CONFIG,
  type HomeAssistantConfig,
} from "@/lib/home-assistant";

export function useHomeAssistantSessionConfig() {
  const [homeAssistant, setHomeAssistant] =
    useSessionStorage<HomeAssistantConfig>(
      "hass.homeAssistant",
      DEFAULT_HOME_ASSISTANT_CONFIG,
    );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const legacyHomeAssistant = window.localStorage.getItem(
        "hass.homeAssistant",
      );
      const sessionHomeAssistant = window.sessionStorage.getItem(
        "hass.homeAssistant",
      );
      if (legacyHomeAssistant && !sessionHomeAssistant) {
        window.sessionStorage.setItem("hass.homeAssistant", legacyHomeAssistant);
        window.dispatchEvent(new Event("session-storage"));
      }
      window.localStorage.removeItem("hass.homeAssistant");
    } catch {
      // ignore storage migration errors
    }
  }, []);

  return [homeAssistant, setHomeAssistant] as const;
}
