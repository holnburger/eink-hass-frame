import { describe, expect, test } from "bun:test";

import {
  buildPreviewThermostatHistoryFallback,
  buildPreviewWeatherDailyFallback,
  buildPreviewWeatherHourlyFallback,
  formatPreviewTemperaturePointLabel,
  getWeatherIconName,
  previewWeatherRainChanceForCondition,
  truncateMediaTitle,
} from "@/components/dashboard/preview-helpers";
import {
  THERMOSTAT_HISTORY_POINT_COUNT,
  WEATHER_HOURLY_FORECAST_POINT_COUNT,
} from "@/lib/home-assistant";

describe("preview helpers", () => {
  test("maps weather conditions to icon names", () => {
    expect(getWeatherIconName("clear-night")).toBe("night-clear");
    expect(getWeatherIconName("partlycloudy")).toBe("day-cloudy");
    expect(getWeatherIconName("lightning-rainy")).toBe("storm-showers");
    expect(getWeatherIconName("snowy-rainy")).toBe("sleet");
    expect(getWeatherIconName("unknown")).toBe("cloudy");
  });

  test("keeps media title truncation dependent on font", () => {
    expect(truncateMediaTitle("Short Title", "font-sans")).toBe("Short Title");
    expect(truncateMediaTitle("1234567890123456789012345678901", "font-sans")).toBe(
      "123456789012345678901234567890...",
    );
    expect(truncateMediaTitle("12345678901234567890123", "font-mono")).toBe(
      "1234567890123456789012...",
    );
  });

  test("builds stable weather daily fallback labels without a clock", () => {
    expect(buildPreviewWeatherDailyFallback(0, null)).toEqual([
      {
        label: "Tue",
        temperature: 8,
        lowTemperature: 6,
        condition: "Light rain",
        precipitationProbability: 68,
      },
      {
        label: "Wed",
        temperature: 10,
        lowTemperature: 8,
        condition: "Clear",
        precipitationProbability: 10,
      },
      {
        label: "Thu",
        temperature: 6,
        lowTemperature: 4,
        condition: "Windy",
        precipitationProbability: 20,
      },
    ]);
  });

  test("builds weather hourly fallback and rain chances", () => {
    const hourly = buildPreviewWeatherHourlyFallback(0, 9, null);
    expect(hourly).toHaveLength(WEATHER_HOURLY_FORECAST_POINT_COUNT);
    expect(hourly[0]).toEqual({
      label: "08:00",
      temperature: 8,
      precipitationProbability: 38,
    });
    expect(previewWeatherRainChanceForCondition("Clear")).toBe(10);
  });

  test("builds thermostat history fallback around the selected hour", () => {
    const history = buildPreviewThermostatHistoryFallback(
      20.5,
      new Date("2026-05-29T12:34:00Z"),
    );
    expect(history).toHaveLength(THERMOSTAT_HISTORY_POINT_COUNT);
    expect(history[0].label).toBe("13:00");
    expect(history.at(-1)?.label).toBe("12:00");
    expect(typeof history[0].temperature).toBe("number");
  });

  test("formats temperature point labels", () => {
    expect(formatPreviewTemperaturePointLabel(21)).toBe("21.0°");
  });
});
