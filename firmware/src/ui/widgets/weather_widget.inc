static void drawWeatherWidget(int widgetIndex, bool pushPartial)
{
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  const bool useHomeAssistant = state.homeAssistantBound && state.homeAssistantAvailable;
  const WeatherFrame weather = WEATHER_FRAMES[state.phase % (int)(sizeof(WEATHER_FRAMES) / sizeof(WEATHER_FRAMES[0]))];
  const int temperature = useHomeAssistant ? state.value : weather.tempC;
  const char *condition = useHomeAssistant ? state.detailText : weather.condition;

  display.setMode(BB_MODE_1BPP);
  setThemeMonoText();
  drawWidgetCardBase(state.cardRect);
  drawWidgetMetaTextAtTop(widget.label, state.cardRect.x + 18, state.cardRect.y + 18);

  char line1[32];
  snprintf(line1, sizeof(line1), "%d°C", temperature);
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
