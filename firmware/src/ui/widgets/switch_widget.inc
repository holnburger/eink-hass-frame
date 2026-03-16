static void drawSwitchWidget(int widgetIndex, bool pushPartial)
{
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);

  display.setMode(BB_MODE_1BPP);
  setThemeMonoText();
  drawWidgetCardBase(state.cardRect);
  drawTextRole(widget.label, state.cardRect.x + 18, state.cardRect.y + 18, UI_TEXT_META);

  const uint8_t trackShade = state.enabled ? 3 : 1;
  fillDitherRoundRect(
      state.controlRect.x,
      state.controlRect.y,
      state.controlRect.w,
      state.controlRect.h,
      state.controlRect.h / 2,
      trackShade);
  display.drawRoundRect(state.controlRect.x, state.controlRect.y, state.controlRect.w, state.controlRect.h, state.controlRect.h / 2, uiMonoInk());

  const int knobMargin = 4;
  const int knobSize = state.controlRect.h - (2 * knobMargin);
  const int knobX = state.enabled
                        ? (state.controlRect.x + state.controlRect.w - knobMargin - knobSize)
                        : (state.controlRect.x + knobMargin);
  const int knobY = state.controlRect.y + knobMargin;
  display.fillCircle(knobX + (knobSize / 2), knobY + (knobSize / 2), knobSize / 2, BBEP_WHITE);
  display.drawCircle(knobX + (knobSize / 2), knobY + (knobSize / 2), knobSize / 2, uiMonoInk());

  if (pushPartial)
  {
    display.partialUpdate(false);
    partialCounter++;
    lastPartialRefresh = millis();
  }
}
