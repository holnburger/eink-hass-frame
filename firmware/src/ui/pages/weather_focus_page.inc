static WeatherFrame getWeatherFrameAtOffset(int pageIndex, int offset)
{
  const int frameCount = (int)(sizeof(WEATHER_FRAMES) / sizeof(WEATHER_FRAMES[0]));
  const int safePageIndex = clampInt(pageIndex, 0, UI_PAGE_COUNT - 1);
  const int index = (weatherPagePhases[safePageIndex] + offset + frameCount) % frameCount;
  return WEATHER_FRAMES[index];
}

static void drawWeatherFocusForecastItem(const BB_RECT &rect, const char *label, const WeatherFrame &weather)
{
  setThemeMonoText();
  display.setFont(FONT_8x8);
  const int labelWidth = textWidthForRole(label, UI_TEXT_META);
  int labelX = rect.x + ((rect.w - labelWidth) / 2);
  if (labelX < rect.x)
  {
    labelX = rect.x;
  }
  drawReadableLine(label, labelX, rect.y + 4);

  BB_RECT iconRect = {rect.x + 2, rect.y + 12, 40, 40};
#if UI_MDI_ICONS_AVAILABLE
  const MdiMonoIconAsset *mdiIcon = getMdiWeatherIconAsset(weather.condition);
  if (mdiIcon != nullptr)
  {
    drawMdiMonoIconScaled(iconRect, mdiIcon);
  }
  else
#endif
  {
    drawWeatherMeteoconMonoRaw(iconRect, weather.condition);
  }

  char tempText[12];
  snprintf(tempText, sizeof(tempText), "%d\xC2\xB0"
                                       "",
           weather.tempC);
  setThemeMonoText();
  if (hasUiAccentFont())
  {
    drawCustomTextAtTop(getUiAccentFont(), tempText, rect.x + 46, rect.y + 20);
  }
  else
  {
    display.setFont(FONT_12x16);
    drawReadableLine(tempText, rect.x + 46, baselineForTopAlignedText(tempText, UI_TEXT_BODY, rect.y + 23));
  }
}

static void drawWeatherFocusBody()
{
  const WeatherFrame current = getWeatherFrameAtOffset(currentPageIndex, 0);

  display.fillRect(
      weatherFocusContentRect.x,
      weatherFocusContentRect.y,
      weatherFocusContentRect.w,
      weatherFocusContentRect.h,
      uiMonoPaper());

  char tempText[12];
  snprintf(tempText, sizeof(tempText), "%d\xC2\xB0"
                                       "C",
           current.tempC);
  drawWeatherMeteoconMonoRaw(weatherFocusHeroIconRect, current.condition);

  int tempX = weatherFocusHeroRect.x + weatherFocusHeroRect.w - 164;
#if UI_WEATHER_FONT_AVAILABLE
  setThemeMonoText();
  const int tempWidth = customFontTextWidth(Roboto_Black_40, tempText);
  tempX = weatherFocusHeroRect.x + weatherFocusHeroRect.w - tempWidth - 8;
  drawCustomTextAtTop(Roboto_Black_40, tempText, tempX, weatherFocusHeroRect.y + 86);
#else
  setThemeMonoText();
  display.setCursor(0, 0);
  display.setFont(FONT_12x16);
  BB_RECT tempBounds;
  display.getStringBox(tempText, &tempBounds);
  tempX = weatherFocusHeroRect.x + weatherFocusHeroRect.w - tempBounds.w - 8;
  printTextAt(tempText, tempX, weatherFocusHeroRect.y + 132);
#endif

  setThemeMonoText();
  if (hasUiAccentFont())
  {
    const void *accentFont = getUiAccentFont();
    const int conditionWidth = customFontTextWidth(accentFont, current.condition);
    drawCustomTextAtTop(accentFont, current.condition, weatherFocusHeroRect.x + weatherFocusHeroRect.w - conditionWidth - 8, weatherFocusHeroRect.y + 174);
  }
  else
  {
    display.setFont(FONT_12x16);
    BB_RECT conditionBounds;
    display.setCursor(0, 0);
    display.getStringBox(current.condition, &conditionBounds);
    printTextAt(current.condition, weatherFocusHeroRect.x + weatherFocusHeroRect.w - conditionBounds.w - 8, weatherFocusHeroRect.y + 194);
  }

  display.drawLine(
      weatherFocusTimelineRect.x,
      weatherFocusTimelineRect.y - 10,
      weatherFocusTimelineRect.x + weatherFocusTimelineRect.w,
      weatherFocusTimelineRect.y - 10,
      uiMonoInk());

  for (int index = 0; index < 4; index++)
  {
    drawWeatherFocusForecastItem(
        weatherFocusForecastRects[index],
        WEATHER_FORECAST_LABELS[index],
        getWeatherFrameAtOffset(currentPageIndex, index + 1));
  }
}

static void refreshWeatherFocusContentRegion()
{
  if (!displayReady)
  {
    return;
  }

  display.setMode(BB_MODE_1BPP);
  setThemeMonoText();
  drawWeatherFocusBody();
  display.partialUpdate(false);
  partialCounter++;
  lastPartialRefresh = millis();
}
