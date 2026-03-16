static void drawBulbIcon(int cx, int cy, int size, uint16_t color)
{
  const int globeRadius = clampInt(size / 6, 5, 8);
  const int globeCenterY = cy - (size / 10);
  const int stemTopY = globeCenterY + globeRadius - 1;
  const int stemHalf = globeRadius > 6 ? 4 : 3;
  display.drawCircle(cx, globeCenterY, globeRadius, color);
  display.drawLine(cx - stemHalf, stemTopY + 3, cx + stemHalf, stemTopY + 3, color);
  display.drawLine(cx - (stemHalf - 1), stemTopY + 6, cx + (stemHalf - 1), stemTopY + 6, color);
  display.drawLine(cx - 1, stemTopY + 9, cx + 1, stemTopY + 9, color);
}

static void drawSliderWidget(int widgetIndex, bool pushPartial)
{
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  const int safeMax = state.maxValue > 0 ? state.maxValue : 100;
  const int safeValue = clampInt(state.value, 0, safeMax);
  const int buttonSize = state.controlRect.h;
  const int radius = buttonSize / 2;
  const int controlX = state.controlRect.x;
  const int controlY = state.controlRect.y;
  const int controlW = state.controlRect.w;
  const int centerY = controlY + radius;
  const int sliderStart = controlX + buttonSize;
  const int sliderEnd = controlX + controlW - radius;
  const int sliderTravel = sliderEnd - sliderStart;
  const bool sliderEnabled = safeValue > 0;
  const int knobCenterX = sliderTravel > 0 ? sliderStart + ((safeValue * sliderTravel) / safeMax) : sliderStart;
  const MdiMonoIconAsset *icon = getSliderIconAssetByName(widget.icon);

  display.setMode(BB_MODE_1BPP);
  setThemeMonoText();
  drawWidgetCardBase(state.cardRect);
  drawTextRole(widget.label, state.cardRect.x + 18, state.cardRect.y + 18, UI_TEXT_META);

  char valueText[16];
  snprintf(valueText, sizeof(valueText), "%d%%", safeValue);
  const int valueWidth = textWidthForRole(valueText, UI_TEXT_META);
  drawTextRole(valueText, state.cardRect.x + state.cardRect.w - valueWidth - 18, state.cardRect.y + 18, UI_TEXT_META);

  display.fillRoundRect(controlX, controlY, controlW, buttonSize, radius, uiMonoPaper());
  display.drawRoundRect(controlX, controlY, controlW, buttonSize, radius, uiMonoInk());

  if (sliderEnabled)
  {
    const int fillStart = controlX + radius;
    const int fillWidth = knobCenterX - fillStart;
    if (fillWidth > 0)
    {
      display.fillRect(fillStart, controlY, fillWidth, buttonSize, uiMonoInk());
    }
    display.fillCircle(controlX + radius, centerY, radius, uiMonoInk());
    display.fillCircle(knobCenterX, centerY, radius - 1, uiMonoInk());
  }

  display.drawCircle(controlX + radius, centerY, radius, uiMonoInk());
  BB_RECT iconRect = {controlX + 6, controlY + 6, buttonSize - 12, buttonSize - 12};
  if (icon != nullptr)
  {
    drawMdiMonoIconScaledColor(iconRect, icon, sliderEnabled ? uiMonoPaper() : uiMonoInk(), 0);
  }
  else
  {
    drawBulbIcon(controlX + radius, centerY, buttonSize, sliderEnabled ? uiMonoPaper() : uiMonoInk());
  }

  if (pushPartial)
  {
    display.partialUpdate(false);
    partialCounter++;
    lastPartialRefresh = millis();
  }
}

static int sliderValueFromTouch(const WidgetRuntimeState &state, int tx)
{
  const int safeMax = state.maxValue > 0 ? state.maxValue : 100;
  const int buttonSize = state.controlRect.h;
  const int sliderStart = state.controlRect.x + buttonSize;
  const int sliderEnd = state.controlRect.x + state.controlRect.w - (buttonSize / 2);
  const int clampedX = clampInt(tx, sliderStart, sliderEnd);
  if (sliderEnd <= sliderStart)
  {
    return 0;
  }
  return ((clampedX - sliderStart) * safeMax) / (sliderEnd - sliderStart);
}
