"use client";

import { useEffect, useState } from "react";
import { Search, Unplug, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isHomeAssistantConfigured,
  type HomeAssistantBinding,
  type HomeAssistantConfig,
  type HomeAssistantEntitySummary,
} from "@/lib/home-assistant";

type HomeAssistantEntityPickerProps = {
  homeAssistant: HomeAssistantConfig;
  supportedDomains: string[];
  value?: HomeAssistantBinding;
  onChange: (binding?: HomeAssistantBinding) => void;
};

export function HomeAssistantEntityPicker({
  homeAssistant,
  supportedDomains,
  value,
  onChange,
}: HomeAssistantEntityPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HomeAssistantEntitySummary[]>([]);
  const [status, setStatus] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const supportedDomainsKey = supportedDomains.join(",");

  useEffect(() => {
    if (!isHomeAssistantConfigured(homeAssistant)) {
      setResults([]);
      setStatus("");
      return;
    }

    const trimmedQuery = query.trim();
    const searchDomains = supportedDomainsKey
      ? supportedDomainsKey.split(",")
      : [];
    if (searchDomains.length === 0 || trimmedQuery.length < 2) {
      setResults([]);
      setStatus(
        trimmedQuery.length === 1 ? "Type at least 2 characters to search." : "",
      );
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setStatus("");
      try {
        const response = await fetch("/api/home-assistant/entities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: homeAssistant.url,
            token: homeAssistant.token,
            query: trimmedQuery,
            domains: searchDomains,
            limit: 12,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          entities?: HomeAssistantEntitySummary[];
        };

        if (cancelled) {
          return;
        }

        if (!response.ok || payload.ok === false) {
          setResults([]);
          setStatus(payload.error ?? "Search failed.");
          return;
        }

        const nextResults = Array.isArray(payload.entities)
          ? payload.entities
          : [];
        setResults(nextResults);
        setStatus(
          nextResults.length === 0 ? "No matching entities found." : "",
        );
      } catch {
        if (!cancelled) {
          setResults([]);
          setStatus("Search failed.");
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [homeAssistant, query, supportedDomainsKey]);

  if (supportedDomains.length === 0) {
    return null;
  }

  const compatibleDomains = supportedDomains.join(", ");

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-zinc-100">
          Home Assistant Entity
        </p>
        <p className="text-xs text-zinc-500">
          Compatible domains: {compatibleDomains}
        </p>
      </div>

      {value ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-100">
              {value.friendlyName ?? value.entityId}
            </p>
            <p className="truncate text-xs text-zinc-500">{value.entityId}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-8 shrink-0"
            onClick={() => onChange(undefined)}
            aria-label="Clear Home Assistant entity"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {isHomeAssistantConfigured(homeAssistant) ? (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search entities by name or entity_id"
              className="pl-9"
            />
          </div>

          {isSearching ? (
            <p className="text-xs text-zinc-500">Searching Home Assistant...</p>
          ) : null}

          {results.length > 0 ? (
            <div className="max-h-48 space-y-2 overflow-auto">
              {results.map((entity) => (
                <button
                  key={entity.entityId}
                  type="button"
                  onClick={() =>
                    onChange({
                      entityId: entity.entityId,
                      friendlyName: entity.friendlyName,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-left transition hover:border-zinc-600"
                >
                  <p className="truncate text-sm font-medium text-zinc-100">
                    {entity.friendlyName}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {entity.entityId}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {entity.state}
                    {entity.unitOfMeasurement ? ` ${entity.unitOfMeasurement}` : ""}
                  </p>
                </button>
              ))}
            </div>
          ) : null}

          {status ? <p className="text-xs text-zinc-500">{status}</p> : null}
        </>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 px-3 py-3 text-xs text-zinc-400">
          <Unplug className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Add your Home Assistant URL and long-lived access token first to
            search and bind entities.
          </p>
        </div>
      )}
    </div>
  );
}
