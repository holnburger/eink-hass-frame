"use client";

import { useSyncExternalStore } from "react";

type CacheEntry = {
  raw: string | null;
  value: unknown;
};

const storageCache = new Map<string, CacheEntry>();

function readLocalStorageValue<T>(key: string, initialValue: T): T {
  if (typeof window === "undefined") {
    return initialValue;
  }

  try {
    const raw = window.localStorage.getItem(key);
    const cached = storageCache.get(key);
    if (cached && cached.raw === raw) {
      return cached.value as T;
    }

    const parsed = raw !== null ? (JSON.parse(raw) as T) : initialValue;
    storageCache.set(key, { raw, value: parsed });
    return parsed;
  } catch {
    return initialValue;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const value = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => {};
      }

      const handler = () => onStoreChange();
      window.addEventListener("storage", handler);
      window.addEventListener("local-storage", handler);

      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener("local-storage", handler);
      };
    },
    () => readLocalStorageValue(key, initialValue),
    () => initialValue,
  );

  const setValue = (nextValue: T | ((prev: T) => T)) => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const resolved =
        typeof nextValue === "function"
          ? (nextValue as (prev: T) => T)(readLocalStorageValue(key, initialValue))
          : nextValue;

      const raw = JSON.stringify(resolved);
      window.localStorage.setItem(key, raw);
      storageCache.set(key, { raw, value: resolved });
      window.dispatchEvent(new Event("local-storage"));
    } catch {
      // ignore persistence errors
    }
  };

  return [value, setValue] as const;
}
