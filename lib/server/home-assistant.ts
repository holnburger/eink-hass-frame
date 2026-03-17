import {
  matchHomeAssistantWeatherHourlySensorEntity,
  entityMatchesDomains,
  entityMatchesWidgetType,
  getEntityDomain,
  getFriendlyEntityName,
  normalizeHomeAssistantUrl,
  THERMOSTAT_HISTORY_POINT_COUNT,
  type HomeAssistantEntityState,
  type HomeAssistantEntitySummary,
  type HomeAssistantWidgetType,
} from "@/lib/home-assistant";

type RawHomeAssistantState = {
  entity_id?: unknown;
  state?: unknown;
  attributes?: unknown;
};

type RawHomeAssistantHistoryState = {
  entity_id?: unknown;
  state?: unknown;
  last_changed?: unknown;
  last_updated?: unknown;
  attributes?: unknown;
};

function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function toEntityState(
  rawState: RawHomeAssistantState,
): HomeAssistantEntityState | null {
  const entityId =
    typeof rawState.entity_id === "string" ? rawState.entity_id.trim() : "";
  if (!entityId) {
    return null;
  }

  const attributes =
    rawState.attributes && typeof rawState.attributes === "object"
      ? (rawState.attributes as Record<string, unknown>)
      : {};

  return {
    entityId,
    domain: getEntityDomain(entityId),
    state: typeof rawState.state === "string" ? rawState.state : String(rawState.state ?? ""),
    friendlyName: getFriendlyEntityName(entityId, attributes),
    attributes,
  };
}

function summarizeEntity(
  state: HomeAssistantEntityState,
): HomeAssistantEntitySummary {
  return {
    entityId: state.entityId,
    domain: state.domain,
    friendlyName: state.friendlyName,
    state: state.state,
    unitOfMeasurement:
      typeof state.attributes.unit_of_measurement === "string"
        ? state.attributes.unit_of_measurement
        : "",
  };
}

async function fetchStates(
  url: string,
  token: string,
): Promise<HomeAssistantEntityState[]> {
  const normalizedUrl = normalizeHomeAssistantUrl(url);
  if (!normalizedUrl || !token.trim()) {
    throw new Error("Home Assistant URL and token are required.");
  }

  const response = await fetch(`${normalizedUrl}/api/states`, {
    headers: getHeaders(token.trim()),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(
      `Home Assistant request failed with HTTP ${response.status}.`,
    );
  }

  const payload = (await response.json()) as RawHomeAssistantState[];
  if (!Array.isArray(payload)) {
    throw new Error("Home Assistant returned an unexpected payload.");
  }

  return payload
    .map((state) => toEntityState(state))
    .filter((state): state is HomeAssistantEntityState => state !== null);
}

async function fetchWeatherForecasts(input: {
  url: string;
  token: string;
  entityIds: string[];
  type: "daily" | "hourly";
}) {
  const entityIds = Array.from(
    new Set(
      input.entityIds
        .map((entityId) => entityId.trim())
        .filter((entityId) => entityId.length > 0),
    ),
  );
  if (entityIds.length === 0) {
    return {};
  }

  const normalizedUrl = normalizeHomeAssistantUrl(input.url);
  const response = await fetch(
    `${normalizedUrl}/api/services/weather/get_forecasts?return_response`,
    {
      method: "POST",
      headers: getHeaders(input.token.trim()),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        entity_id: entityIds,
        type: input.type,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Home Assistant forecast request failed with HTTP ${response.status}.`,
    );
  }

  const payload = (await response.json()) as {
    service_response?: Record<
      string,
      | {
          forecast?: unknown;
        }
      | undefined
    >;
  };
  const serviceResponse =
    payload.service_response && typeof payload.service_response === "object"
      ? payload.service_response
      : {};
  const result: Record<string, unknown[]> = {};

  for (const entityId of entityIds) {
    const forecast =
      serviceResponse[entityId] &&
      typeof serviceResponse[entityId] === "object" &&
      Array.isArray(serviceResponse[entityId]?.forecast)
        ? serviceResponse[entityId]?.forecast
        : undefined;
    if (forecast) {
      result[entityId] = forecast;
    }
  }

  return result;
}

function asFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractClimateHistoryTemperature(
  rawState: RawHomeAssistantHistoryState,
) {
  const attributes =
    rawState.attributes && typeof rawState.attributes === "object"
      ? (rawState.attributes as Record<string, unknown>)
      : {};
  return (
    asFiniteNumber(attributes.current_temperature) ??
    asFiniteNumber(attributes.temperature) ??
    asFiniteNumber(rawState.state)
  );
}

function sampleClimateTemperatureHistory(
  rawStates: RawHomeAssistantHistoryState[],
  now = new Date(),
) {
  const parsedStates = rawStates
    .flatMap((rawState) => {
      const datetime =
        typeof rawState.last_changed === "string"
          ? rawState.last_changed
          : typeof rawState.last_updated === "string"
            ? rawState.last_updated
            : "";
      const date = datetime ? new Date(datetime) : null;
      const temperature = extractClimateHistoryTemperature(rawState);
      if (!date || !Number.isFinite(date.getTime()) || temperature === null) {
        return [];
      }

      return [
        {
          epochMs: date.getTime(),
          datetime: date.toISOString(),
          temperature: Number(temperature.toFixed(1)),
        },
      ];
    })
    .sort((left, right) => left.epochMs - right.epochMs);

  const startTime = new Date(now.getTime());
  startTime.setMinutes(0, 0, 0);
  startTime.setHours(
    startTime.getHours() - (THERMOSTAT_HISTORY_POINT_COUNT - 1),
  );

  const fallbackValue =
    parsedStates[0]?.temperature ?? parsedStates.at(-1)?.temperature ?? null;
  let cursor = 0;
  let lastKnownTemperature: number | null = null;

  return Array.from({ length: THERMOSTAT_HISTORY_POINT_COUNT }, (_, index) => {
    const slotDate = new Date(startTime.getTime());
    slotDate.setHours(slotDate.getHours() + index);
    const slotEpoch = slotDate.getTime();

    while (
      cursor < parsedStates.length &&
      parsedStates[cursor].epochMs <= slotEpoch
    ) {
      lastKnownTemperature = parsedStates[cursor].temperature;
      cursor += 1;
    }

    return {
      datetime: slotDate.toISOString(),
      temperature: lastKnownTemperature ?? fallbackValue,
    };
  });
}

async function fetchClimateTemperatureHistories(input: {
  url: string;
  token: string;
  entityIds: string[];
}) {
  const entityIds = Array.from(
    new Set(
      input.entityIds
        .map((entityId) => entityId.trim())
        .filter((entityId) => entityId.length > 0),
    ),
  );
  if (entityIds.length === 0) {
    return {};
  }

  const normalizedUrl = normalizeHomeAssistantUrl(input.url);
  const now = new Date();
  const startTime = new Date(now.getTime());
  startTime.setMinutes(0, 0, 0);
  startTime.setHours(
    startTime.getHours() - (THERMOSTAT_HISTORY_POINT_COUNT - 1),
  );
  const endTime = now.toISOString();
  const result: Record<
    string,
    Array<{ datetime: string; temperature: number | null }>
  > = {};

  await Promise.all(
    entityIds.map(async (entityId) => {
      const response = await fetch(
        `${normalizedUrl}/api/history/period/${encodeURIComponent(
          startTime.toISOString(),
        )}?filter_entity_id=${encodeURIComponent(
          entityId,
        )}&end_time=${encodeURIComponent(endTime)}&significant_changes_only=0`,
        {
          headers: getHeaders(input.token.trim()),
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok) {
        throw new Error(
          `Home Assistant history request failed with HTTP ${response.status}.`,
        );
      }

      const payload = (await response.json()) as unknown;
      if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
        result[entityId] = [];
        return;
      }

      result[entityId] = sampleClimateTemperatureHistory(
        payload[0] as RawHomeAssistantHistoryState[],
        now,
      );
    }),
  );

  return result;
}

export async function searchHomeAssistantEntities(input: {
  url: string;
  token: string;
  query?: string;
  widgetType?: HomeAssistantWidgetType;
  domains?: string[];
  limit?: number;
}) {
  const query = input.query?.trim().toLowerCase() ?? "";
  const limit = Math.max(1, Math.min(100, input.limit ?? 30));
  const states = await fetchStates(input.url, input.token);

  const filtered = states
    .filter((state) =>
      input.domains && input.domains.length > 0
        ? entityMatchesDomains(state.entityId, input.domains)
        : input.widgetType
        ? entityMatchesWidgetType(state.entityId, input.widgetType)
        : true,
    )
    .filter((state) => {
      if (!query) {
        return true;
      }
      return (
        state.entityId.toLowerCase().includes(query) ||
        state.friendlyName.toLowerCase().includes(query)
      );
    })
    .sort((left, right) =>
      left.friendlyName.localeCompare(right.friendlyName, undefined, {
        sensitivity: "base",
      }),
    );

  return {
    total: filtered.length,
    entities: filtered.slice(0, limit).map((state) => summarizeEntity(state)),
  };
}

export async function fetchSelectedHomeAssistantStates(input: {
  url: string;
  token: string;
  entityIds: string[];
  thermostatHistoryEntityIds?: string[];
}) {
  const entityIds = Array.from(
    new Set(
      input.entityIds
        .map((entityId) => entityId.trim())
        .filter((entityId) => entityId.length > 0),
    ),
  );
  if (entityIds.length === 0) {
    return {};
  }

  const states = await fetchStates(input.url, input.token);
  const selected = new Set(entityIds);
  const result: Record<string, HomeAssistantEntityState> = {};
  const weatherEntityIds: string[] = [];

  for (const state of states) {
    if (selected.has(state.entityId)) {
      result[state.entityId] = state;
      if (state.domain === "weather") {
        weatherEntityIds.push(state.entityId);
      }
    }
  }

  if (weatherEntityIds.length > 0) {
    for (const state of states) {
      if (result[state.entityId]) {
        continue;
      }

      for (const weatherEntityId of weatherEntityIds) {
        if (
          matchHomeAssistantWeatherHourlySensorEntity(
            weatherEntityId,
            state.entityId,
          )
        ) {
          result[state.entityId] = state;
          break;
        }
      }
    }
  }

  if (weatherEntityIds.length > 0) {
    let dailyForecasts: Record<string, unknown[]> = {};
    let hourlyForecasts: Record<string, unknown[]> = {};
    try {
      dailyForecasts = await fetchWeatherForecasts({
        url: input.url,
        token: input.token,
        entityIds: weatherEntityIds,
        type: "daily",
      });
    } catch {
      // Keep current weather state data even if the daily forecast service is unavailable.
    }

    try {
      hourlyForecasts = await fetchWeatherForecasts({
        url: input.url,
        token: input.token,
        entityIds: weatherEntityIds,
        type: "hourly",
      });
    } catch {
      // Keep current weather state data even if the hourly forecast service is unavailable.
    }

    for (const entityId of weatherEntityIds) {
      if (!result[entityId]) {
        continue;
      }
      result[entityId] = {
        ...result[entityId],
        attributes: {
          ...result[entityId].attributes,
          ...(dailyForecasts[entityId]
            ? {
                forecast: dailyForecasts[entityId],
                daily_forecast: dailyForecasts[entityId],
              }
            : {}),
          ...(hourlyForecasts[entityId]
            ? {
                hourly_forecast: hourlyForecasts[entityId],
              }
            : {}),
        },
      };
    }
  }

  const thermostatHistoryEntityIds = Array.from(
    new Set(
      (input.thermostatHistoryEntityIds ?? [])
        .map((entityId) => entityId.trim())
        .filter((entityId) => entityId.length > 0),
    ),
  );
  if (thermostatHistoryEntityIds.length > 0) {
    try {
      const thermostatHistories = await fetchClimateTemperatureHistories({
        url: input.url,
        token: input.token,
        entityIds: thermostatHistoryEntityIds,
      });

      for (const entityId of thermostatHistoryEntityIds) {
        if (!result[entityId]) {
          continue;
        }
        result[entityId] = {
          ...result[entityId],
          attributes: {
            ...result[entityId].attributes,
            temperature_history: thermostatHistories[entityId] ?? [],
          },
        };
      }
    } catch {
      // Keep current thermostat state data even if the history endpoint is unavailable.
    }
  }

  return result;
}
