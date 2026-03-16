import {
  entityMatchesDomains,
  entityMatchesWidgetType,
  getEntityDomain,
  getFriendlyEntityName,
  normalizeHomeAssistantUrl,
  type HomeAssistantEntityState,
  type HomeAssistantEntitySummary,
  type HomeAssistantWidgetType,
} from "@/lib/home-assistant";

type RawHomeAssistantState = {
  entity_id?: unknown;
  state?: unknown;
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

  return result;
}
