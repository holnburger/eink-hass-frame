static void drawProgressWidget(int widgetIndex, bool pushPartial)
{
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  const int safeValue = clampInt(state.value, 0, state.maxValue > 0 ? state.maxValue : 100);

  display.setMode(BB_MODE_1BPP);
  setThemeMonoText();
  drawWidgetCardBase(state.cardRect);
  drawTextRole(widget.label, state.cardRect.x + 18, state.cardRect.y + 18, UI_TEXT_META);

  char valueText[16];
  snprintf(valueText, sizeof(valueText), "%d%%", safeValue);
  const int valueWidth = textWidthForRole(valueText, UI_TEXT_BODY);
  drawTextRole(valueText, state.cardRect.x + state.cardRect.w - valueWidth - 18, state.cardRect.y + 14, UI_TEXT_BODY);

  fillDitherRoundRect(state.controlRect.x, state.controlRect.y, state.controlRect.w, state.controlRect.h, state.controlRect.h / 2, 1);
  display.drawRoundRect(state.controlRect.x, state.controlRect.y, state.controlRect.w, state.controlRect.h, state.controlRect.h / 2, uiMonoInk());

  const int fillWidth = (state.controlRect.w * safeValue) / (state.maxValue > 0 ? state.maxValue : 100);
  if (fillWidth > 4)
  {
    fillDitherRoundRect(
        state.controlRect.x + 2,
        state.controlRect.y + 2,
        fillWidth - 4,
        state.controlRect.h - 4,
        (state.controlRect.h - 4) / 2,
        3);
  }

  if (pushPartial)
  {
    display.partialUpdate(false);
    partialCounter++;
    lastPartialRefresh = millis();
  }
}
