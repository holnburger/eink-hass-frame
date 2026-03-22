export const HOME_ASSISTANT_WIDGET_TYPES = [
  "weather",
  "progress",
  "switch",
  "button",
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

export const WEATHER_HOURLY_FORECAST_POINT_COUNT = 12;
export const THERMOSTAT_HISTORY_POINT_COUNT = 24;

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

export function getEntityObjectId(entityId: string) {
  const separatorIndex = entityId.indexOf(".");
  return separatorIndex > 0 ? entityId.slice(separatorIndex + 1) : entityId;
}

export function buildHomeAssistantWeatherHourlySensorEntityId(
  weatherEntityId: string,
  kind: "temperature" | "precip_probability",
  hourOffset: number,
) {
  const objectId = getEntityObjectId(weatherEntityId).trim();
  if (!objectId || hourOffset < 1) {
    return "";
  }

  return `sensor.${objectId}_${kind}_${hourOffset}h`;
}

export function matchHomeAssistantWeatherHourlySensorEntity(
  weatherEntityId: string,
  sensorEntityId: string,
) {
  const weatherObjectId = getEntityObjectId(weatherEntityId).trim();
  if (!weatherObjectId || getEntityDomain(sensorEntityId) !== "sensor") {
    return undefined;
  }

  const objectId = getEntityObjectId(sensorEntityId).trim();
  const match = objectId.match(
    new RegExp(
      `^${weatherObjectId}_(temperature|precip_probability)_(\\d+)h$`,
    ),
  );
  if (!match) {
    return undefined;
  }

  const hourOffset = Number(match[2]);
  if (
    !Number.isInteger(hourOffset) ||
    hourOffset < 1 ||
    hourOffset > WEATHER_HOURLY_FORECAST_POINT_COUNT
  ) {
    return undefined;
  }

  return {
    kind: match[1] as "temperature" | "precip_probability",
    hourOffset,
  };
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
    case "button":
      return [
        "switch",
        "input_boolean",
        "light",
        "fan",
        "automation",
        "script",
        "cover",
      ];
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

type HomeAssistantThermostatHistoryEntry = {
  datetime: string;
  temperature: number | null;
};

function readHomeAssistantModeList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((candidate) => {
    if (typeof candidate !== "string") {
      return [];
    }

    const trimmed = candidate.trim().toLowerCase();
    return trimmed ? [trimmed] : [];
  });
}

function formatThermostatHistoryLabel(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function readThermostatHistoryEntries(
  value: unknown,
  now = new Date(),
): HomeAssistantThermostatHistoryEntry[] {
  const rawEntries = Array.isArray(value) ? value : [];
  if (rawEntries.length === 0) {
    return [];
  }

  const normalized = rawEntries.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const candidate = entry as Record<string, unknown>;
    const temperature = asFiniteNumber(candidate.temperature);
    const rawDatetime =
      typeof candidate.datetime === "string"
        ? candidate.datetime
        : typeof candidate.last_changed === "string"
          ? candidate.last_changed
          : "";
    const date = parseWeatherDateLike(rawDatetime);
    if (!date) {
      return [];
    }

    return [
      {
        datetime: date.toISOString(),
        temperature:
          temperature !== null ? Number(temperature.toFixed(1)) : null,
      },
    ];
  });

  if (normalized.length === 0) {
    return [];
  }

  if (normalized.length >= THERMOSTAT_HISTORY_POINT_COUNT) {
    return normalized.slice(-THERMOSTAT_HISTORY_POINT_COUNT);
  }

  const fallbackEntries: HomeAssistantThermostatHistoryEntry[] = Array.from(
    { length: THERMOSTAT_HISTORY_POINT_COUNT },
    (_, index) => {
      const fallbackDate = new Date(now.getTime());
      fallbackDate.setHours(
        fallbackDate.getHours() -
          (THERMOSTAT_HISTORY_POINT_COUNT - 1 - index),
      );
      return {
        datetime: fallbackDate.toISOString(),
        temperature: null,
      };
    },
  );

  const startIndex = fallbackEntries.length - normalized.length;
  for (let index = 0; index < normalized.length; index += 1) {
    fallbackEntries[startIndex + index] = normalized[index];
  }
  return fallbackEntries;
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

function formatWeatherHourlyLabelForDate(date: Date) {
  return date.toLocaleTimeString([], {
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

export function applyWidgetLogicInversionToEnabled(
  enabled: boolean | undefined,
  inverted?: boolean,
) {
  if (enabled === undefined) {
    return undefined;
  }

  return inverted ? !enabled : enabled;
}

export function applyWidgetLogicInversionToPercent(
  value: number | undefined,
  inverted?: boolean,
) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = normalizePercent(value);
  return inverted ? 100 - normalized : normalized;
}

export function resolveHomeAssistantNumericValue(
  entity: HomeAssistantEntityState | undefined,
  widgetType: Exclude<
    HomeAssistantWidgetType,
    "weather" | "switch" | "button" | "thermostat"
  >,
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
    states?: Record<string, HomeAssistantEntityState>;
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
  const hourlySensorForecast = options?.states
    ? Array.from({ length: WEATHER_HOURLY_FORECAST_POINT_COUNT }, (_, index) => {
        const hourOffset = index + 1;
        const temperatureEntity =
          options.states?.[
            buildHomeAssistantWeatherHourlySensorEntityId(
              entity.entityId,
              "temperature",
              hourOffset,
            )
          ];
        const precipitationEntity =
          options.states?.[
            buildHomeAssistantWeatherHourlySensorEntityId(
              entity.entityId,
              "precip_probability",
              hourOffset,
            )
          ];
        const temperature = asFiniteNumber(temperatureEntity?.state);
        const precipitationProbability = asFiniteNumber(
          precipitationEntity?.state,
        );
        const date = new Date(now.getTime());
        date.setHours(date.getHours() + hourOffset);
        return {
          label: formatWeatherHourlyLabelForDate(date),
          temperature: temperature !== null ? Math.round(temperature) : null,
          precipitationProbability:
            precipitationProbability !== null
              ? normalizePercent(precipitationProbability)
              : null,
        };
      })
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

  const baseHourlyForecast = hourlyForecastInput
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
            temperature:
              temperature !== null ? Math.round(temperature) : null,
            precipitationProbability:
              precipitationProbability !== null
                ? normalizePercent(precipitationProbability)
                : null,
          },
        ];
      },
    )
    .slice(0, WEATHER_HOURLY_FORECAST_POINT_COUNT);

  const hourlyForecast = Array.from(
    { length: WEATHER_HOURLY_FORECAST_POINT_COUNT },
    (_, index) => {
      const baseEntry = baseHourlyForecast[index];
      const sensorEntry = hourlySensorForecast[index];
      if (!baseEntry && !sensorEntry) {
        const fallbackDate = new Date(now.getTime());
        fallbackDate.setHours(fallbackDate.getHours() + index + 1);
        return {
          label: formatWeatherHourlyLabelForDate(fallbackDate),
          temperature: null,
          precipitationProbability: null,
        };
      }

      return {
        label: baseEntry?.label ?? sensorEntry?.label ?? "",
        temperature: sensorEntry?.temperature ?? baseEntry?.temperature ?? null,
        precipitationProbability:
          sensorEntry?.precipitationProbability ??
          baseEntry?.precipitationProbability ??
          null,
      };
    },
  );

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
  options?: {
    now?: Date;
  },
) {
  if (!entity) {
    return undefined;
  }

  const now = options?.now ?? new Date();
  const current = asFiniteNumber(entity.attributes.current_temperature);
  const targetFromAttributes = asFiniteNumber(entity.attributes.temperature);
  const targetFromState = asFiniteNumber(entity.state);
  const supportedModes = new Set(
    readHomeAssistantModeList(entity.attributes.hvac_modes),
  );
  const activeMode = entity.state.trim().toLowerCase();
  const supportsActivate =
    supportedModes.has("heat") ||
    supportedModes.has("auto") ||
    supportedModes.has("heat_cool");
  const supportsDeactivate = supportedModes.has("off");
  const supportsCool = supportedModes.has("cool");
  const history = readThermostatHistoryEntries(
    entity.attributes.temperature_history,
    now,
  );

  return {
    currentValue: current !== null ? Number(current.toFixed(1)) : undefined,
    value:
      targetFromAttributes !== null
        ? Number(targetFromAttributes.toFixed(1))
        : targetFromState !== null
          ? Number(targetFromState.toFixed(1))
          : undefined,
    temperatureUnit: normalizeTemperatureUnitLabel(
      entity.attributes.temperature_unit ??
        entity.attributes.native_temperature_unit,
    ),
    supportsActivate,
    supportsDeactivate,
    supportsCool,
    activeControl:
      activeMode === "off"
        ? "deactivate"
        : activeMode === "cool"
          ? "cool"
          : activeMode &&
              activeMode !== "unknown" &&
              activeMode !== "unavailable" &&
              activeMode !== "none"
            ? "activate"
            : undefined,
    history: history.map((entry) => ({
      label: formatThermostatHistoryLabel(
        parseWeatherDateLike(entry.datetime) ?? now,
      ),
      temperature: entry.temperature,
    })),
  };
}

export function collectThermostatHistoryEntityIds(
  pages: Array<{
    widgets: Array<{
      type?: string;
      showHistoryGraph?: boolean;
      homeAssistant?: HomeAssistantBinding | undefined;
    }>;
  }>,
) {
  const seen = new Set<string>();
  for (const page of pages) {
    for (const widget of page.widgets) {
      const entityId = widget.homeAssistant?.entityId?.trim();
      if (
        widget.type === "thermostat" &&
        widget.showHistoryGraph === true &&
        entityId
      ) {
        seen.add(entityId);
      }
    }
  }
  return Array.from(seen);
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
