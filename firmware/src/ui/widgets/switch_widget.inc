static void drawSwitchWidget(int widgetIndex, bool pushPartial)
{
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  if (state.cardRect.w <= 0 || state.cardRect.h <= 0)
  {
    return;
  }

  display.setMode(BB_MODE_1BPP);
  setThemeMonoText();
  if (activePageIsOverview())
  {
    const int radius = state.cardRect.w / 2;
    const int centerX = state.cardRect.x + radius;
    const int centerY = state.cardRect.y + (state.cardRect.h / 2);
    const uint16_t fillColor = state.enabled ? uiMonoInk() : uiMonoPaper();
    const uint16_t iconColor = state.enabled ? uiMonoPaper() : uiMonoInk();
    const MdiMonoIconAsset *icon = getSliderIconAssetByName(widget.icon);
    display.fillCircle(centerX, centerY, radius, fillColor);
    if (!state.enabled)
    {
      display.drawCircle(centerX, centerY, radius - 1, iconColor);
    }
    if (icon != nullptr)
    {
      drawMdiMonoIconScaledColor(state.cardRect, icon, iconColor, 18);
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
