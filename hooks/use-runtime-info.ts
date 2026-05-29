"use client";

import { useEffect, useMemo, useState } from "react";

import { getBrowserAppBasePath, resolveAppPath } from "@/lib/app-path";
import {
  DEFAULT_APP_RUNTIME_INFO,
  type AppRuntimeInfo,
} from "@/lib/runtime-info";

export function useRuntimeInfo() {
  const [runtimeInfo, setRuntimeInfo] = useState<AppRuntimeInfo>(
    DEFAULT_APP_RUNTIME_INFO,
  );
  const appBasePath = useMemo(
    () => getBrowserAppBasePath(runtimeInfo.ingressPath),
    [runtimeInfo.ingressPath],
  );
  const resolveBrowserAppPath = useMemo(
    () => (path: string) => resolveAppPath(path, appBasePath),
    [appBasePath],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRuntimeInfo() {
      try {
        const response = await fetch(
          resolveAppPath("/api/runtime-info", getBrowserAppBasePath()),
          {
            cache: "no-store",
          },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          runtime?: AppRuntimeInfo;
        };

        if (
          !cancelled &&
          response.ok &&
          payload.ok !== false &&
          payload.runtime
        ) {
          setRuntimeInfo(payload.runtime);
        }
      } catch {
        if (!cancelled) {
          setRuntimeInfo(DEFAULT_APP_RUNTIME_INFO);
        }
      }
    }

    void loadRuntimeInfo();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    appBasePath,
    resolveBrowserAppPath,
    runtimeInfo,
  };
}
