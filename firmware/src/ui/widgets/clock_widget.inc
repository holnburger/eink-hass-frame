static void drawClockSymbolAtIndex(const WidgetRuntimeState &state, int index, char symbol)
{
  if (index < 0 || index >= (int)(sizeof(state.digitRects) / sizeof(state.digitRects[0])))
  {
    return;
  }
  const BB_RECT rect = state.digitRects[index];
  if (rect.w <= 0 || rect.h <= 0)
  {
    return;
  }
  int thickness = rect.w / (getUiFontProfile() == UI_FONT_PROFILE_SERIF ? 6 : 5);
  thickness = clampInt(thickness, 6, 12);
  if (symbol == ':')
  {
    drawSevenSegmentColon(rect.x, rect.y, rect.w, rect.h, thickness);
  }
  else
  {
    drawSevenSegmentSymbol(rect.x, rect.y, rect.w, rect.h, thickness, symbol);
  }
}

static void drawLargeClockText(const WidgetRuntimeState &state, const char *clockText, int fromIndex, int toIndex)
{
  const int maxIndex = strlen(clockText) > 0 ? (int)strlen(clockText) - 1 : -1;
  if (maxIndex < 0)
  {
    return;
  }
  if (fromIndex < 0)
  {
    fromIndex = 0;
  }
  if (toIndex > maxIndex)
  {
    toIndex = maxIndex;
  }

  for (int i = fromIndex; i <= toIndex && clockText[i] != '\0'; i++)
  {
    if (clockText[i] == ':')
    {
      drawClockSymbolAtIndex(state, i, ':');
    }
    else
    {
      drawClockSymbolAtIndex(state, i, clockText[i]);
    }
  }
}

static void drawClockHand(int cx, int cy, float degrees, int length, int thickness)
{
  const float radians = (degrees - 90.0f) * 0.01745329252f;
  const int x2 = cx + (int)roundf(cosf(radians) * length);
  const int y2 = cy + (int)roundf(sinf(radians) * length);
  drawBoldLine(cx, cy, x2, y2, thickness);
}

static void drawAnalogClockFace(const UiWidgetConfig &widget, const WidgetRuntimeState &state, const struct tm &timeInfo)
{
  const int radius = state.faceRect.w / 2;
  const int cx = state.faceRect.x + radius;
  const int cy = state.faceRect.y + radius;
  const int outerRadius = radius;
  const int innerRadius = radius - 10;

  display.drawCircle(cx, cy, outerRadius, uiMonoInk());
  display.drawCircle(cx, cy, outerRadius - 1, uiMonoInk());
  display.drawCircle(cx, cy, innerRadius, uiMonoInk());
  display.drawCircle(cx, cy, innerRadius - 1, uiMonoInk());

  for (int marker = 0; marker < 12; marker++)
  {
    const float radians = (marker * 30.0f - 90.0f) * 0.01745329252f;
    const bool majorMarker = marker % 3 == 0;
    const int outerX = cx + (int)roundf(cosf(radians) * (outerRadius - 6));
    const int outerY = cy + (int)roundf(sinf(radians) * (outerRadius - 6));
    const int innerX = cx + (int)roundf(cosf(radians) * (outerRadius - (majorMarker ? 20 : 14)));
    const int innerY = cy + (int)roundf(sinf(radians) * (outerRadius - (majorMarker ? 20 : 14)));
    drawBoldLine(innerX, innerY, outerX, outerY, majorMarker ? 3 : 2);
  }

  const float hourDegrees = ((timeInfo.tm_hour % 12) + (timeInfo.tm_min / 60.0f)) * 30.0f;
  const float minuteDegrees = (timeInfo.tm_min + (timeInfo.tm_sec / 60.0f)) * 6.0f;
  drawClockHand(cx, cy, hourDegrees, outerRadius - 34, 7);
  drawClockHand(cx, cy, minuteDegrees, outerRadius - 20, 5);

  if (clockWidgetShowsSeconds(widget))
  {
    const float secondDegrees = timeInfo.tm_sec * 6.0f;
    drawClockHand(cx, cy, secondDegrees, outerRadius - 14, 2);
  }

  display.fillCircle(cx, cy, 5, uiMonoInk());
}

static void drawClockWidget(int widgetIndex, bool pushPartial)
{
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  if (state.cardRect.w <= 0 || state.cardRect.h <= 0)
  {
    return;
  }
  char clockText[16];
  struct tm timeInfo;
  const bool hasTime = readClockTime(timeInfo);
  readClockText(widget, clockText, sizeof(clockText));

  display.setMode(BB_MODE_1BPP);
  setThemeMonoText();
  if (!activePageIsOverview())
  {
    drawWidgetCardBase(state.cardRect);
    drawWidgetMetaTextAtTop(widget.label, state.cardRect.x + 18, state.cardRect.y + 18);
    display.fillRect(state.contentRect.x, state.contentRect.y, state.contentRect.w, state.contentRect.h, uiMonoPaper());
  }

  if (clockWidgetIsAnalog(widget) && hasTime && state.faceRect.w > 0 && state.faceRect.h > 0)
  {
    drawAnalogClockFace(widget, state, timeInfo);
  }
  else
  {
    const int lastIndex = strlen(clockText) > 0 ? (int)strlen(clockText) - 1 : 0;
    drawLargeClockText(state, clockText, 0, lastIndex);
  }

  snprintf(state.lastClockText, sizeof(state.lastClockText), "%s", clockText);

  if (pushPartial)
  {
    display.partialUpdate(false);
    partialCounter++;
    lastPartialRefresh = millis();
  }
}

static void drawClockSecondsPartial(int widgetIndex, const char *clockText)
{
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  if (state.secondsRect.w <= 0 || state.secondsRect.h <= 0)
  {
    return;
  }
  display.setMode(BB_MODE_1BPP);
  setThemeMonoText();
  display.fillRect(state.secondsRect.x, state.secondsRect.y, state.secondsRect.w, state.secondsRect.h, uiMonoPaper());
  drawLargeClockText(state, clockText, 6, strlen(clockText) > 0 ? (int)strlen(clockText) - 1 : 7);
  display.partialUpdate(false);
  partialCounter++;
  lastPartialRefresh = millis();
}

static void drawClockTimePartial(int widgetIndex, const char *clockText)
{
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  if (state.clockTimeRect.w <= 0 || state.clockTimeRect.h <= 0)
  {
    drawClockWidget(widgetIndex, true);
    return;
  }

  display.setMode(BB_MODE_1BPP);
  setThemeMonoText();
  display.fillRect(
      state.clockTimeRect.x,
      state.clockTimeRect.y,
      state.clockTimeRect.w,
      state.clockTimeRect.h,
      uiMonoPaper());
  drawLargeClockText(state, clockText, 0, strlen(clockText) > 0 ? (int)strlen(clockText) - 1 : 0);
  display.partialUpdate(false);
  partialCounter++;
  lastPartialRefresh = millis();
}
