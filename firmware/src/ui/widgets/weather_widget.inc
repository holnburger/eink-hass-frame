static int overviewWeatherTemperatureValueWidth(const char *temperatureValueText)
{
#if UI_WEATHER_FONT_AVAILABLE
  return customFontTextWidth(Roboto_Black_40, temperatureValueText);
#else
  return textWidthForRole(temperatureValueText, UI_TEXT_HERO);
#endif
}

static void drawOverviewWeatherTemperatureValue(const char *temperatureValueText, int x, int topY)
{
#if UI_WEATHER_FONT_AVAILABLE
  drawCustomTextAtTop(Roboto_Black_40, temperatureValueText, x, topY);
#else
  drawTextRole(
      temperatureValueText,
      x,
      baselineForTopAlignedText(temperatureValueText, UI_TEXT_HERO, topY),
      UI_TEXT_HERO);
#endif
}

static int overviewWeatherTemperatureValueTop(const WidgetRuntimeState &state)
{
  const int pairAreaTop = state.cardRect.y + 18;
  const int pairAreaHeight = state.cardRect.h - 56;
#if UI_WEATHER_FONT_AVAILABLE
  return pairAreaTop + ((pairAreaHeight - 40) / 2) - 2;
#else
  return pairAreaTop + ((pairAreaHeight - 28) / 2);
#endif
}

static int overviewWeatherTemperatureUnitTop(int temperatureValueTop)
{
#if UI_WEATHER_FONT_AVAILABLE
  return temperatureValueTop + 9;
#else
  return temperatureValueTop + 8;
#endif
}

static void buildOverviewWeatherConditionText(
    const WidgetRuntimeState &state,
    const char *condition,
    char *conditionText,
    size_t conditionTextLen)
{
  truncateTextToWidth(
      condition,
      conditionText,
      conditionTextLen,
      state.cardRect.w - 24,
      nullptr,
      UI_TEXT_BODY,
      24);
}

static void drawOverviewWeatherWidget(
    const WidgetRuntimeState &state,
    int temperature,
    const char *condition,
    const char *temperatureUnit,
    bool pushPartial)
{
  const UiTextRole unitRole = UI_TEXT_BODY;
  const int horizontalInset = 12;
  const int iconSize = clampInt(state.cardRect.h - 42, 66, 92);
  const int pairGap = 36;
  const int unitGap = 8;
  const int pairAreaTop = state.cardRect.y + 18;
  const int pairAreaHeight = state.cardRect.h - 56;
  const int conditionTop = state.cardRect.y + state.cardRect.h - 36;

  char temperatureValueText[16];
  char conditionText[40];
  snprintf(temperatureValueText, sizeof(temperatureValueText), "%d", temperature);
  buildOverviewWeatherConditionText(state, condition, conditionText, sizeof(conditionText));

  const int temperatureValueWidth = overviewWeatherTemperatureValueWidth(temperatureValueText);
  const int unitWidth = textWidthForRole(temperatureUnit, unitRole);
  const int pairWidth = iconSize + pairGap + temperatureValueWidth + unitGap + unitWidth;
  int pairStartX = state.cardRect.x + ((state.cardRect.w - pairWidth) / 2);
  if (pairStartX < state.cardRect.x + horizontalInset)
  {
    pairStartX = state.cardRect.x + horizontalInset;
  }

  const BB_RECT iconRect = {
      pairStartX,
      pairAreaTop + ((pairAreaHeight - iconSize) / 2),
      iconSize,
      iconSize,
  };
  const int temperatureValueX = pairStartX + iconSize + pairGap;
  const int temperatureValueTop = overviewWeatherTemperatureValueTop(state);
  const int temperatureUnitTop = overviewWeatherTemperatureUnitTop(temperatureValueTop);

  display.fillRect(state.cardRect.x, state.cardRect.y, state.cardRect.w, state.cardRect.h, uiMonoPaper());
  drawOverviewWeatherTemperatureValue(temperatureValueText, temperatureValueX, temperatureValueTop);
  drawTextRole(
      temperatureUnit,
      temperatureValueX + temperatureValueWidth + unitGap,
      baselineForTopAlignedText(temperatureUnit, unitRole, temperatureUnitTop),
      unitRole);
  drawWeatherIcon(iconRect, condition);

  const int conditionWidth = textWidthForRole(conditionText, UI_TEXT_BODY);
  int conditionX = state.cardRect.x + ((state.cardRect.w - conditionWidth) / 2);
  if (conditionX < state.cardRect.x + horizontalInset)
  {
    conditionX = state.cardRect.x + horizontalInset;
  }
  drawTextRole(
      conditionText,
      conditionX,
      baselineForTopAlignedText(conditionText, UI_TEXT_BODY, conditionTop),
      UI_TEXT_BODY);

  if (pushPartial)
  {
    display.partialUpdate(false);
    partialCounter++;
    lastPartialRefresh = millis();
  }
}

static void drawDefaultWeatherWidget(
    const UiWidgetConfig &widget,
    const WidgetRuntimeState &state,
    int temperature,
    const char *condition,
    const char *temperatureUnit,
    bool pushPartial)
{
  char line1[32];
  snprintf(line1, sizeof(line1), "%d%s", temperature, temperatureUnit);

  drawWidgetCardBase(state.cardRect);
  drawWidgetMetaTextAtTop(widget.label, state.cardRect.x + 18, state.cardRect.y + 18);
#if UI_WEATHER_FONT_AVAILABLE
  drawCustomTextAtTop(Roboto_Black_40, line1, state.cardRect.x + 18, state.cardRect.y + 58);
#else
  drawTextRole(
      line1,
      state.cardRect.x + 18,
      baselineForTopAlignedText(line1, UI_TEXT_HERO, state.cardRect.y + 44),
      UI_TEXT_HERO);
#endif
  drawTextRole(condition, state.cardRect.x + 18, state.cardRect.y + 140, UI_TEXT_BODY);
  drawWeatherIcon(state.secondaryRect, condition);

  if (pushPartial)
  {
    display.partialUpdate(false);
    partialCounter++;
    lastPartialRefresh = millis();
  }
}

static void drawWeatherWidget(int widgetIndex, bool pushPartial)
{
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  if (state.cardRect.w <= 0 || state.cardRect.h <= 0)
  {
    return;
  }

  const bool useHomeAssistant = state.homeAssistantBound && state.homeAssistantAvailable;
  const WeatherFrame weather = WEATHER_FRAMES[state.phase % (int)(sizeof(WEATHER_FRAMES) / sizeof(WEATHER_FRAMES[0]))];
  const int temperature = useHomeAssistant ? state.value : weather.tempC;
  const char *condition = useHomeAssistant ? state.detailText : weather.condition;
  const char *temperatureUnit =
      useHomeAssistant && state.temperatureUnit[0] != '\0' ? state.temperatureUnit : "°C";

  display.setMode(BB_MODE_1BPP);
  setThemeMonoText();

  if (activePageIsOverview())
  {
    drawOverviewWeatherWidget(state, temperature, condition, temperatureUnit, pushPartial);
    return;
  }

  drawDefaultWeatherWidget(widget, state, temperature, condition, temperatureUnit, pushPartial);
}
