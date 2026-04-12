static void drawProgressWidget(int widgetIndex, bool pushPartial)
{
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  if (state.cardRect.w <= 0 || state.cardRect.h <= 0)
  {
    return;
  }
  const bool hasHomeAssistantValue = !state.homeAssistantBound || state.homeAssistantAvailable;
  const int safeValue = clampInt(state.value, 0, state.maxValue > 0 ? state.maxValue : 100);

  display.setMode(BB_MODE_1BPP);
  setThemeMonoText();

  if (activePageIsOverview())
  {
    display.fillRect(state.cardRect.x, state.cardRect.y, state.cardRect.w, state.cardRect.h, uiMonoPaper());

    if (widget.label[0] != '\0')
    {
      const int labelWidth = widgetMetaTextWidth(widget.label);
      drawWidgetMetaTextAtTop(
          widget.label,
          state.cardRect.x + ((state.cardRect.w - labelWidth) / 2),
          state.cardRect.y + 14);
    }

    char valueText[16];
    if (hasHomeAssistantValue)
    {
      snprintf(valueText, sizeof(valueText), "%d%%", safeValue);
      drawCenteredTextRoleAtTop(
          valueText,
          widget.label[0] != '\0' ? state.cardRect.y + 38 : state.cardRect.y + 24,
          UI_TEXT_BODY,
          false);
    }

    const BB_RECT progressRect =
        state.controlRect.w > 0 && state.controlRect.h > 0
            ? state.controlRect
            : BB_RECT{
                  state.cardRect.x + 44,
                  state.cardRect.y + state.cardRect.h - 20,
                  state.cardRect.w - 88,
                  10,
              };
    fillDitherRoundRect(
        progressRect.x,
        progressRect.y,
        progressRect.w,
        progressRect.h,
        progressRect.h / 2,
        1);
    display.drawRoundRect(
        progressRect.x,
        progressRect.y,
        progressRect.w,
        progressRect.h,
        progressRect.h / 2,
        uiMonoInk());

    const int fillWidth = hasHomeAssistantValue
                              ? (progressRect.w * safeValue) / (state.maxValue > 0 ? state.maxValue : 100)
                              : 0;
    if (fillWidth > 4)
    {
      fillDitherRoundRect(
          progressRect.x + 2,
          progressRect.y + 2,
          fillWidth - 4,
          progressRect.h - 4,
          (progressRect.h - 4) / 2,
          3);
    }

    if (pushPartial)
    {
      display.partialUpdate(false);
      partialCounter++;
      lastPartialRefresh = millis();
    }
    return;
  }

  drawWidgetCardBase(state.cardRect);
  drawWidgetMetaTextAtTop(widget.label, state.cardRect.x + 18, state.cardRect.y + 18);

  if (hasHomeAssistantValue)
  {
    char valueText[16];
    snprintf(valueText, sizeof(valueText), "%d%%", safeValue);
    const int valueWidth = widgetMetaTextWidth(valueText);
    drawWidgetMetaTextAtTop(valueText, state.cardRect.x + state.cardRect.w - valueWidth - 18, state.cardRect.y + 18);
  }

  fillDitherRoundRect(state.controlRect.x, state.controlRect.y, state.controlRect.w, state.controlRect.h, state.controlRect.h / 2, 1);
  display.drawRoundRect(state.controlRect.x, state.controlRect.y, state.controlRect.w, state.controlRect.h, state.controlRect.h / 2, uiMonoInk());

  const int fillWidth = hasHomeAssistantValue
                            ? (state.controlRect.w * safeValue) / (state.maxValue > 0 ? state.maxValue : 100)
                            : 0;
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
