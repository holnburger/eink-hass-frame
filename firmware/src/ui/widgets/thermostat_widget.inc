static void drawThermostatModeButton(const BB_RECT &rect, const MdiMonoIconAsset *icon, bool active)
{
  if (rect.w <= 0 || rect.h <= 0 || icon == nullptr)
  {
    return;
  }

  if (active)
  {
    display.fillRoundRect(rect.x, rect.y, rect.w, rect.h, rect.h / 2, uiMonoInk());
  }
  else
  {
    fillDitherRoundRect(rect.x, rect.y, rect.w, rect.h, rect.h / 2, 1);
  }
  display.drawRoundRect(rect.x, rect.y, rect.w, rect.h, rect.h / 2, uiMonoInk());
  drawMdiMonoIconScaledColor(rect, icon, active ? uiMonoPaper() : uiMonoInk(), 2);
}

static void drawThermostatHistoryStrokeSegment(int x1, int y1, int x2, int y2)
{
  display.drawLine(x1, y1, x2, y2, uiMonoInk());
  display.drawLine(x1, y1 - 1, x2, y2 - 1, uiMonoInk());
  display.drawLine(x1, y1 + 1, x2, y2 + 1, uiMonoInk());
}

static void drawThermostatHistorySmoothedLine(const int *xPoints, const int *yPoints, int pointCount)
{
  if (pointCount <= 1)
  {
    return;
  }

  int previousX = xPoints[0];
  int previousY = yPoints[0];
  for (int segmentIndex = 0; segmentIndex < pointCount - 1; segmentIndex++)
  {
    const float p0x = static_cast<float>(segmentIndex > 0 ? xPoints[segmentIndex - 1] : xPoints[segmentIndex]);
    const float p0y = static_cast<float>(segmentIndex > 0 ? yPoints[segmentIndex - 1] : yPoints[segmentIndex]);
    const float p1x = static_cast<float>(xPoints[segmentIndex]);
    const float p1y = static_cast<float>(yPoints[segmentIndex]);
    const float p2x = static_cast<float>(xPoints[segmentIndex + 1]);
    const float p2y = static_cast<float>(yPoints[segmentIndex + 1]);
    const float p3x = static_cast<float>(segmentIndex + 2 < pointCount ? xPoints[segmentIndex + 2] : xPoints[segmentIndex + 1]);
    const float p3y = static_cast<float>(segmentIndex + 2 < pointCount ? yPoints[segmentIndex + 2] : yPoints[segmentIndex + 1]);

    for (int step = 1; step <= 18; step++)
    {
      const float t = static_cast<float>(step) / 18.0f;
      const int nextX = static_cast<int>(roundf(weatherFocusCatmullRom(p0x, p1x, p2x, p3x, t)));
      const int nextY = static_cast<int>(roundf(weatherFocusCatmullRom(p0y, p1y, p2y, p3y, t)));
      drawThermostatHistoryStrokeSegment(previousX, previousY, nextX, nextY);
      previousX = nextX;
      previousY = nextY;
    }
  }
}

static int thermostatHistoryTimeLabelWidth(const char *text)
{
  display.setItalic(false);
  display.setFont(FONT_8x8);
  display.setCursor(0, 0);
  BB_RECT bounds;
  getDisplayStringBox(text, &bounds);
  return bounds.w;
}

static void drawThermostatHistoryTimeLabelAtTop(const char *text, int x, int topY)
{
  display.setItalic(false);
  display.setFont(FONT_8x8);
  setThemeMonoText();
  display.setCursor(x, topY + 7);
  const String normalized = normalizeDisplayText(text);
  display.print(normalized.c_str());
}

static void fillFallbackThermostatHistoryPoint(int index, int currentTempTenths, int &outTemperatureTenths)
{
  const int safeIndex = clampInt(index, 0, THERMOSTAT_HISTORY_POINT_COUNT - 1);
  const float temperatureOffset =
      sinf(static_cast<float>(safeIndex) / 3.1f) * 4.5f +
      cosf(static_cast<float>(safeIndex) / 4.3f) * 1.5f;
  outTemperatureTenths = currentTempTenths + static_cast<int>(roundf(temperatureOffset));
}

static void formatThermostatHistoryDegreeLabel(int valueTenths, char *out, size_t outLen)
{
  if (outLen == 0)
  {
    return;
  }
  formatTemperatureTenths(valueTenths, out, outLen);
  const size_t length = strlen(out);
  if (length + 3 < outLen)
  {
    out[length] = '\xC2';
    out[length + 1] = '\xB0';
    out[length + 2] = '\0';
  }
}

static void formatThermostatHistoryTimeLabel(int pointIndex, char *out, size_t outLen)
{
  if (outLen == 0)
  {
    return;
  }

  struct tm timeInfo;
  if (!readClockTime(timeInfo))
  {
    snprintf(out, outLen, "-%dh", THERMOSTAT_HISTORY_POINT_COUNT - 1 - pointIndex);
    return;
  }
  timeInfo.tm_min = 0;
  timeInfo.tm_sec = 0;

  time_t epoch = mktime(&timeInfo);
  if (epoch == (time_t)-1)
  {
    snprintf(out, outLen, "-%dh", THERMOSTAT_HISTORY_POINT_COUNT - 1 - pointIndex);
    return;
  }

  epoch -= static_cast<time_t>((THERMOSTAT_HISTORY_POINT_COUNT - 1 - pointIndex) * 3600);
  localtime_r(&epoch, &timeInfo);
  if (strftime(out, outLen, "%H:%M", &timeInfo) == 0)
  {
    snprintf(out, outLen, "--:--");
  }
}

static void drawThermostatHistoryChart(
    const BB_RECT &rect,
    const WidgetRuntimeState &state,
    int currentTempTenths)
{
  int historyTenths[THERMOSTAT_HISTORY_POINT_COUNT];
  uint32_t historyMask = 0;

  if (state.homeAssistantBound)
  {
    if (state.thermostatHistoryMask != 0)
    {
      historyMask = state.thermostatHistoryMask;
      for (int index = 0; index < THERMOSTAT_HISTORY_POINT_COUNT; index++)
      {
        historyTenths[index] = state.thermostatHistory[index];
      }
    }
  }
  else
  {
    historyMask = static_cast<uint32_t>((1UL << THERMOSTAT_HISTORY_POINT_COUNT) - 1UL);
    for (int index = 0; index < THERMOSTAT_HISTORY_POINT_COUNT; index++)
    {
      fillFallbackThermostatHistoryPoint(index, currentTempTenths, historyTenths[index]);
    }
  }

  int minTemp = 100000;
  int maxTemp = -100000;
  int minTempIndex = -1;
  int maxTempIndex = -1;
  for (int index = 0; index < THERMOSTAT_HISTORY_POINT_COUNT; index++)
  {
    if ((historyMask & static_cast<uint32_t>(1UL << index)) == 0)
    {
      continue;
    }

    if (historyTenths[index] < minTemp)
    {
      minTemp = historyTenths[index];
      minTempIndex = index;
    }
    if (historyTenths[index] > maxTemp)
    {
      maxTemp = historyTenths[index];
      maxTempIndex = index;
    }
  }

  if (minTemp == 100000 || maxTemp == -100000)
  {
    const int textWidth = widgetMetaTextWidth("No temperature history");
    drawWidgetMetaTextAtTop("No temperature history", rect.x + ((rect.w - textWidth) / 2), rect.y + (rect.h / 2) - 6);
    return;
  }

  const int observedRange = maxTemp - minTemp;
  const int paddedRange = observedRange < 8 ? 8 : observedRange + 4;
  const int center = (maxTemp + minTemp) / 2;
  minTemp = center - (paddedRange / 2);
  maxTemp = minTemp + paddedRange;

  const int plotLeft = rect.x;
  const int plotRight = rect.x + rect.w - 1;
  const int plotTop = rect.y + 4;
  const int plotBottom = rect.y + rect.h - 18;
  const int plotHeight = plotBottom - plotTop;
  const int plotWidth = plotRight - plotLeft;
  const int range = maxTemp - minTemp;

  int pointX[THERMOSTAT_HISTORY_POINT_COUNT];
  int pointY[THERMOSTAT_HISTORY_POINT_COUNT];
  int availableX[THERMOSTAT_HISTORY_POINT_COUNT];
  int availableY[THERMOSTAT_HISTORY_POINT_COUNT];
  int availablePointCount = 0;

  for (int index = 0; index < THERMOSTAT_HISTORY_POINT_COUNT; index++)
  {
    pointX[index] = THERMOSTAT_HISTORY_POINT_COUNT > 1
                        ? plotLeft + ((plotWidth * index) / (THERMOSTAT_HISTORY_POINT_COUNT - 1))
                        : plotLeft + (plotWidth / 2);
    pointY[index] = plotBottom;
    if ((historyMask & static_cast<uint32_t>(1UL << index)) == 0)
    {
      continue;
    }

    pointY[index] = plotBottom - (((historyTenths[index] - minTemp) * plotHeight) / (range > 0 ? range : 1));
    availableX[availablePointCount] = pointX[index];
    availableY[availablePointCount] = pointY[index];
    availablePointCount++;
  }

  drawThermostatHistorySmoothedLine(availableX, availableY, availablePointCount);

  const int labeledExtrema[2] = {maxTempIndex, minTempIndex};
  for (int labelIndex = 0; labelIndex < 2; labelIndex++)
  {
    const int pointIndex = labeledExtrema[labelIndex];
    if (pointIndex < 0)
    {
      continue;
    }
    if (labelIndex == 1 && labeledExtrema[0] == labeledExtrema[1])
    {
      continue;
    }

    char valueText[12];
    formatThermostatHistoryDegreeLabel(historyTenths[pointIndex], valueText, sizeof(valueText));
    const int valueWidth = widgetMetaTextWidth(valueText);
    int valueX = pointX[pointIndex] - (valueWidth / 2);
    if (valueX < rect.x)
    {
      valueX = rect.x;
    }
    if (valueX + valueWidth > rect.x + rect.w)
    {
      valueX = rect.x + rect.w - valueWidth;
    }
    int valueTop = pointY[pointIndex] - 14;
    if (valueTop < rect.y)
    {
      valueTop = rect.y;
    }
    drawWidgetMetaTextAtTop(valueText, valueX, valueTop);
  }

  const int labelStep = THERMOSTAT_HISTORY_POINT_COUNT >= 24 ? 6 : 3;
  const int labelPadding = 6;
  for (int index = 0; index < THERMOSTAT_HISTORY_POINT_COUNT; index++)
  {
    if (((index + 1) % labelStep) != 0)
    {
      continue;
    }

    char timeLabel[12];
    formatThermostatHistoryTimeLabel(index, timeLabel, sizeof(timeLabel));
    const int labelWidth = thermostatHistoryTimeLabelWidth(timeLabel);
    int labelX = pointX[index] - (labelWidth / 2);
    if (labelX < rect.x + labelPadding)
    {
      labelX = rect.x + labelPadding;
    }
    if (labelX + labelWidth > rect.x + rect.w - labelPadding)
    {
      labelX = rect.x + rect.w - labelPadding - labelWidth;
    }
    drawThermostatHistoryTimeLabelAtTop(timeLabel, labelX, rect.y + rect.h - 11);
  }
}

static void drawThermostatTemperatureValue(const void *font, const char *digits, const char *unit, int x, int topY, int unitTopY)
{
  drawCustomTextAtTop(font, digits, x, topY);
  const int digitWidth = customFontTextWidth(font, digits);
  drawWidgetMetaTextAtTop(unit, x + digitWidth + 5, unitTopY);
}

static BB_RECT thermostatChevronVisualRect(const BB_RECT &touchRect)
{
  const int iconSize = 24;
  return {
      touchRect.x + ((touchRect.w - iconSize) / 2),
      touchRect.y + ((touchRect.h - iconSize) / 2),
      iconSize,
      iconSize};
}

static void drawThermostatWidget(int widgetIndex, bool pushPartial)
{
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  if (state.cardRect.w <= 0 || state.cardRect.h <= 0)
  {
    return;
  }
  const int currentTemp = state.currentValue != 0 ? state.currentValue : (widget.currentValue != 0 ? widget.currentValue : 205);
  const int maxTemp = widget.maxValue > 0 ? widget.maxValue : 300;
  const int targetTemp = clampInt(state.value > 0 ? state.value : widget.value, 120, maxTemp);
  const char *unitText = state.temperatureUnit[0] != '\0'
                             ? state.temperatureUnit
                             : "\xC2\xB0"
                               "C";
  const bool showActivateButton = thermostatSupportsActivate(state.thermostatSupportedModes);
  const bool showDeactivateButton = thermostatSupportsDeactivate(state.thermostatSupportedModes);
  const bool showCoolButton = thermostatSupportsCool(state.thermostatSupportedModes);
  const bool showHistoryGraph = thermostatWidgetShowsHistoryGraph(widget);
  const uint8_t activeButton = thermostatVisualButtonForMode(state.thermostatActiveMode);
  state.value = targetTemp;

  display.setMode(BB_MODE_1BPP);
  setThemeMonoText();
  drawWidgetCardBase(state.cardRect);
  const int leftX = state.cardRect.x + 18;
  const int topY = state.cardRect.y;
  const int metaWidth = widgetMetaTextWidth("Current / Target");
  const int metaX = state.cardRect.x + state.cardRect.w - 18 - metaWidth;

  drawWidgetMetaTextAtTop(widget.label, leftX, topY + 14);
  drawWidgetMetaTextAtTop("Current / Target", metaX, topY + 14);

  char currentDigits[12];
  formatTemperatureTenths(currentTemp, currentDigits, sizeof(currentDigits));
  char targetDigits[12];
  formatTemperatureTenths(targetTemp, targetDigits, sizeof(targetDigits));

  const int currentWidth = customFontTextWidth(UI_THERMOSTAT_CURRENT_FONT, currentDigits);
  const int unitWidth = widgetMetaTextWidth(unitText);
  const int slashWidth = widgetMetaTextWidth("/");
  const int targetX = state.tertiaryRect.x;
  const int currentBlockWidth = currentWidth + unitWidth + 5;
  const int slashGap = 16;
  const int targetGap = 22;
  const int currentX = targetX - targetGap - slashWidth - slashGap - currentBlockWidth;
  const int slashX = currentX + currentBlockWidth + slashGap;

  drawThermostatTemperatureValue(UI_THERMOSTAT_CURRENT_FONT, currentDigits, unitText, currentX, topY + 44, topY + 70);
  drawWidgetMetaTextAtTop("/", slashX, topY + 72);
  drawThermostatTemperatureValue(Roboto_Regular_20, targetDigits, unitText, targetX, topY + 61, topY + 76);

  if (showHistoryGraph)
  {
    const BB_RECT graphRect = {
        state.cardRect.x + 6,
        state.cardRect.y + 100,
        state.cardRect.w - 12,
        state.cardRect.h - 118};
    drawThermostatHistoryChart(graphRect, state, currentTemp);
  }

  if (showActivateButton)
  {
    drawThermostatModeButton(
        state.actionRects[THERMOSTAT_BUTTON_ACTIVATE],
        &MDI_ICON_ASSET_THERMOSTAT_POWER,
        activeButton == THERMOSTAT_BUTTON_ACTIVATE);
  }
  if (showDeactivateButton)
  {
    drawThermostatModeButton(
        state.actionRects[THERMOSTAT_BUTTON_DEACTIVATE],
        &MDI_ICON_ASSET_THERMOSTAT_POWER_OFF,
        activeButton == THERMOSTAT_BUTTON_DEACTIVATE);
  }
  if (showCoolButton)
  {
    drawThermostatModeButton(
        state.actionRects[THERMOSTAT_BUTTON_COOL],
        &MDI_ICON_ASSET_THERMOSTAT_SNOWFLAKE,
        activeButton == THERMOSTAT_BUTTON_COOL);
  }

  drawMiniChevron(thermostatChevronVisualRect(state.controlRect), true);
  drawMiniChevron(thermostatChevronVisualRect(state.secondaryRect), false);

  if (pushPartial)
  {
    display.partialUpdate(false);
    partialCounter++;
    lastPartialRefresh = millis();
  }
}
