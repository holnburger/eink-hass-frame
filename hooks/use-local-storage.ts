"use client";

import { useSyncExternalStore } from "react";

type CacheEntry = {
  raw: string | null;
  value: unknown;
};

const storageCache = new Map<string, CacheEntry>();

type BrowserStorageKind = "local" | "session";

function getBrowserStorage(kind: BrowserStorageKind) {
  if (typeof window === "undefined") {
    return null;
  }
  return kind === "session" ? window.sessionStorage : window.localStorage;
}

function readBrowserStorageValue<T>(
  kind: BrowserStorageKind,
  key: string,
  initialValue: T,
): T {
  const storage = getBrowserStorage(kind);
  if (!storage) {
    return initialValue;
  }

  try {
    const raw = storage.getItem(key);
    const cacheKey = `${kind}:${key}`;
    const cached = storageCache.get(cacheKey);
    if (cached && cached.raw === raw) {
      return cached.value as T;
    }

    const parsed = raw !== null ? (JSON.parse(raw) as T) : initialValue;
    storageCache.set(cacheKey, { raw, value: parsed });
    return parsed;
  } catch {
    return initialValue;
  }
}

function useBrowserStorage<T>(
  kind: BrowserStorageKind,
  key: string,
  initialValue: T,
) {
  const value = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => {};
      }

      const handler = () => onStoreChange();
      window.addEventListener("storage", handler);
      window.addEventListener(`${kind}-storage`, handler);

      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(`${kind}-storage`, handler);
      };
    },
    () => readBrowserStorageValue(kind, key, initialValue),
    () => initialValue,
  );

  const setValue = (nextValue: T | ((prev: T) => T)) => {
    if (typeof window === "undefined") {
      return;
    }

    const storage = getBrowserStorage(kind);
    if (!storage) {
      return;
    }

    try {
      const resolved =
        typeof nextValue === "function"
          ? (nextValue as (prev: T) => T)(
              readBrowserStorageValue(kind, key, initialValue),
            )
          : nextValue;

      const raw = JSON.stringify(resolved);
      storage.setItem(key, raw);
      storageCache.set(`${kind}:${key}`, { raw, value: resolved });
      window.dispatchEvent(new Event(`${kind}-storage`));
    } catch {
      // ignore persistence errors
    }
  };

  return [value, setValue] as const;
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  return useBrowserStorage("local", key, initialValue);
}

export function useSessionStorage<T>(key: string, initialValue: T) {
  return useBrowserStorage("session", key, initialValue);
}
