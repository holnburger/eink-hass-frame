static void initializeWidgetStates()
{
  for (int pageIndex = 0; pageIndex < UI_PAGE_COUNT; pageIndex++)
  {
    weatherPagePhases[pageIndex] = pageIndex % (int)(sizeof(WEATHER_FRAMES) / sizeof(WEATHER_FRAMES[0]));
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
        state.maxValue = widget.maxValue > 0 ? widget.maxValue : 300;
      }
      else
      {
        state.value = clampInt(widget.value, 0, widget.maxValue > 0 ? widget.maxValue : 100);
        state.maxValue = widget.maxValue > 0 ? widget.maxValue : 100;
      }
      state.enabled = widget.enabled != 0;
      state.direction = 1;
      state.phase = widgetIndex % (int)(sizeof(WEATHER_FRAMES) / sizeof(WEATHER_FRAMES[0]));
      snprintf(state.lastClockText, sizeof(state.lastClockText), "--:--:--");
    }
  }
}

static void computeClockLayout(const UiWidgetConfig &widget, WidgetRuntimeState &state)
{
  memset(state.digitRects, 0, sizeof(state.digitRects));
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
    const int maxRight = state.contentRect.x + state.contentRect.w;
    const int maxBottom = state.contentRect.y + state.contentRect.h;
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
  const int contentTop = showPageChrome() ? 74 : 20;
  const int footerTop = showPageChrome() ? (height - 78) : (height - 16);
  const int contentHeight = footerTop - contentTop;

  weatherFocusContentRect = {0, contentTop, width, contentHeight};
  weatherFocusTimelineRect = {margin, footerTop - 66, width - (margin * 2), 58};
  weatherFocusHeroRect = {margin, contentTop + 6, width - (margin * 2), weatherFocusTimelineRect.y - contentTop - 20};
  weatherFocusHeroIconRect = {-96, contentTop + 38, 420, 420};

  const int gap = 6;
  const int cardWidth = (weatherFocusTimelineRect.w - (gap * 3)) / 4;
  for (int index = 0; index < 4; index++)
  {
    weatherFocusForecastRects[index] = {
        weatherFocusTimelineRect.x + (index * (cardWidth + gap)),
        weatherFocusTimelineRect.y,
        cardWidth,
        weatherFocusTimelineRect.h,
    };
  }

  navLeftRect = showPageChrome() ? BB_RECT{margin + 4, height - 60, 34, 34} : BB_RECT{0, 0, 0, 0};
  navRightRect = showPageChrome() ? BB_RECT{width - margin - 38, height - 60, 34, 34} : BB_RECT{0, 0, 0, 0};
  debugIpRect = {width - margin - 230, height - 18, 230, 10};
}

static void layoutMediaPlayerPage()
{
  const int width = display.width();
  const int height = display.height();
  const int margin = 24;
  const int contentTop = showPageChrome() ? 74 : 20;
  const int footerTop = showPageChrome() ? (height - 78) : (height - 16);
  const int contentHeight = footerTop - contentTop;

  mediaPlayerContentRect = {0, contentTop, width, contentHeight};

  const int bodyWidth = 420;
  const int bodyHeight = 560;
  const int bodyX = (width - bodyWidth) / 2;
  const int bodyY = contentTop + ((contentHeight - bodyHeight) / 2);
  mediaPlayerBodyRect = {bodyX, bodyY, bodyWidth, bodyHeight};
  mediaPlayerCoverRect = {bodyX + ((bodyWidth - 384) / 2), bodyY + 8, 384, 384};
  mediaPlayerProgressRect = {bodyX + 14, bodyY + 492, bodyWidth - 28, 12};

  navLeftRect = showPageChrome() ? BB_RECT{margin + 4, height - 60, 34, 34} : BB_RECT{0, 0, 0, 0};
  navRightRect = showPageChrome() ? BB_RECT{width - margin - 38, height - 60, 34, 34} : BB_RECT{0, 0, 0, 0};
  debugIpRect = {width - margin - 230, height - 18, 230, 10};
}

static void layoutCurrentPage()
{
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
    totalWeight += widgetWeight(page.widgets[i].type);
  }
  if (totalWeight <= 0)
  {
    totalWeight = 1;
  }

  int currentY = topY;
  int remainingHeight = availableHeight;
  int remainingWeight = totalWeight;

  for (int i = 0; i < page.widgetCount; i++)
  {
    const UiWidgetConfig widget = page.widgets[i];
    WidgetRuntimeState &state = getWidgetState(currentPageIndex, i);
    const int weight = widgetWeight(widget.type);
    int cardHeight = (i == page.widgetCount - 1) ? remainingHeight : (remainingHeight * weight) / remainingWeight;
    const int minHeight = widget.type == UI_WIDGET_PROGRESS ? 52 : widget.type == UI_WIDGET_SWITCH   ? 56
                                                               : widget.type == UI_WIDGET_THERMOSTAT ? 100
                                                                                                     : 88;
    const int maxHeight = widget.type == UI_WIDGET_PROGRESS ? 84 : widget.type == UI_WIDGET_SWITCH   ? 92
                                                               : widget.type == UI_WIDGET_THERMOSTAT ? 132
                                                                                                     : 340;
    cardHeight = clampInt(cardHeight, minHeight, maxHeight);
    state.cardRect = {margin, currentY, width - (margin * 2), cardHeight};
    state.contentRect = {state.cardRect.x + 18, state.cardRect.y + 52, state.cardRect.w - 36, state.cardRect.h - 70};
    state.controlRect = {0, 0, 0, 0};
    state.secondaryRect = {0, 0, 0, 0};
    state.tertiaryRect = {0, 0, 0, 0};
    state.faceRect = {0, 0, 0, 0};
    state.secondsRect = {0, 0, 0, 0};

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
      state.tertiaryRect = {chevronX - 90, valueTop + 1, 84, 24};
      state.controlRect = {chevronX, valueTop - 6, 24, 24};
      state.secondaryRect = {chevronX, valueTop + 50, 24, 24};
    }

    currentY += cardHeight + gap;
    remainingHeight -= cardHeight;
    remainingWeight -= weight;
  }

  navLeftRect = showPageChrome() ? BB_RECT{margin + 4, height - 60, 34, 34} : BB_RECT{0, 0, 0, 0};
  navRightRect = showPageChrome() ? BB_RECT{width - margin - 38, height - 60, 34, 34} : BB_RECT{0, 0, 0, 0};
  debugIpRect = {width - margin - 230, height - 18, 230, 10};
}
