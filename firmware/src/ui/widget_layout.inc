static void initializeWidgetStates()
{
  for (int pageIndex = 0; pageIndex < UI_PAGE_COUNT; pageIndex++)
  {
    weatherPagePhases[pageIndex] = pageIndex % (int)(sizeof(WEATHER_FRAMES) / sizeof(WEATHER_FRAMES[0]));
    memset(&weatherPageStates[pageIndex], 0, sizeof(weatherPageStates[pageIndex]));
    memset(&mediaPageStates[pageIndex], 0, sizeof(mediaPageStates[pageIndex]));
    for (int widgetIndex = 0; widgetIndex < UI_MAX_WIDGETS_PER_PAGE; widgetIndex++)
    {
      WidgetRuntimeState &state = widgetStates[pageIndex][widgetIndex];
      memset(&state, 0, sizeof(state));

      if (widgetIndex >= UI_PAGES[pageIndex].widgetCount)
      {
        continue;
      }

      const UiWidgetConfig widget = getWidgetConfig(pageIndex, widgetIndex);
      if (widget.type == UI_WIDGET_THERMOSTAT)
      {
        state.value = clampInt(widget.value, 120, widget.maxValue > 0 ? widget.maxValue : 300);
        state.currentValue = widget.currentValue != 0 ? widget.currentValue : 205;
        state.maxValue = widget.maxValue > 0 ? widget.maxValue : 300;
        normalizeTemperatureUnitLabel("", state.temperatureUnit, sizeof(state.temperatureUnit));
      }
      else
      {
        state.value = clampInt(widget.value, 0, widget.maxValue > 0 ? widget.maxValue : 100);
        state.currentValue = widget.currentValue;
        state.maxValue = widget.maxValue > 0 ? widget.maxValue : 100;
        state.temperatureUnit[0] = '\0';
      }
      state.enabled = widget.enabled != 0;
      state.direction = 1;
      state.phase = widgetIndex % (int)(sizeof(WEATHER_FRAMES) / sizeof(WEATHER_FRAMES[0]));
      state.homeAssistantBound = widgetHasHomeAssistantBinding(widget);
      state.homeAssistantAvailable = false;
      state.lastHomeAssistantUpdateMs = 0;
      snprintf(state.lastClockText, sizeof(state.lastClockText), "--:--:--");
      snprintf(state.detailText, sizeof(state.detailText), "%s", "");
      state.textValueInitialized = false;
      state.textValue[0] = '\0';
      if (textWidgetUsesMqttInput(widget))
      {
        copyUtf8StringToBuffer(String(widget.label), state.textValue, sizeof(state.textValue));
        state.textValueInitialized = true;
      }
    }
  }
}

static void computeClockLayout(const UiWidgetConfig &widget, WidgetRuntimeState &state)
{
  memset(state.digitRects, 0, sizeof(state.digitRects));
  state.clockTimeRect = {0, 0, 0, 0};
  state.secondsRect = {0, 0, 0, 0};
  state.faceRect = {0, 0, 0, 0};

  if (clockWidgetIsAnalog(widget))
  {
    const int faceSize = (state.contentRect.w < state.contentRect.h ? state.contentRect.w : state.contentRect.h);
    const int inset = 8;
    state.faceRect = {
        state.contentRect.x + ((state.contentRect.w - faceSize) / 2) + inset,
        state.contentRect.y + ((state.contentRect.h - faceSize) / 2) + inset,
        faceSize - (inset * 2),
        faceSize - (inset * 2),
    };
    return;
  }

  const bool showSeconds = clockWidgetShowsSeconds(widget);
  const int totalChars = showSeconds ? 8 : 5;
  const int colonCount = showSeconds ? 2 : 1;
  const int digitCount = showSeconds ? 6 : 4;
  const int gap = getUiFontProfile() == UI_FONT_PROFILE_MONO ? 10 : 8;
  const int colonW = getUiFontProfile() == UI_FONT_PROFILE_SERIF ? 18 : 16;
  int digitW = (state.contentRect.w - (colonCount * colonW) - ((totalChars - 1) * gap)) / digitCount;
  digitW = clampInt(digitW, 28, 58);
  int digitH = state.contentRect.h - 10;
  digitH = clampInt(digitH, 68, 150);

  const int totalWidth = (digitCount * digitW) + (colonCount * colonW) + ((totalChars - 1) * gap);
  int x = state.contentRect.x + ((state.contentRect.w - totalWidth) / 2);
  const int y = state.contentRect.y + ((state.contentRect.h - digitH) / 2);

  for (int i = 0; i < totalChars; i++)
  {
    const bool isColon = i == 2 || (showSeconds && i == 5);
    const int symbolW = isColon ? colonW : digitW;
    state.digitRects[i] = {x, y, symbolW, digitH};
    x += symbolW + gap;
  }

  state.clockTimeRect = state.digitRects[0];
  const int timeRight = state.digitRects[totalChars - 1].x + state.digitRects[totalChars - 1].w;
  state.clockTimeRect.w = timeRight - state.clockTimeRect.x;
  state.clockTimeRect.x -= 2;
  state.clockTimeRect.y -= 2;
  state.clockTimeRect.w += 4;
  state.clockTimeRect.h += 4;
  if (state.clockTimeRect.x < state.contentRect.x)
  {
    state.clockTimeRect.x = state.contentRect.x;
  }
  if (state.clockTimeRect.y < state.contentRect.y)
  {
    state.clockTimeRect.y = state.contentRect.y;
  }
  const int maxRight = state.contentRect.x + state.contentRect.w;
  const int maxBottom = state.contentRect.y + state.contentRect.h;
  if (state.clockTimeRect.x + state.clockTimeRect.w > maxRight)
  {
    state.clockTimeRect.w = maxRight - state.clockTimeRect.x;
  }
  if (state.clockTimeRect.y + state.clockTimeRect.h > maxBottom)
  {
    state.clockTimeRect.h = maxBottom - state.clockTimeRect.y;
  }

  if (showSeconds)
  {
    state.secondsRect = state.digitRects[6];
    const int right = state.digitRects[7].x + state.digitRects[7].w;
    state.secondsRect.w = right - state.secondsRect.x;
    state.secondsRect.x -= 2;
    state.secondsRect.y -= 2;
    state.secondsRect.w += 4;
    state.secondsRect.h += 4;
    if (state.secondsRect.x < state.contentRect.x)
    {
      state.secondsRect.x = state.contentRect.x;
    }
    if (state.secondsRect.y < state.contentRect.y)
    {
      state.secondsRect.y = state.contentRect.y;
    }
    if (state.secondsRect.x + state.secondsRect.w > maxRight)
    {
      state.secondsRect.w = maxRight - state.secondsRect.x;
    }
    if (state.secondsRect.y + state.secondsRect.h > maxBottom)
    {
      state.secondsRect.h = maxBottom - state.secondsRect.y;
    }
  }
}

static void layoutWeatherFocusPage()
{
  const int width = display.width();
  const int height = display.height();
  const int margin = 22;
  const int contentTop = showPageChrome() ? 24 : 20;
  const int footerTop = showPageChrome() ? (height - 78) : (height - 16);
  const int contentHeight = footerTop - contentTop;
  const int heroHeight = 300;
  const int statsGap = 14;
  const int statsHeight = 68;
  const int chartGap = 12;
  const int hourlyChartHeight = 224;
  const int forecastGap = 12;

  weatherFocusContentRect = {0, contentTop, width, contentHeight};
  weatherFocusHeroRect = {margin, contentTop + 8, width - (margin * 2), heroHeight};
  weatherFocusHeroIconRect = {weatherFocusHeroRect.x + 12, weatherFocusHeroRect.y + 36, 236, 236};
  weatherFocusStatsRect = {
      margin,
      weatherFocusHeroRect.y + weatherFocusHeroRect.h + statsGap,
      width - (margin * 2),
      statsHeight,
  };
  weatherFocusTemperatureChartRect = {
      margin,
      weatherFocusStatsRect.y + weatherFocusStatsRect.h + chartGap,
      width - (margin * 2),
      hourlyChartHeight,
  };
  weatherFocusRainChartRect = {
      0,
      0,
      0,
      0,
  };
  weatherFocusTimelineRect = {
      margin,
      weatherFocusTemperatureChartRect.y + weatherFocusTemperatureChartRect.h + forecastGap,
      width - (margin * 2),
      footerTop - (weatherFocusTemperatureChartRect.y + weatherFocusTemperatureChartRect.h + forecastGap) - 8,
  };

  const int gap = 0;
  const int cardWidth = weatherFocusTimelineRect.w / WEATHER_FOCUS_FORECAST_DAY_COUNT;
  for (int index = 0; index < WEATHER_FOCUS_FORECAST_DAY_COUNT; index++)
  {
    const int cardX = weatherFocusTimelineRect.x + (cardWidth * index);
    const int nextX =
        index == (WEATHER_FOCUS_FORECAST_DAY_COUNT - 1)
            ? weatherFocusTimelineRect.x + weatherFocusTimelineRect.w
            : cardX + cardWidth;
    weatherFocusForecastRects[index] = {
        cardX,
        weatherFocusTimelineRect.y,
        nextX - cardX,
        weatherFocusTimelineRect.h,
    };
  }

  navLeftRect = showPageChrome() ? BB_RECT{margin - 1, height - 67, 48, 48} : BB_RECT{0, 0, 0, 0};
  navRightRect = showPageChrome() ? BB_RECT{width - margin - 47, height - 67, 48, 48} : BB_RECT{0, 0, 0, 0};
  debugIpRect = {0, 0, 0, 0};
}

static void layoutOverviewPage()
{
  const int width = display.width();
  const int height = display.height();
  const int margin = 24;
  const int contentTop = showPageChrome() ? 24 : 18;
  const int footerTop = showPageChrome() ? (height - 78) : (height - 16);
  const UiPageConfig &page = UI_PAGES[currentPageIndex];

  int clockWidgetIndex = -1;
  int textWidgetIndices[UI_MAX_WIDGETS_PER_PAGE];
  int textWidgetCount = 0;
  int textAboveWidgetIndices[UI_MAX_WIDGETS_PER_PAGE];
  int textAboveWidgetCount = 0;
  int textBelowWidgetIndices[UI_MAX_WIDGETS_PER_PAGE];
  int textBelowWidgetCount = 0;
  int switchWidgetIndices[6];
  int switchWidgetCount = 0;

  for (int widgetIndex = 0; widgetIndex < page.widgetCount; widgetIndex++)
  {
    WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
    state.cardRect = {0, 0, 0, 0};
    state.contentRect = {0, 0, 0, 0};
    state.controlRect = {0, 0, 0, 0};
    state.secondaryRect = {0, 0, 0, 0};
    state.tertiaryRect = {0, 0, 0, 0};
    state.faceRect = {0, 0, 0, 0};
    state.clockTimeRect = {0, 0, 0, 0};
    state.secondsRect = {0, 0, 0, 0};
    memset(state.digitRects, 0, sizeof(state.digitRects));
    memset(state.actionRects, 0, sizeof(state.actionRects));

    const UiWidgetConfig widget = page.widgets[widgetIndex];
    if (widget.type == UI_WIDGET_CLOCK && clockWidgetIndex < 0)
    {
      clockWidgetIndex = widgetIndex;
    }
    else if (widget.type == UI_WIDGET_TEXT && textWidgetCount < UI_MAX_WIDGETS_PER_PAGE)
    {
      textWidgetIndices[textWidgetCount++] = widgetIndex;
    }
    else if (widget.type == UI_WIDGET_SWITCH && switchWidgetCount < 6)
    {
      switchWidgetIndices[switchWidgetCount++] = widgetIndex;
    }
  }

  for (int index = 0; index < textWidgetCount; index++)
  {
    if (clockWidgetIndex < 0 || textWidgetIndices[index] < clockWidgetIndex)
    {
      textAboveWidgetIndices[textAboveWidgetCount++] = textWidgetIndices[index];
    }
    else
    {
      textBelowWidgetIndices[textBelowWidgetCount++] = textWidgetIndices[index];
    }
  }

  const int switchRows = switchWidgetCount > 3 ? 2 : (switchWidgetCount > 0 ? 1 : 0);
  const int switchCols = switchWidgetCount >= 3 ? 3 : switchWidgetCount;
  const int switchSize = 84;
  const int switchGapX = 22;
  const int switchGapY = 18;
  const int switchGridHeight = switchRows > 0 ? (switchRows * switchSize) + ((switchRows - 1) * switchGapY) : 0;
  const int textHeight = 152;
  const int textGap = 18;
  const int textAboveBlockHeight = textAboveWidgetCount > 0 ? (textAboveWidgetCount * textHeight) + ((textAboveWidgetCount - 1) * textGap) : 0;
  const int textBelowBlockHeight = textBelowWidgetCount > 0 ? (textBelowWidgetCount * textHeight) + ((textBelowWidgetCount - 1) * textGap) : 0;
  const int switchBlockTop = footerTop - switchGridHeight - 22;
  const int textAboveBlockTop = contentTop + 10;
  const int textBelowBlockTop = switchBlockTop - (textBelowBlockHeight > 0 ? textBelowBlockHeight + 20 : 0);
  const int clockTop = textAboveBlockHeight > 0
                         ? textAboveBlockTop + textAboveBlockHeight + 12
                         : contentTop + 8;
  const int clockBottom = (textBelowBlockHeight > 0 ? textBelowBlockTop : switchBlockTop) - 12;

  if (clockWidgetIndex >= 0)
  {
    const UiWidgetConfig widget = page.widgets[clockWidgetIndex];
    WidgetRuntimeState &state = getWidgetState(currentPageIndex, clockWidgetIndex);
    const int clockHeight = clampInt(clockBottom - clockTop, 180, footerTop - clockTop - 12);
    state.cardRect = {margin, clockTop, width - (margin * 2), clockHeight};
    state.contentRect = state.cardRect;
    computeClockLayout(widget, state);
  }

  int textY = textAboveBlockTop;
  for (int index = 0; index < textAboveWidgetCount; index++)
  {
    WidgetRuntimeState &state = getWidgetState(currentPageIndex, textAboveWidgetIndices[index]);
    state.cardRect = {margin, textY, width - (margin * 2), textHeight};
    state.contentRect = state.cardRect;
    textY += textHeight + textGap;
  }

  textY = textBelowBlockTop;
  for (int index = 0; index < textBelowWidgetCount; index++)
  {
    WidgetRuntimeState &state = getWidgetState(currentPageIndex, textBelowWidgetIndices[index]);
    state.cardRect = {margin, textY, width - (margin * 2), textHeight};
    state.contentRect = state.cardRect;
    textY += textHeight + textGap;
  }

  if (switchCols > 0)
  {
    const int gridWidth = (switchCols * switchSize) + ((switchCols - 1) * switchGapX);
    const int startX = (width - gridWidth) / 2;
    for (int index = 0; index < switchWidgetCount; index++)
    {
      const int row = index / 3;
      const int col = index % 3;
      WidgetRuntimeState &state = getWidgetState(currentPageIndex, switchWidgetIndices[index]);
      const int x = startX + (col * (switchSize + switchGapX));
      const int y = switchBlockTop + (row * (switchSize + switchGapY));
      state.cardRect = {x, y, switchSize, switchSize};
      state.contentRect = state.cardRect;
      state.controlRect = state.cardRect;
    }
  }

  navLeftRect = showPageChrome() ? BB_RECT{margin - 1, height - 67, 48, 48} : BB_RECT{0, 0, 0, 0};
  navRightRect = showPageChrome() ? BB_RECT{width - margin - 47, height - 67, 48, 48} : BB_RECT{0, 0, 0, 0};
  debugIpRect = {0, 0, 0, 0};
}

static void layoutMediaPlayerPage()
{
  const int width = display.width();
  const int height = display.height();
  const int margin = 24;
  const int contentTop = showPageChrome() ? 24 : 20;
  const int footerTop = showPageChrome() ? (height - 78) : (height - 16);
  const int contentHeight = footerTop - contentTop;

  mediaPlayerContentRect = {0, contentTop, width, contentHeight};

  const int bodyWidth = 420;
  const int bodyHeight = 560;
  const int bodyX = (width - bodyWidth) / 2;
  const int bodyY = contentTop + ((contentHeight - bodyHeight) / 2);
  const int controlGap = 14;
  const int prevButtonWidth = 48;
  const int playPauseButtonWidth = 48;
  const int nextButtonWidth = 48;
  const int controlHeight = 48;
  const int controlsTop = bodyY + 512;
  const int controlsWidth = prevButtonWidth + playPauseButtonWidth + nextButtonWidth + (controlGap * 2);
  const int controlsX = bodyX + ((bodyWidth - controlsWidth) / 2);
  mediaPlayerBodyRect = {bodyX, bodyY, bodyWidth, bodyHeight};
  mediaPlayerCoverRect = {bodyX + ((bodyWidth - 384) / 2), bodyY + 8, 384, 384};
  mediaPlayerProgressRect = {bodyX + 14, bodyY + 492, bodyWidth - 28, 12};
  mediaPlayerPrevButtonRect = {controlsX, controlsTop, prevButtonWidth, controlHeight};
  mediaPlayerPlayPauseButtonRect = {controlsX + prevButtonWidth + controlGap, controlsTop, playPauseButtonWidth, controlHeight};
  mediaPlayerNextButtonRect = {controlsX + prevButtonWidth + controlGap + playPauseButtonWidth + controlGap, controlsTop, nextButtonWidth, controlHeight};

  navLeftRect = showPageChrome() ? BB_RECT{margin - 1, height - 67, 48, 48} : BB_RECT{0, 0, 0, 0};
  navRightRect = showPageChrome() ? BB_RECT{width - margin - 47, height - 67, 48, 48} : BB_RECT{0, 0, 0, 0};
  debugIpRect = {0, 0, 0, 0};
}

static void layoutCurrentPage()
{
  if (activePageIsOverview())
  {
    layoutOverviewPage();
    return;
  }
  if (activePageIsWeatherFocus())
  {
    layoutWeatherFocusPage();
    return;
  }
  if (activePageIsMediaPlayer())
  {
    layoutMediaPlayerPage();
    return;
  }

  const int width = display.width();
  const int height = display.height();
  const UiPageConfig &page = UI_PAGES[currentPageIndex];
  const int margin = 24;
  const int topY = showPageChrome() ? 76 : 28;
  const int footerTop = showPageChrome() ? (height - 78) : (height - 20);
  const int gap = 16;
  const int availableHeight = footerTop - topY - (page.widgetCount > 0 ? (page.widgetCount - 1) * gap : 0);

  int totalWeight = 0;
  for (int i = 0; i < page.widgetCount; i++)
  {
    if (widgetShouldBeVisible(currentPageIndex, i))
    {
      totalWeight += widgetWeight(page.widgets[i]);
    }
  }
  if (totalWeight <= 0)
  {
    totalWeight = 1;
  }

  int currentY = topY;
  int remainingHeight = availableHeight;
  int remainingWeight = totalWeight;
  int visibleWidgetCount = 0;

  for (int i = 0; i < page.widgetCount; i++)
  {
    if (widgetShouldBeVisible(currentPageIndex, i))
    {
      visibleWidgetCount++;
    }
  }

  int visibleWidgetIndex = 0;

  for (int i = 0; i < page.widgetCount; i++)
  {
    const UiWidgetConfig widget = page.widgets[i];
    WidgetRuntimeState &state = getWidgetState(currentPageIndex, i);
      state.cardRect = {0, 0, 0, 0};
      state.contentRect = {0, 0, 0, 0};
      state.controlRect = {0, 0, 0, 0};
      state.secondaryRect = {0, 0, 0, 0};
      state.tertiaryRect = {0, 0, 0, 0};
      state.faceRect = {0, 0, 0, 0};
      state.clockTimeRect = {0, 0, 0, 0};
      state.secondsRect = {0, 0, 0, 0};
      memset(state.actionRects, 0, sizeof(state.actionRects));

    if (!widgetShouldBeVisible(currentPageIndex, i))
    {
      continue;
    }

    const int weight = widgetWeight(widget);
    const bool thermostatHistoryGraph = thermostatWidgetShowsHistoryGraph(widget);
    int cardHeight = (visibleWidgetIndex == visibleWidgetCount - 1) ? remainingHeight : (remainingHeight * weight) / remainingWeight;
    const int minHeight = widget.type == UI_WIDGET_PROGRESS ? 52 : widget.type == UI_WIDGET_SWITCH   ? 56
                                                               : widget.type == UI_WIDGET_TEXT       ? 148
                                                               : widget.type == UI_WIDGET_THERMOSTAT ? (thermostatHistoryGraph ? 182 : 100)
                                                                                                     : 88;
    const int maxHeight = widget.type == UI_WIDGET_PROGRESS ? 84 : widget.type == UI_WIDGET_SWITCH   ? 92
                                                               : widget.type == UI_WIDGET_TEXT       ? 244
                                                               : widget.type == UI_WIDGET_THERMOSTAT ? (thermostatHistoryGraph ? 224 : 132)
                                                                                                     : 340;
    cardHeight = clampInt(cardHeight, minHeight, maxHeight);
    state.cardRect = {margin, currentY, width - (margin * 2), cardHeight};
    state.contentRect = {state.cardRect.x + 18, state.cardRect.y + 52, state.cardRect.w - 36, state.cardRect.h - 70};

    if (widget.type == UI_WIDGET_CLOCK)
    {
      state.contentRect = {state.cardRect.x + 18, state.cardRect.y + 50, state.cardRect.w - 36, state.cardRect.h - 68};
      computeClockLayout(widget, state);
    }
    else if (widget.type == UI_WIDGET_WEATHER)
    {
      const int iconSize = clampInt(state.cardRect.h - 18, 112, 128);
      state.secondaryRect = {state.cardRect.x + state.cardRect.w - iconSize - 14, state.cardRect.y + 9, iconSize, iconSize};
    }
    else if (widget.type == UI_WIDGET_PROGRESS || widget.type == UI_WIDGET_SLIDER)
    {
      if (widget.type == UI_WIDGET_SLIDER)
      {
        const int sliderHeight = clampInt(state.cardRect.h - 42, 42, 52);
        state.controlRect = {state.cardRect.x + 18, state.cardRect.y + state.cardRect.h - sliderHeight - 14, state.cardRect.w - 36, sliderHeight};
        state.secondaryRect = {state.controlRect.x, state.controlRect.y, sliderHeight, sliderHeight};
      }
      else
      {
        state.controlRect = {state.cardRect.x + 18, state.cardRect.y + state.cardRect.h - 21, state.cardRect.w - 36, 9};
      }
    }
    else if (widget.type == UI_WIDGET_SWITCH)
    {
      state.controlRect = {state.cardRect.x + state.cardRect.w - 130, state.cardRect.y + (state.cardRect.h / 2) - 18, 96, 36};
    }
    else if (widget.type == UI_WIDGET_THERMOSTAT)
    {
      const int valueTop = state.cardRect.y + 46;
      const int chevronX = state.cardRect.x + state.cardRect.w - 44;
      const int chevronTouchSize = 36;
      const int chevronTouchInset = 6;
      const int buttonSize = 26;
      const int buttonGap = 8;
      const int buttonY = thermostatHistoryGraph
                              ? state.cardRect.y + 44
                              : state.cardRect.y + state.cardRect.h - buttonSize - 11;
      state.tertiaryRect = {chevronX - 108, valueTop + 14, 92, 24};
      state.controlRect = {chevronX - chevronTouchInset, valueTop - 8, chevronTouchSize, chevronTouchSize};
      state.secondaryRect = {chevronX - chevronTouchInset, valueTop + 28, chevronTouchSize, chevronTouchSize};
      state.actionRects[THERMOSTAT_BUTTON_ACTIVATE] = {state.cardRect.x + 18, buttonY, buttonSize, buttonSize};
      state.actionRects[THERMOSTAT_BUTTON_DEACTIVATE] = {state.cardRect.x + 18 + buttonSize + buttonGap, buttonY, buttonSize, buttonSize};
      state.actionRects[THERMOSTAT_BUTTON_COOL] = {state.cardRect.x + 18 + ((buttonSize + buttonGap) * 2), buttonY, buttonSize, buttonSize};
    }

    currentY += cardHeight + gap;
    remainingHeight -= cardHeight;
    remainingWeight -= weight;
    visibleWidgetIndex++;
  }

  navLeftRect = showPageChrome() ? BB_RECT{margin - 1, height - 67, 48, 48} : BB_RECT{0, 0, 0, 0};
  navRightRect = showPageChrome() ? BB_RECT{width - margin - 47, height - 67, 48, 48} : BB_RECT{0, 0, 0, 0};
  debugIpRect = {0, 0, 0, 0};
}
