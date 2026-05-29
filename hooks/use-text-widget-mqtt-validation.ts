"use client";

import { useEffect, useMemo, useState } from "react";

import type { HomeAssistantConfig } from "@/lib/home-assistant";
import {
  getTextWidgetMqttEntityIdForMode,
  normalizeTextWidgetMqttName,
  type PageConfig,
} from "@/lib/layout-config";

export type TextWidgetMqttValidation = {
  entityId: string;
  invalidReason?: string;
  duplicateInLayout?: boolean;
  existsInHomeAssistant?: boolean;
  checking?: boolean;
  lookupError?: string;
};

type BaseTextWidgetMqttValidation = Pick<
  TextWidgetMqttValidation,
  "duplicateInLayout" | "entityId" | "invalidReason"
>;

type UseTextWidgetMqttValidationOptions = {
  homeAssistantConnectionReady: boolean;
  homeAssistantRequestConfig: HomeAssistantConfig;
  pages: PageConfig[];
  resolveBrowserAppPath: (path: string) => string;
};

export function createTextWidgetMqttBaseValidation(pages: PageConfig[]) {
  const nameCounts = new Map<string, number>();
  const validationById = new Map<string, BaseTextWidgetMqttValidation>();

  for (const page of pages) {
    for (const widget of page.widgets) {
      if (widget.type !== "text" || widget.mqttExpose !== true) {
        continue;
      }

      const normalizedName = normalizeTextWidgetMqttName(widget.mqttName);
      const entityId = getTextWidgetMqttEntityIdForMode(
        normalizedName,
        widget.mqttMode,
      );
      validationById.set(widget.id, {
        entityId,
        invalidReason:
          normalizedName.length === 0
            ? "Enter an input name with letters, numbers, or underscores."
            : undefined,
      });

      if (entityId) {
        nameCounts.set(entityId, (nameCounts.get(entityId) ?? 0) + 1);
      }
    }
  }

  for (const [, validation] of validationById) {
    if (
      validation.entityId &&
      (nameCounts.get(validation.entityId) ?? 0) > 1
    ) {
      validation.duplicateInLayout = true;
    }
  }

  return Object.fromEntries(validationById);
}

export function useTextWidgetMqttValidation({
  homeAssistantConnectionReady,
  homeAssistantRequestConfig,
  pages,
  resolveBrowserAppPath,
}: UseTextWidgetMqttValidationOptions) {
  const [existingHomeAssistantTextEntityIds, setExistingHomeAssistantTextEntityIds] =
    useState<Record<string, true>>({});
  const [textWidgetValidationPending, setTextWidgetValidationPending] =
    useState(false);
  const [textWidgetValidationError, setTextWidgetValidationError] =
    useState("");

  const baseValidationById = useMemo(
    () => createTextWidgetMqttBaseValidation(pages),
    [pages],
  );

  const textWidgetEntityIdsToValidate = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(baseValidationById)
            .filter(
              (validation) =>
                validation.entityId.length > 0 &&
                !validation.invalidReason &&
                !validation.duplicateInLayout,
            )
            .map((validation) => validation.entityId),
        ),
      ),
    [baseValidationById],
  );

  useEffect(() => {
    if (
      !homeAssistantConnectionReady ||
      textWidgetEntityIdsToValidate.length === 0
    ) {
      setExistingHomeAssistantTextEntityIds({});
      setTextWidgetValidationPending(false);
      setTextWidgetValidationError("");
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setTextWidgetValidationPending(true);
      setTextWidgetValidationError("");

      try {
        const response = await fetch(
          resolveBrowserAppPath("/api/home-assistant/entity-presence"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: homeAssistantRequestConfig.url,
              token: homeAssistantRequestConfig.token,
              entityIds: textWidgetEntityIdsToValidate,
            }),
          },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          existingEntityIds?: string[];
          error?: string;
        };

        if (cancelled) {
          return;
        }

        if (!response.ok || payload.ok === false) {
          setExistingHomeAssistantTextEntityIds({});
          setTextWidgetValidationError(
            payload.error ?? "Unable to validate Home Assistant entity names.",
          );
          return;
        }

        const nextExisting = Object.fromEntries(
          (payload.existingEntityIds ?? []).map((entityId) => [
            entityId.toLowerCase(),
            true,
          ]),
        ) as Record<string, true>;
        setExistingHomeAssistantTextEntityIds(nextExisting);
        setTextWidgetValidationError("");
      } catch {
        if (!cancelled) {
          setExistingHomeAssistantTextEntityIds({});
          setTextWidgetValidationError(
            "Unable to validate Home Assistant entity names right now.",
          );
        }
      } finally {
        if (!cancelled) {
          setTextWidgetValidationPending(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    homeAssistantConnectionReady,
    homeAssistantRequestConfig,
    resolveBrowserAppPath,
    textWidgetEntityIdsToValidate,
  ]);

  const textWidgetMqttValidationById = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(baseValidationById).map(([widgetId, validation]) => [
          widgetId,
          {
            ...validation,
            existsInHomeAssistant: Boolean(
              existingHomeAssistantTextEntityIds[
                validation.entityId.toLowerCase()
              ],
            ),
            checking:
              textWidgetValidationPending &&
              Boolean(validation.entityId) &&
              !validation.invalidReason &&
              !validation.duplicateInLayout,
            lookupError: textWidgetValidationError || undefined,
          },
        ]),
      ) as Record<string, TextWidgetMqttValidation>,
    [
      baseValidationById,
      existingHomeAssistantTextEntityIds,
      textWidgetValidationError,
      textWidgetValidationPending,
    ],
  );

  return {
    textWidgetMqttValidationById,
  };
}
