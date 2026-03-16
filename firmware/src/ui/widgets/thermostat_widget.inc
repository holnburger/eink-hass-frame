static void drawThermostatWidget(int widgetIndex, bool pushPartial)
{
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  const int currentTemp = state.currentValue != 0 ? state.currentValue : (widget.currentValue != 0 ? widget.currentValue : 205);
  const int maxTemp = widget.maxValue > 0 ? widget.maxValue : 300;
  const int targetTemp = clampInt(state.value > 0 ? state.value : widget.value, 120, maxTemp);
  state.value = targetTemp;

  display.setMode(BB_MODE_1BPP);
  setThemeMonoText();
  drawWidgetCardBase(state.cardRect);
  const int leftX = state.cardRect.x + 18;
  const int topY = state.cardRect.y;
  const int rightBlockX = state.cardRect.x + state.cardRect.w - 305;
  const int currentTop = topY + 50;
  const int targetTop = topY + 66;
  const int metaWidth = widgetMetaTextWidth("Current / Target");
  const int metaX = state.cardRect.x + state.cardRect.w - 18 - metaWidth;

  drawWidgetMetaTextAtTop(widget.label, leftX, topY + 14);
  drawWidgetMetaTextAtTop("Current / Target", metaX, topY + 14);

  char currentDigits[12];
  formatTemperatureTenths(currentTemp, currentDigits, sizeof(currentDigits));

  drawCustomTextAtTop(UI_THERMOSTAT_CURRENT_FONT, currentDigits, rightBlockX, currentTop);
  const int currentWidth = customFontTextWidth(UI_THERMOSTAT_CURRENT_FONT, currentDigits);

  drawWidgetMetaText("°C", rightBlockX + currentWidth, topY + 88);

  const int slashX = rightBlockX + currentWidth + 18;
  drawWidgetMetaText("/", slashX, topY + 88);

  char targetDigits[12];
  formatTemperatureTenths(targetTemp, targetDigits, sizeof(targetDigits));
  drawCustomTextAtTop(Roboto_Regular_20, targetDigits, state.tertiaryRect.x, targetTop);
  const int targetWidth = customFontTextWidth(Roboto_Regular_20, targetDigits);
  drawWidgetMetaText("°C", state.tertiaryRect.x + targetWidth + 2, topY + 88);

  drawMiniChevron(state.controlRect, true);
  drawMiniChevron(state.secondaryRect, false);

  if (pushPartial)
  {
    display.partialUpdate(false);
    partialCounter++;
    lastPartialRefresh = millis();
  }
}
