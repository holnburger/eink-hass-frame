"use client";

import { useEffect, useMemo, useState } from "react";

import {
  collectBoundEntityIds,
  collectThermostatHistoryEntityIds,
  DEFAULT_HOME_ASSISTANT_CONFIG,
  isHomeAssistantConfigured,
  type HomeAssistantConfig,
  type HomeAssistantEntityState,
} from "@/lib/home-assistant";
import type { BuildConfig } from "@/lib/layout-config";
import type { AppRuntimeInfo } from "@/lib/runtime-info";

type UseHomeAssistantLiveStatesOptions = {
  buildConfig: BuildConfig;
  resolveBrowserAppPath: (path: string) => string;
  runtimeInfo: AppRuntimeInfo;
};

export function useHomeAssistantLiveStates({
  buildConfig,
  resolveBrowserAppPath,
  runtimeInfo,
}: UseHomeAssistantLiveStatesOptions) {
  const [homeAssistantStates, setHomeAssistantStates] = useState<
    Record<string, HomeAssistantEntityState>
  >({});

  const boundEntityIds = useMemo(
    () => collectBoundEntityIds(buildConfig.pages),
    [buildConfig.pages],
  );
  const thermostatHistoryEntityIds = useMemo(
    () => collectThermostatHistoryEntityIds(buildConfig.pages),
    [buildConfig.pages],
  );
  const boundEntityCount = useMemo(
    () => boundEntityIds.length,
    [boundEntityIds],
  );
  const homeAssistantConnectionReady = useMemo(
    () =>
      isHomeAssistantConfigured(buildConfig.homeAssistant) ||
      (runtimeInfo.addonMode && runtimeInfo.supervisorConnected),
    [
      buildConfig.homeAssistant,
      runtimeInfo.addonMode,
      runtimeInfo.supervisorConnected,
    ],
  );
  const homeAssistantRequestConfig = useMemo<HomeAssistantConfig>(
    () =>
      runtimeInfo.addonMode && runtimeInfo.supervisorConnected
        ? DEFAULT_HOME_ASSISTANT_CONFIG
        : buildConfig.homeAssistant,
    [
      buildConfig.homeAssistant,
      runtimeInfo.addonMode,
      runtimeInfo.supervisorConnected,
    ],
  );
  const shouldSyncLiveStates =
    homeAssistantConnectionReady && boundEntityIds.length > 0;

  useEffect(() => {
    if (!shouldSyncLiveStates) {
      return;
    }

    let cancelled = false;

    async function syncStates() {
      try {
        const response = await fetch(
          resolveBrowserAppPath("/api/home-assistant/states"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: homeAssistantRequestConfig.url,
              token: homeAssistantRequestConfig.token,
              entityIds: boundEntityIds,
              thermostatHistoryEntityIds,
            }),
          },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          entities?: Record<string, HomeAssistantEntityState>;
        };
        if (!cancelled && response.ok && payload.ok !== false) {
          setHomeAssistantStates(payload.entities ?? {});
        }
      } catch {
        if (!cancelled) {
          setHomeAssistantStates({});
        }
      }
    }

    void syncStates();
    const timer = window.setInterval(() => {
      void syncStates();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    boundEntityIds,
    homeAssistantRequestConfig,
    resolveBrowserAppPath,
    shouldSyncLiveStates,
    thermostatHistoryEntityIds,
  ]);

  return {
    boundEntityCount,
    homeAssistantConnectionReady,
    homeAssistantRequestConfig,
    homeAssistantStates: shouldSyncLiveStates ? homeAssistantStates : {},
  };
}
