export const HOME_ASSISTANT_WIDGET_TYPES = [
  "weather",
  "progress",
  "switch",
  "slider",
  "thermostat",
] as const;
export const HOME_ASSISTANT_PAGE_TYPES = [
  "weather-focus",
  "media-player",
] as const;

export type HomeAssistantWidgetType =
  (typeof HOME_ASSISTANT_WIDGET_TYPES)[number];
export type HomeAssistantPageType = (typeof HOME_ASSISTANT_PAGE_TYPES)[number];

export type HomeAssistantConfig = {
  url: string;
  token: string;
};

export type HomeAssistantBinding = {
  entityId: string;
  friendlyName?: string;
};

export type HomeAssistantEntityState = {
  entityId: string;
  domain: string;
  state: string;
  friendlyName: string;
  attributes: Record<string, unknown>;
};

export type HomeAssistantEntitySummary = {
  entityId: string;
  domain: string;
  friendlyName: string;
  state: string;
  unitOfMeasurement: string;
};

export const DEFAULT_HOME_ASSISTANT_CONFIG: HomeAssistantConfig = {
  url: "",
  token: "",
};

export function normalizeHomeAssistantUrl(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/\/+$/, "");
}

export function normalizeHomeAssistantConfig(
  value: unknown,
): HomeAssistantConfig {
  if (!value || typeof value !== "object") {
    return DEFAULT_HOME_ASSISTANT_CONFIG;
  }

  const candidate = value as Record<string, unknown>;
  return {
    url: normalizeHomeAssistantUrl(candidate.url),
    token: typeof candidate.token === "string" ? candidate.token.trim() : "",
  };
}

export function normalizeHomeAssistantBinding(
  value: unknown,
): HomeAssistantBinding | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const entityId =
    typeof candidate.entityId === "string" ? candidate.entityId.trim() : "";
  if (!entityId) {
    return undefined;
  }

  return {
    entityId,
    friendlyName:
      typeof candidate.friendlyName === "string" &&
      candidate.friendlyName.trim().length > 0
        ? candidate.friendlyName.trim()
        : undefined,
  };
}

export function widgetSupportsHomeAssistant(
  widgetType: string,
): widgetType is HomeAssistantWidgetType {
  return HOME_ASSISTANT_WIDGET_TYPES.some((type) => type === widgetType);
}

export function pageSupportsHomeAssistant(
  pageType: string,
): pageType is HomeAssistantPageType {
  return HOME_ASSISTANT_PAGE_TYPES.some((type) => type === pageType);
}

export function getEntityDomain(entityId: string) {
  const separatorIndex = entityId.indexOf(".");
  return separatorIndex > 0 ? entityId.slice(0, separatorIndex) : "";
}

export function getCompatibleDomainsForWidget(
  widgetType: HomeAssistantWidgetType,
) {
  switch (widgetType) {
    case "weather":
      return ["weather"];
    case "progress":
      return [
        "sensor",
        "input_number",
        "number",
        "counter",
        "humidifier",
        "fan",
      ];
    case "switch":
      return ["switch", "input_boolean", "light", "fan", "automation", "script"];
    case "slider":
      return [
        "light",
        "cover",
        "media_player",
        "fan",
        "input_number",
        "number",
        "humidifier",
      ];
    case "thermostat":
      return ["climate"];
    default:
      return [];
  }
}

export function getCompatibleDomainsForPage(pageType: HomeAssistantPageType) {
  switch (pageType) {
    case "weather-focus":
      return ["weather"];
    case "media-player":
      return ["media_player"];
    default:
      return [];
  }
}

export function entityMatchesDomains(
  entityId: string,
  domains: string[],
) {
  if (domains.length === 0) {
    return true;
  }
  const domain = getEntityDomain(entityId);
  return domains.includes(domain);
}

export function entityMatchesWidgetType(
  entityId: string,
  widgetType: HomeAssistantWidgetType,
) {
  return entityMatchesDomains(
    entityId,
    getCompatibleDomainsForWidget(widgetType),
  );
}

export function isHomeAssistantConfigured(
  config: HomeAssistantConfig | null | undefined,
) {
  return Boolean(config?.url && config?.token);
}

export function getFriendlyEntityName(
  entityId: string,
  attributes: Record<string, unknown>,
) {
  const friendlyName = attributes.friendly_name;
  if (typeof friendlyName === "string" && friendlyName.trim().length > 0) {
    return friendlyName.trim();
  }
  return entityId;
}

function asFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isHomeAssistantEntityUnavailable(
  entity: HomeAssistantEntityState | undefined,
) {
  if (!entity) {
    return false;
  }

  const lowered = entity.state.trim().toLowerCase();
  return lowered === "unavailable" || lowered === "unknown" || lowered === "none";
}

function normalizePercent(value: number, scale = 1) {
  return Math.max(0, Math.min(100, Math.round(value * scale)));
}

function normalizeTemperatureUnitLabel(value: unknown) {
  if (typeof value !== "string") {
    return "°C";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "°C";
  }
  if (trimmed.startsWith("°")) {
    return trimmed;
  }
  if (/^[cCfFkK]$/.test(trimmed)) {
    return `°${trimmed.toUpperCase()}`;
  }
  return trimmed;
}

function parseWeatherDateLike(rawDatetime: unknown) {
  if (typeof rawDatetime !== "string") {
    return null;
  }

  const trimmed = rawDatetime.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  const dateTimeMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/,
  );
  if (dateTimeMatch) {
    const [, year, month, day, hour, minute] = dateTimeMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    );
  }

  const dateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  }

  const parsed = new Date(trimmed);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function formatWeatherForecastLabel(
  rawDatetime: unknown,
  fallbackIndex: number,
  now = new Date(),
) {
  const date = parseWeatherDateLike(rawDatetime);
  if (date) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  const fallbackDate = new Date(now);
  fallbackDate.setDate(fallbackDate.getDate() + fallbackIndex + 1);
  return fallbackDate.toLocaleDateString([], { weekday: "short" });
}

function formatWeatherHourlyLabel(
  rawDatetime: unknown,
  fallbackIndex: number,
  now = new Date(),
) {
  const date = parseWeatherDateLike(rawDatetime);
  if (date) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  const fallbackDate = new Date(now);
  fallbackDate.setHours(fallbackDate.getHours() + fallbackIndex + 1);
  return fallbackDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getWeatherEntryDatetime(candidate: Record<string, unknown>) {
  return typeof candidate.datetime === "string"
    ? candidate.datetime
    : typeof candidate.time === "string"
      ? candidate.time
      : "";
}

function buildWeatherDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function startOfWeatherDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function resolveHomeAssistantEnabled(
  entity: HomeAssistantEntityState | undefined,
) {
  if (!entity) {
    return undefined;
  }

  const lowered = entity.state.toLowerCase();
  return lowered === "on" || lowered === "open" || lowered === "playing";
}

export function resolveHomeAssistantNumericValue(
  entity: HomeAssistantEntityState | undefined,
  widgetType: Exclude<HomeAssistantWidgetType, "weather" | "switch" | "thermostat">,
) {
  if (!entity) {
    return undefined;
  }

  if (widgetType === "progress") {
    const direct = asFiniteNumber(entity.state);
    if (direct !== null) {
      return normalizePercent(direct);
    }

    const percentage = asFiniteNumber(entity.attributes.percentage);
    if (percentage !== null) {
      return normalizePercent(percentage);
    }

    const humidity = asFiniteNumber(entity.attributes.humidity);
    if (humidity !== null) {
      return normalizePercent(humidity);
    }

    return undefined;
  }

  const domain = entity.domain;
  if (domain === "light") {
    const brightness = asFiniteNumber(entity.attributes.brightness);
    return brightness !== null
      ? normalizePercent((brightness / 255) * 100)
      : resolveHomeAssistantEnabled(entity)
        ? 100
        : 0;
  }
  if (domain === "cover") {
    const position = asFiniteNumber(entity.attributes.current_position);
    return position !== null ? normalizePercent(position) : 0;
  }
  if (domain === "media_player") {
    const volumeLevel = asFiniteNumber(entity.attributes.volume_level);
    return volumeLevel !== null ? normalizePercent(volumeLevel * 100) : 0;
  }
  if (domain === "fan") {
    const percentage = asFiniteNumber(entity.attributes.percentage);
    return percentage !== null ? normalizePercent(percentage) : 0;
  }
  if (domain === "humidifier") {
    const humidity = asFiniteNumber(entity.attributes.humidity);
    return humidity !== null ? normalizePercent(humidity) : 0;
  }

  const percentage = asFiniteNumber(entity.attributes.percentage);
  if (percentage !== null) {
    return normalizePercent(percentage);
  }

  const direct = asFiniteNumber(entity.state);
  return direct !== null ? normalizePercent(direct) : undefined;
}

export function resolveHomeAssistantWeather(
  entity: HomeAssistantEntityState | undefined,
) {
  if (!entity) {
    return undefined;
  }

  const temperature =
    asFiniteNumber(entity.attributes.temperature) ??
    asFiniteNumber(entity.attributes.native_temperature);
  return {
    temperature: temperature !== null ? Math.round(temperature) : null,
    temperatureUnit: normalizeTemperatureUnitLabel(
      entity.attributes.temperature_unit ?? entity.attributes.native_temperature_unit,
    ),
    condition: entity.state,
  };
}

type HomeAssistantWeatherForecast = {
  label: string;
  temperature: number | null;
  lowTemperature: number | null;
  condition: string;
  precipitationProbability: number | null;
};

type HomeAssistantHourlyForecast = {
  label: string;
  temperature: number | null;
  precipitationProbability: number | null;
};

export function resolveHomeAssistantWeatherPage(
  entity: HomeAssistantEntityState | undefined,
  options?: {
    now?: Date;
  },
) {
  if (!entity) {
    return undefined;
  }

  const current = resolveHomeAssistantWeather(entity);
  const now = options?.now ?? new Date();
  const todayStart = startOfWeatherDay(now);
  const forecastInput = Array.isArray(entity.attributes.daily_forecast)
    ? entity.attributes.daily_forecast
    : Array.isArray(entity.attributes.forecast)
      ? entity.attributes.forecast
      : [];
  const hourlyForecastInput = Array.isArray(entity.attributes.hourly_forecast)
    ? entity.attributes.hourly_forecast
    : [];
  const forecastCandidates = forecastInput
    .flatMap((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const candidate = entry as Record<string, unknown>;
      const rawDatetime = getWeatherEntryDatetime(candidate);
      const date = parseWeatherDateLike(rawDatetime);
      if (date && startOfWeatherDay(date).getTime() <= todayStart.getTime()) {
        return [];
      }

      return [
        {
          index,
          date,
          rawDatetime,
          candidate,
        },
      ];
    })
    .sort((left, right) => {
      const leftTime = left.date?.getTime() ?? Number.POSITIVE_INFINITY;
      const rightTime = right.date?.getTime() ?? Number.POSITIVE_INFINITY;
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return left.index - right.index;
    });

  const seenDays = new Set<string>();
  const forecast = forecastCandidates
    .flatMap(
      ({
        index,
        date,
        rawDatetime,
        candidate,
      }): HomeAssistantWeatherForecast[] => {
        if (date) {
          const dayKey = buildWeatherDayKey(date);
          if (seenDays.has(dayKey)) {
            return [];
          }
          seenDays.add(dayKey);
        }

        const temperature =
          asFiniteNumber(candidate.temperature) ??
          asFiniteNumber(candidate.native_temperature);
        const lowTemperature =
          asFiniteNumber(candidate.templow) ??
          asFiniteNumber(candidate.native_templow);
        const precipitationProbability = asFiniteNumber(
          candidate.precipitation_probability,
        );

        return [
          {
            label: formatWeatherForecastLabel(rawDatetime, index, now),
            temperature: temperature !== null ? Math.round(temperature) : null,
            lowTemperature:
              lowTemperature !== null ? Math.round(lowTemperature) : null,
            condition:
              typeof candidate.condition === "string"
                ? candidate.condition
                : current?.condition ?? entity.state,
            precipitationProbability:
              precipitationProbability !== null
                ? normalizePercent(precipitationProbability)
                : null,
          },
        ];
      },
    )
    .slice(0, 3);

  const hourlyForecast = hourlyForecastInput
    .flatMap((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const candidate = entry as Record<string, unknown>;
      const rawDatetime = getWeatherEntryDatetime(candidate);
      const date = parseWeatherDateLike(rawDatetime);
      if (date && date.getTime() < now.getTime() - 30 * 60 * 1000) {
        return [];
      }

      return [
        {
          index,
          date,
          rawDatetime,
          candidate,
        },
      ];
    })
    .sort((left, right) => {
      const leftTime = left.date?.getTime() ?? Number.POSITIVE_INFINITY;
      const rightTime = right.date?.getTime() ?? Number.POSITIVE_INFINITY;
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return left.index - right.index;
    })
    .flatMap(
      ({
        index,
        rawDatetime,
        candidate,
      }): HomeAssistantHourlyForecast[] => {
        const temperature =
          asFiniteNumber(candidate.temperature) ??
          asFiniteNumber(candidate.native_temperature);
        const precipitationProbability = asFiniteNumber(
          candidate.precipitation_probability,
        );

        return [
          {
            label: formatWeatherHourlyLabel(rawDatetime, index, now),
            temperature: temperature !== null ? Math.round(temperature) : null,
            precipitationProbability:
              precipitationProbability !== null
                ? normalizePercent(precipitationProbability)
                : null,
          },
        ];
      },
    )
    .slice(0, 6);

  return {
    temperature: current?.temperature ?? null,
    temperatureUnit: current?.temperatureUnit ?? "°C",
    condition: current?.condition ?? entity.state,
    apparentTemperature:
      asFiniteNumber(entity.attributes.apparent_temperature) ??
      asFiniteNumber(entity.attributes.native_apparent_temperature),
    humidity: asFiniteNumber(entity.attributes.humidity),
    windSpeed:
      asFiniteNumber(entity.attributes.wind_speed) ??
      asFiniteNumber(entity.attributes.native_wind_speed),
    windSpeedUnit:
      typeof entity.attributes.wind_speed_unit === "string"
        ? entity.attributes.wind_speed_unit.trim()
        : typeof entity.attributes.native_wind_speed_unit === "string"
          ? entity.attributes.native_wind_speed_unit.trim()
          : "",
    pressure:
      asFiniteNumber(entity.attributes.pressure) ??
      asFiniteNumber(entity.attributes.native_pressure),
    pressureUnit:
      typeof entity.attributes.pressure_unit === "string"
        ? entity.attributes.pressure_unit.trim()
        : typeof entity.attributes.native_pressure_unit === "string"
          ? entity.attributes.native_pressure_unit.trim()
          : "",
    forecast,
    hourlyForecast,
  };
}

export function resolveHomeAssistantThermostat(
  entity: HomeAssistantEntityState | undefined,
) {
  if (!entity) {
    return undefined;
  }

  const current = asFiniteNumber(entity.attributes.current_temperature);
  const targetFromAttributes = asFiniteNumber(entity.attributes.temperature);
  const targetFromState = asFiniteNumber(entity.state);

  return {
    currentValue: current !== null ? Number(current.toFixed(1)) : undefined,
    value:
      targetFromAttributes !== null
        ? Number(targetFromAttributes.toFixed(1))
        : targetFromState !== null
          ? Number(targetFromState.toFixed(1))
          : undefined,
  };
}

export function resolveHomeAssistantMediaPlayer(
  entity: HomeAssistantEntityState | undefined,
  homeAssistantUrl?: string,
) {
  if (!entity) {
    return undefined;
  }

  const rawPicture =
    typeof entity.attributes.entity_picture === "string"
      ? entity.attributes.entity_picture
      : "";
  const coverUrl =
    rawPicture && homeAssistantUrl
      ? rawPicture.startsWith("http://") || rawPicture.startsWith("https://")
        ? rawPicture
        : `${homeAssistantUrl}${rawPicture}`
      : undefined;
  const elapsedSeconds = asFiniteNumber(entity.attributes.media_position);
  const durationSeconds = asFiniteNumber(entity.attributes.media_duration);
  const rawState = entity.state.trim();
  const rawTitle =
    typeof entity.attributes.media_title === "string"
      ? entity.attributes.media_title.trim()
      : "";
  const rawArtist =
    typeof entity.attributes.media_artist === "string"
      ? entity.attributes.media_artist.trim()
      : "";
  const rawSource =
    typeof entity.attributes.source === "string"
      ? entity.attributes.source.trim()
      : "";
  const progress =
    elapsedSeconds !== null && durationSeconds && durationSeconds > 0
      ? normalizePercent((elapsedSeconds / durationSeconds) * 100)
      : 0;
  const hasPlayableState =
    rawState === "playing" || rawState === "paused" || rawState === "buffering";
  const noMediaState =
    rawState === "idle" ||
    rawState === "off" ||
    rawState === "standby" ||
    rawState === "unknown" ||
    rawState === "unavailable";
  const hasMediaMetadata =
    rawTitle.length > 0 ||
    rawPicture.length > 0 ||
    (elapsedSeconds !== null && elapsedSeconds > 0) ||
    (durationSeconds !== null && durationSeconds > 0);
  const hasMedia = hasPlayableState || (!noMediaState && hasMediaMetadata);

  return {
    title: hasMedia ? rawTitle || entity.friendlyName : "",
    artist: hasMedia ? rawArtist || rawSource || rawState : "",
    elapsedSeconds: elapsedSeconds !== null ? Math.round(elapsedSeconds) : 0,
    durationSeconds: durationSeconds !== null ? Math.round(durationSeconds) : 0,
    progress,
    coverUrl,
    hasMedia,
    state: rawState,
  };
}

export function collectBoundEntityIds(
  pages: Array<{
    homeAssistant?: HomeAssistantBinding | undefined;
    widgets: Array<{ homeAssistant?: HomeAssistantBinding | undefined }>;
  }>,
) {
  const seen = new Set<string>();
  for (const page of pages) {
    const pageEntityId = page.homeAssistant?.entityId?.trim();
    if (pageEntityId) {
      seen.add(pageEntityId);
    }
    for (const widget of page.widgets) {
      const entityId = widget.homeAssistant?.entityId?.trim();
      if (entityId) {
        seen.add(entityId);
      }
    }
  }
  return Array.from(seen);
}
