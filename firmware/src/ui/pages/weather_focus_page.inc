static WeatherFrame getWeatherFrameAtOffset(int pageIndex, int offset)
{
  const int frameCount = (int)(sizeof(WEATHER_FRAMES) / sizeof(WEATHER_FRAMES[0]));
  const int safePageIndex = clampInt(pageIndex, 0, UI_PAGE_COUNT - 1);
  const int index = (weatherPagePhases[safePageIndex] + offset + frameCount) % frameCount;
  return WEATHER_FRAMES[index];
}

static void formatWeatherDegreeValue(int temperature, char *out, size_t outLen)
{
  snprintf(out, outLen, "%d\xC2\xB0"
                         "",
           temperature);
}

static void formatWeatherRangeText(int highTemperature, int lowTemperature, bool hasLowTemperature, char *out, size_t outLen)
{
  char highText[12];
  formatWeatherDegreeValue(highTemperature, highText, sizeof(highText));
  if (hasLowTemperature)
  {
    char lowText[12];
    formatWeatherDegreeValue(lowTemperature, lowText, sizeof(lowText));
    snprintf(out, outLen, "%s %s", highText, lowText);
    return;
  }

  snprintf(out, outLen, "%s", highText);
}

static void fillCurrentWeatherDateLabel(char *labelOut, size_t labelOutLen)
{
  if (labelOutLen == 0)
  {
    return;
  }

  struct tm timeInfo;
  if (readClockTime(timeInfo) &&
      strftime(labelOut, labelOutLen, "%A, %b %d", &timeInfo) > 0)
  {
    return;
  }

  snprintf(labelOut, labelOutLen, "Today");
}

static int weatherFocusTextWidth(const char *text, const void *font, UiTextRole role)
{
  return font != nullptr ? customFontTextWidth(font, text) : textWidthForRole(text, role);
}

static void drawWeatherFocusTextAt(const char *text, int x, int topY, const void *font, UiTextRole role, uint8_t foreground, uint8_t background = 15)
{
  setThemeGrayText(foreground, background);
  if (font != nullptr)
  {
    drawCustomTextAtTopAA(font, text, x, topY);
    return;
  }

  selectTextFont(role);
  display.setCursor(0, 0);
  BB_RECT bounds;
  getDisplayStringBox(text, &bounds);
  printTextAt(text, x, topY - bounds.y);
  display.setItalic(false);
}

static void drawWeatherFocusTextCentered(const BB_RECT &rect, const char *text, int topY, const void *font, UiTextRole role, uint8_t foreground, uint8_t background = 15)
{
  const int width = weatherFocusTextWidth(text, font, role);
  drawWeatherFocusTextAt(text, rect.x + ((rect.w - width) / 2), topY, font, role, foreground, background);
}

static void drawWeatherFocusHeroIcon(const BB_RECT &rect, const char *condition)
{
#if UI_MDI_ICONS_AVAILABLE
  const MdiMonoIconAsset *mdiIcon = getMdiWeatherIconAsset(condition);
  if (mdiIcon != nullptr)
  {
    drawMdiMonoIconScaledGray(rect, mdiIcon, 4, 4);
    return;
  }
#endif
  drawWeatherMeteoconMonoRaw(rect, condition);
}

static void drawWeatherFocusMetricIcon(const BB_RECT &rect, const MdiMonoIconAsset *icon)
{
#if UI_MDI_ICONS_AVAILABLE
  if (icon != nullptr)
  {
    drawMdiMonoIconScaledGray(rect, icon, 2, 2);
  }
#else
  (void)rect;
  (void)icon;
#endif
}

static int weatherFocusFallbackRainChanceForCondition(const char *condition)
{
  if (condition == nullptr || condition[0] == '\0')
  {
    return 20;
  }
  if (strstr(condition, "Rain") != nullptr || strstr(condition, "rain") != nullptr)
  {
    return 68;
  }
  if (strstr(condition, "Cloud") != nullptr || strstr(condition, "cloud") != nullptr)
  {
    return 36;
  }
  if (strstr(condition, "Wind") != nullptr || strstr(condition, "wind") != nullptr)
  {
    return 18;
  }
  return 8;
}

static void fillFallbackWeatherForecastItem(int index, WeatherForecastRuntime &forecastItem)
{
  memset(&forecastItem, 0, sizeof(forecastItem));
  const WeatherFrame forecastWeather = getWeatherFrameAtOffset(currentPageIndex, index + 1);
  fillForecastFallbackLabel(forecastItem.label, sizeof(forecastItem.label), index);
  forecastItem.temperature = forecastWeather.tempC;
  forecastItem.lowTemperature = forecastWeather.tempC - 2;
  forecastItem.lowTemperatureAvailable = true;
  forecastItem.precipitationProbability = weatherFocusFallbackRainChanceForCondition(forecastWeather.condition);
  forecastItem.precipitationProbabilityAvailable = true;
  snprintf(forecastItem.condition, sizeof(forecastItem.condition), "%s", forecastWeather.condition);
}

static void fillFallbackWeatherHourlyForecastItem(int index, int currentTemperature, WeatherHourlyForecastRuntime &forecastItem)
{
  static const int tempOffsets[WEATHER_FOCUS_HOURLY_POINT_COUNT] = {0, 1, 2, 1, 0, -1};
  memset(&forecastItem, 0, sizeof(forecastItem));
  const WeatherFrame hourlyWeather = getWeatherFrameAtOffset(currentPageIndex, index + 1);
  fillHourlyForecastFallbackLabel(forecastItem.label, sizeof(forecastItem.label), index);
  forecastItem.temperature = ((currentTemperature * 2) + hourlyWeather.tempC + tempOffsets[index]) / 3;
  forecastItem.temperatureAvailable = true;
  forecastItem.precipitationProbability = weatherFocusFallbackRainChanceForCondition(hourlyWeather.condition);
  forecastItem.precipitationProbabilityAvailable = true;
}

static void drawWeatherFocusStatStripItem(const BB_RECT &rect, const MdiMonoIconAsset *icon, const char *value, bool available, bool drawDivider)
{
  if (drawDivider)
  {
    display.drawLine(rect.x, rect.y + 10, rect.x, rect.y + rect.h - 10, uiGrayValue(10));
  }

  const void *metaFont = getUiTextFont(UI_TEXT_META);
  BB_RECT iconRect = {
      rect.x + ((rect.w - 39) / 2),
      rect.y + 2,
      39,
      39,
  };
  drawWeatherFocusMetricIcon(iconRect, icon);
  drawWeatherFocusTextCentered(rect, available ? value : "--", rect.y + 46, metaFont, UI_TEXT_META, 2);
}

static void drawWeatherFocusChartCard(const BB_RECT &rect)
{
  display.fillRoundRect(rect.x, rect.y, rect.w, rect.h, 22, uiGrayValue(15));
}

static void drawWeatherFocusHourlyGraph(const BB_RECT &rect, const WeatherHourlyForecastRuntime *forecastItems, int forecastCount)
{
  drawWeatherFocusChartCard(rect);
  const void *metaFont = getUiTextFont(UI_TEXT_META);
  drawWeatherFocusMetricIcon(BB_RECT{rect.x + 12, rect.y + 7, 29, 29},
#if UI_MDI_ICONS_AVAILABLE
                             &MDI_ICON_ASSET_SLIDER_THERMOMETER
#else
                             nullptr
#endif
  );
  drawWeatherFocusMetricIcon(BB_RECT{rect.x + 47, rect.y + 7, 29, 29},
#if UI_MDI_ICONS_AVAILABLE
                             &MDI_ICON_ASSET_WEATHER_RAIN_CHANCE
#else
                             nullptr
#endif
  );

  if (forecastCount <= 0)
  {
    return;
  }

  int minTemp = 1000;
  int maxTemp = -1000;
  for (int index = 0; index < forecastCount; index++)
  {
    if (!forecastItems[index].temperatureAvailable)
    {
      continue;
    }
    if (forecastItems[index].temperature < minTemp)
    {
      minTemp = forecastItems[index].temperature;
    }
    if (forecastItems[index].temperature > maxTemp)
    {
      maxTemp = forecastItems[index].temperature;
    }
  }

  if (minTemp == 1000 || maxTemp == -1000)
  {
    return;
  }
  if (maxTemp - minTemp < 4)
  {
    const int center = (maxTemp + minTemp) / 2;
    minTemp = center - 2;
    maxTemp = center + 2;
  }

  const int plotLeft = rect.x + 22;
  const int plotRight = rect.x + rect.w - 22;
  const int plotTop = rect.y + 28;
  const int plotBottom = rect.y + rect.h - 52;
  const int plotHeight = plotBottom - plotTop;
  const int plotWidth = plotRight - plotLeft;
  const int range = maxTemp - minTemp;

  display.drawLine(plotLeft, plotTop + (plotHeight / 2), plotRight, plotTop + (plotHeight / 2), uiGrayValue(9));
  display.drawLine(plotLeft, plotBottom, plotRight, plotBottom, uiGrayValue(8));

  int previousX = 0;
  int previousY = 0;
  bool hasPrevious = false;
  for (int index = 0; index < forecastCount; index++)
  {
    if (!forecastItems[index].temperatureAvailable)
    {
      continue;
    }

    const int x = forecastCount > 1
                      ? plotLeft + ((plotWidth * index) / (forecastCount - 1))
                      : plotLeft + (plotWidth / 2);
    const int y = plotBottom - (((forecastItems[index].temperature - minTemp) * plotHeight) / (range > 0 ? range : 1));

    if (hasPrevious)
    {
      display.drawLine(previousX, previousY, x, y, uiGrayValue(2));
      display.drawLine(previousX, previousY + 1, x, y + 1, uiGrayValue(4));
    }

    char valueText[12];
    formatWeatherDegreeValue(forecastItems[index].temperature, valueText, sizeof(valueText));
    const int valueWidth = weatherFocusTextWidth(valueText, metaFont, UI_TEXT_META);
    int valueX = x - (valueWidth / 2);
    if (valueX < rect.x + 8)
    {
      valueX = rect.x + 8;
    }
    if (valueX + valueWidth > rect.x + rect.w - 8)
    {
      valueX = rect.x + rect.w - 8 - valueWidth;
    }
    int valueTop = y - 16;
    if (valueTop < rect.y + 8)
    {
      valueTop = rect.y + 8;
    }
    drawWeatherFocusTextAt(valueText, valueX, valueTop, metaFont, UI_TEXT_META, 3);

    display.fillCircle(x, y, 3, uiGrayValue(0));
    display.drawCircle(x, y, 3, uiGrayValue(3));

    char probabilityText[12];
    if (forecastItems[index].precipitationProbabilityAvailable)
    {
      snprintf(
          probabilityText,
          sizeof(probabilityText),
          "%d%%",
          clampInt(forecastItems[index].precipitationProbability, 0, 100));
    }
    else
    {
      snprintf(probabilityText, sizeof(probabilityText), "--");
    }

    const int probabilityWidth = weatherFocusTextWidth(probabilityText, metaFont, UI_TEXT_META);
    int probabilityX = x - (probabilityWidth / 2);
    if (probabilityX < rect.x + 8)
    {
      probabilityX = rect.x + 8;
    }
    if (probabilityX + probabilityWidth > rect.x + rect.w - 8)
    {
      probabilityX = rect.x + rect.w - 8 - probabilityWidth;
    }
    drawWeatherFocusTextAt(probabilityText, probabilityX - 2, rect.y + rect.h - 32, metaFont, UI_TEXT_META, 4);

    const int labelWidth = weatherFocusTextWidth(forecastItems[index].label, metaFont, UI_TEXT_META);
    int labelX = x - (labelWidth / 2);
    if (labelX < rect.x + 8)
    {
      labelX = rect.x + 8;
    }
    if (labelX + labelWidth > rect.x + rect.w - 8)
    {
      labelX = rect.x + rect.w - 8 - labelWidth;
    }
    drawWeatherFocusTextAt(forecastItems[index].label, labelX + 2, rect.y + rect.h - 15, metaFont, UI_TEXT_META, 6);

    previousX = x;
    previousY = y;
    hasPrevious = true;
  }
}

static void drawWeatherFocusForecastStripItem(const BB_RECT &rect, const WeatherForecastRuntime &forecast, bool drawDivider)
{
  if (drawDivider)
  {
    display.drawLine(rect.x, rect.y + 12, rect.x, rect.y + rect.h - 12, uiGrayValue(10));
  }

  const void *metaFont = getUiTextFont(UI_TEXT_META);
  drawWeatherFocusTextCentered(rect, forecast.label, rect.y + 12, metaFont, UI_TEXT_META, 7);

  BB_RECT iconRect = {rect.x + ((rect.w - 62) / 2), rect.y + 18, 62, 62};
  drawWeatherFocusHeroIcon(iconRect, forecast.condition);

  char rangeText[24];
  formatWeatherRangeText(
      forecast.temperature,
      forecast.lowTemperature,
      forecast.lowTemperatureAvailable,
      rangeText,
      sizeof(rangeText));
  drawWeatherFocusTextCentered(rect, rangeText, rect.y + 98, metaFont, UI_TEXT_META, 2);

  char rainText[12];
  if (forecast.precipitationProbabilityAvailable)
  {
    snprintf(rainText, sizeof(rainText), "%d%%", clampInt(forecast.precipitationProbability, 0, 100));
  }
  else
  {
    snprintf(rainText, sizeof(rainText), "--");
  }

  const int rainTextWidth = weatherFocusTextWidth(rainText, metaFont, UI_TEXT_META);
  const int iconWidth = 24;
  const int gap = 6;
  const int totalWidth = iconWidth + gap + rainTextWidth;
  const int startX = rect.x + ((rect.w - totalWidth) / 2);
  drawWeatherFocusMetricIcon(BB_RECT{startX, rect.y + rect.h - 29, iconWidth, iconWidth},
#if UI_MDI_ICONS_AVAILABLE
                             &MDI_ICON_ASSET_WEATHER_RAIN_CHANCE
#else
                             nullptr
#endif
  );
  drawWeatherFocusTextAt(rainText, startX + iconWidth + gap, rect.y + rect.h - 27, metaFont, UI_TEXT_META, 4);
}

static void drawWeatherFocusBody()
{
  const bool useHomeAssistant = pageHasHomeAssistantBinding(currentPageIndex) && weatherPageStates[currentPageIndex].available;
  const WeatherFrame currentMock = getWeatherFrameAtOffset(currentPageIndex, 0);
  const WeatherPageRuntimeState &state = weatherPageStates[currentPageIndex];
  const int currentTemperature = useHomeAssistant ? state.temperature : currentMock.tempC;
  const char *currentCondition = useHomeAssistant ? state.condition : currentMock.condition;
  const char *currentTemperatureUnit = useHomeAssistant && state.temperatureUnit[0] != '\0'
                                           ? state.temperatureUnit
                                           : "\xC2\xB0"
                                             "C";
  char currentTemperatureText[16];
  snprintf(currentTemperatureText, sizeof(currentTemperatureText), "%d", currentTemperature);
  char fallbackFeelsLikeText[16];
  snprintf(fallbackFeelsLikeText, sizeof(fallbackFeelsLikeText), "%d%s", currentTemperature - 1, currentTemperatureUnit);

  display.fillRect(
      weatherFocusContentRect.x,
      weatherFocusContentRect.y,
      weatherFocusContentRect.w,
      weatherFocusContentRect.h,
      uiGrayValue(14));

  display.fillRoundRect(
      weatherFocusHeroRect.x,
      weatherFocusHeroRect.y,
      weatherFocusHeroRect.w,
      weatherFocusHeroRect.h,
      34,
      uiGrayValue(15));

  char dateLabel[40];
  fillCurrentWeatherDateLabel(dateLabel, sizeof(dateLabel));
  const void *metaFont = getUiTextFont(UI_TEXT_META);
  const void *bodyFont = getUiTextFont(UI_TEXT_BODY);
  drawWeatherFocusTextCentered(weatherFocusHeroRect, dateLabel, weatherFocusHeroRect.y + 18, metaFont, UI_TEXT_META, 7);

  display.fillRoundRect(
      weatherFocusHeroIconRect.x,
      weatherFocusHeroIconRect.y,
      weatherFocusHeroIconRect.w,
      weatherFocusHeroIconRect.h,
      28,
      uiGrayValue(13));
  BB_RECT iconRect = {
      weatherFocusHeroIconRect.x + 4,
      weatherFocusHeroIconRect.y + 4,
      weatherFocusHeroIconRect.w - 8,
      weatherFocusHeroIconRect.h - 8,
  };
  drawWeatherFocusHeroIcon(iconRect, currentCondition);

  const int heroRightX = weatherFocusHeroRect.x + weatherFocusHeroRect.w - 28;
  const int tempBaseY = weatherFocusHeroRect.y + 86;
#if UI_WEATHER_FONT_AVAILABLE
  setThemeGrayText(1, 15);
  const int temperatureValueWidth = customFontTextWidth(Roboto_Black_40, currentTemperatureText);
  const int unitWidth = weatherFocusTextWidth(currentTemperatureUnit, bodyFont, UI_TEXT_BODY);
  const int tempStartX = heroRightX - temperatureValueWidth - unitWidth - 8;
  drawCustomTextAtTopAA(Roboto_Black_40, currentTemperatureText, tempStartX, tempBaseY);
  drawWeatherFocusTextAt(currentTemperatureUnit, tempStartX + temperatureValueWidth + 8, tempBaseY + 18, bodyFont, UI_TEXT_BODY, 3);
#else
  selectTextFont(UI_TEXT_HERO);
  BB_RECT tempBounds;
  display.setCursor(0, 0);
  getDisplayStringBox(currentTemperatureText, &tempBounds);
  const int unitWidth = weatherFocusTextWidth(currentTemperatureUnit, bodyFont, UI_TEXT_BODY);
  const int tempStartX = heroRightX - tempBounds.w - unitWidth - 8;
  drawWeatherFocusTextAt(currentTemperatureText, tempStartX, tempBaseY + 34, nullptr, UI_TEXT_HERO, 1);
  drawWeatherFocusTextAt(currentTemperatureUnit, tempStartX + tempBounds.w + 8, tempBaseY + 24, bodyFont, UI_TEXT_BODY, 3);
#endif

  char conditionText[40];
  truncateTextToWidth(
      currentCondition,
      conditionText,
      sizeof(conditionText),
      220,
      bodyFont,
      UI_TEXT_BODY,
      20);
  drawWeatherFocusTextAt(
      conditionText,
      heroRightX - weatherFocusTextWidth(conditionText, bodyFont, UI_TEXT_BODY),
      weatherFocusHeroRect.y + 170,
      bodyFont,
      UI_TEXT_BODY,
      4);

  char feelsLikeLine[40];
  snprintf(
      feelsLikeLine,
      sizeof(feelsLikeLine),
      "Feels like %s",
      useHomeAssistant && state.hasFeelsLike ? state.feelsLikeText : fallbackFeelsLikeText);
  drawWeatherFocusTextAt(
      feelsLikeLine,
      heroRightX - weatherFocusTextWidth(feelsLikeLine, metaFont, UI_TEXT_META),
      weatherFocusHeroRect.y + 204,
      metaFont,
      UI_TEXT_META,
      7);

  display.fillRoundRect(
      weatherFocusStatsRect.x,
      weatherFocusStatsRect.y,
      weatherFocusStatsRect.w,
      weatherFocusStatsRect.h,
      22,
      uiGrayValue(15));

  const int statCardWidth = weatherFocusStatsRect.w / 3;
  const BB_RECT statItems[3] = {
      {weatherFocusStatsRect.x, weatherFocusStatsRect.y, statCardWidth, weatherFocusStatsRect.h},
      {weatherFocusStatsRect.x + statCardWidth, weatherFocusStatsRect.y, statCardWidth, weatherFocusStatsRect.h},
      {weatherFocusStatsRect.x + (statCardWidth * 2), weatherFocusStatsRect.y, weatherFocusStatsRect.w - (statCardWidth * 2), weatherFocusStatsRect.h},
  };

  drawWeatherFocusStatStripItem(
      statItems[0],
#if UI_MDI_ICONS_AVAILABLE
      &MDI_ICON_ASSET_WEATHER_HUMIDITY,
#else
      nullptr,
#endif
      useHomeAssistant ? state.humidityText : "64%",
      useHomeAssistant ? state.hasHumidity : true,
      false);
  drawWeatherFocusStatStripItem(
      statItems[1],
#if UI_MDI_ICONS_AVAILABLE
      &MDI_ICON_ASSET_WEATHER_WIND_SMALL,
#else
      nullptr,
#endif
      useHomeAssistant ? state.windText : "7 km/h",
      useHomeAssistant ? state.hasWind : true,
      true);
  drawWeatherFocusStatStripItem(
      statItems[2],
#if UI_MDI_ICONS_AVAILABLE
      &MDI_ICON_ASSET_WEATHER_PRESSURE,
#else
      nullptr,
#endif
      useHomeAssistant ? state.pressureText : "1008 hPa",
      useHomeAssistant ? state.hasPressure : true,
      true);

  WeatherHourlyForecastRuntime hourlyForecastItems[WEATHER_FOCUS_HOURLY_POINT_COUNT];
  for (int index = 0; index < WEATHER_FOCUS_HOURLY_POINT_COUNT; index++)
  {
    if (useHomeAssistant && index < state.hourlyForecastCount)
    {
      hourlyForecastItems[index] = state.hourlyForecast[index];
    }
    else
    {
      fillFallbackWeatherHourlyForecastItem(index, currentTemperature, hourlyForecastItems[index]);
    }
  }

  drawWeatherFocusHourlyGraph(weatherFocusTemperatureChartRect, hourlyForecastItems, WEATHER_FOCUS_HOURLY_POINT_COUNT);

  display.fillRoundRect(
      weatherFocusTimelineRect.x,
      weatherFocusTimelineRect.y,
      weatherFocusTimelineRect.w,
      weatherFocusTimelineRect.h,
      24,
      uiGrayValue(15));

  for (int index = 0; index < WEATHER_FOCUS_FORECAST_DAY_COUNT; index++)
  {
    WeatherForecastRuntime forecastItem;
    if (useHomeAssistant && index < state.forecastCount)
    {
      forecastItem = state.forecast[index];
    }
    else
    {
      fillFallbackWeatherForecastItem(index, forecastItem);
    }

    drawWeatherFocusForecastStripItem(
        weatherFocusForecastRects[index],
        forecastItem,
        index > 0);
  }
}

static void refreshWeatherFocusContentRegion()
{
  if (!displayReady)
  {
    return;
  }

  display.setMode(BB_MODE_4BPP);
  setThemeGrayText();
  drawWeatherFocusBody();
#ifdef CLEAR_NONE
  display.fullUpdate(CLEAR_NONE, false);
#else
  display.fullUpdate(1, false);
#endif
  partialCounter++;
  lastPartialRefresh = millis();
}
