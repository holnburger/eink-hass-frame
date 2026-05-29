import {
  THERMOSTAT_HISTORY_POINT_COUNT,
  WEATHER_HOURLY_FORECAST_POINT_COUNT,
} from "@/lib/home-assistant";

export type PreviewThermostatHistoryEntry = {
  label: string;
  temperature: number | null;
};

export type PreviewWeatherForecastEntry = {
  label: string;
  temperature: number | null;
  lowTemperature: number | null;
  condition: string;
  precipitationProbability: number | null;
};

export type PreviewWeatherHourlyEntry = {
  label: string;
  temperature: number | null;
  precipitationProbability: number | null;
};

export const WEATHER_STATES = [
  { temperature: 7, condition: "Cloudy" },
  { temperature: 8, condition: "Light rain" },
  { temperature: 10, condition: "Clear" },
  { temperature: 6, condition: "Windy" },
] as const;

const PREVIEW_DAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;
const PREVIEW_HOURLY_LABELS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
] as const;

export function truncateMediaTitle(title: string, fontClass: string) {
  const hardLimit = fontClass.includes("font-mono") ? 22 : 30;
  if (title.length <= hardLimit) {
    return title;
  }
  return `${title.slice(0, hardLimit)}...`;
}

export function getWeatherIconName(condition: string) {
  const normalizedCondition = condition.toLowerCase();
  if (
    normalizedCondition.includes("clear-night") ||
    normalizedCondition.includes("night")
  ) {
    return "night-clear";
  }
  if (normalizedCondition.includes("partly")) {
    return normalizedCondition.includes("night")
      ? "night-alt-partly-cloudy"
      : "day-cloudy";
  }
  if (
    normalizedCondition.includes("sunny") ||
    normalizedCondition.includes("clear")
  ) {
    return "day-sunny";
  }
  if (normalizedCondition.includes("windy-variant")) {
    return "cloudy-windy";
  }
  if (normalizedCondition.includes("wind")) {
    return "strong-wind";
  }
  if (
    normalizedCondition.includes("drizzle") ||
    normalizedCondition.includes("sprinkle")
  ) {
    return "sprinkle";
  }
  if (
    normalizedCondition.includes("lightning-rainy") ||
    normalizedCondition.includes("storm")
  ) {
    return "storm-showers";
  }
  if (normalizedCondition.includes("lightning")) {
    return "lightning";
  }
  if (
    normalizedCondition.includes("snowy-rainy") ||
    normalizedCondition.includes("sleet")
  ) {
    return "sleet";
  }
  if (normalizedCondition.includes("snow")) {
    return "snow";
  }
  if (normalizedCondition.includes("hail")) {
    return "hail";
  }
  if (normalizedCondition.includes("fog")) {
    return "fog";
  }
  if (
    normalizedCondition.includes("pouring") ||
    normalizedCondition.includes("showers")
  ) {
    return "showers";
  }
  if (normalizedCondition.includes("rain")) {
    return "rain";
  }
  return "cloudy";
}

export function previewWeatherRainChanceForCondition(condition: string) {
  if (condition.includes("Rain") || condition.includes("rain")) {
    return 68;
  }
  if (condition.includes("Cloud")) {
    return 38;
  }
  if (condition.includes("Wind")) {
    return 20;
  }
  return 10;
}

export function buildPreviewWeatherDailyFallback(
  pageIndex: number,
  now: Date | null,
): PreviewWeatherForecastEntry[] {
  if (!now) {
    return Array.from({ length: 3 }, (_, index) => {
      const source =
        WEATHER_STATES[(pageIndex + index + 1) % WEATHER_STATES.length];
      return {
        label:
          PREVIEW_DAY_LABELS[
            (pageIndex + index + 1) % PREVIEW_DAY_LABELS.length
          ],
        temperature: source.temperature,
        lowTemperature: source.temperature - 2,
        condition: source.condition,
        precipitationProbability: previewWeatherRainChanceForCondition(
          source.condition,
        ),
      };
    });
  }

  return Array.from({ length: 3 }, (_, index) => {
    const source =
      WEATHER_STATES[(pageIndex + index + 1) % WEATHER_STATES.length];
    const date = new Date(now.getTime());
    date.setDate(date.getDate() + index + 1);
    return {
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      temperature: source.temperature,
      lowTemperature: source.temperature - 2,
      condition: source.condition,
      precipitationProbability: previewWeatherRainChanceForCondition(
        source.condition,
      ),
    };
  });
}

export function buildPreviewWeatherHourlyFallback(
  pageIndex: number,
  currentTemperature: number,
  now: Date | null,
): PreviewWeatherHourlyEntry[] {
  const offsets = [0, 1, 2, 3, 4, 4, 3, 2, 1, 0, -1, -1];

  if (!now) {
    return Array.from(
      { length: WEATHER_HOURLY_FORECAST_POINT_COUNT },
      (_, index) => {
        const source =
          WEATHER_STATES[(pageIndex + index) % WEATHER_STATES.length];
        return {
          label:
            PREVIEW_HOURLY_LABELS[index] ??
            PREVIEW_HOURLY_LABELS[PREVIEW_HOURLY_LABELS.length - 1],
          temperature: Math.round(
            (currentTemperature * 2 + source.temperature + offsets[index]) / 3,
          ),
          precipitationProbability: previewWeatherRainChanceForCondition(
            source.condition,
          ),
        };
      },
    );
  }

  return Array.from(
    { length: WEATHER_HOURLY_FORECAST_POINT_COUNT },
    (_, index) => {
      const source =
        WEATHER_STATES[(pageIndex + index) % WEATHER_STATES.length];
      const date = new Date(now.getTime());
      date.setHours(date.getHours() + index + 1);
      return {
        label: date.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        temperature: Math.round(
          (currentTemperature * 2 + source.temperature + offsets[index]) / 3,
        ),
        precipitationProbability: previewWeatherRainChanceForCondition(
          source.condition,
        ),
      };
    },
  );
}

export function buildPreviewThermostatHistoryFallback(
  currentTemperature: number,
  now: Date | null,
): PreviewThermostatHistoryEntry[] {
  const baseDate = now ? new Date(now.getTime()) : new Date();
  baseDate.setMinutes(0, 0, 0);

  return Array.from({ length: THERMOSTAT_HISTORY_POINT_COUNT }, (_, index) => {
    const slotDate = new Date(baseDate.getTime());
    slotDate.setHours(
      slotDate.getHours() - (THERMOSTAT_HISTORY_POINT_COUNT - 1 - index),
    );
    return {
      label: slotDate.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      temperature: Number(
        (
          currentTemperature +
          Math.sin(index / 3.1) * 0.45 +
          Math.cos(index / 4.3) * 0.15
        ).toFixed(1),
      ),
    };
  });
}

export function formatPreviewTemperaturePointLabel(value: number) {
  return `${value.toFixed(1)}°`;
}
