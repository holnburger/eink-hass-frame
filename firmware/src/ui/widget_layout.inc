static void initializeWidgetStates()
{
  for (int pageIndex = 0; pageIndex < UI_PAGE_COUNT; pageIndex++)
  {
    weatherPagePhases[pageIndex] = pageIndex % (int)(sizeof(WEATHER_FRAMES) / sizeof(WEATHER_FRAMES[0]));
    memset(&weatherPageStates[pageIndex], 0, sizeof(weatherPageStates[pageIndex]));
    weatherPageStates[pageIndex].supportsDailyForecast = true;
    weatherPageStates[pageIndex].supportsHourlyForecast = true;
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

static BB_RECT toDisplayRect(const UiLayoutRect &rect)
{
  return BB_RECT{rect.x, rect.y, rect.w, rect.h};
}

static_assert((uint8_t)UI_LAYOUT_WIDGET_CLOCK == (uint8_t)UI_WIDGET_CLOCK, "layout widget type mapping changed");
static_assert((uint8_t)UI_LAYOUT_WIDGET_WEATHER == (uint8_t)UI_WIDGET_WEATHER, "layout widget type mapping changed");
static_assert((uint8_t)UI_LAYOUT_WIDGET_PROGRESS == (uint8_t)UI_WIDGET_PROGRESS, "layout widget type mapping changed");
static_assert((uint8_t)UI_LAYOUT_WIDGET_SWITCH == (uint8_t)UI_WIDGET_SWITCH, "layout widget type mapping changed");
static_assert((uint8_t)UI_LAYOUT_WIDGET_BUTTON == (uint8_t)UI_WIDGET_BUTTON, "layout widget type mapping changed");
static_assert((uint8_t)UI_LAYOUT_WIDGET_SLIDER == (uint8_t)UI_WIDGET_SLIDER, "layout widget type mapping changed");
static_assert((uint8_t)UI_LAYOUT_WIDGET_THERMOSTAT == (uint8_t)UI_WIDGET_THERMOSTAT, "layout widget type mapping changed");
static_assert((uint8_t)UI_LAYOUT_WIDGET_TEXT == (uint8_t)UI_WIDGET_TEXT, "layout widget type mapping changed");
static_assert((uint8_t)UI_LAYOUT_WIDGET_TITLE == (uint8_t)UI_WIDGET_TITLE, "layout widget type mapping changed");
static_assert((uint8_t)UI_LAYOUT_CLOCK_DIGITAL == (uint8_t)UI_CLOCK_DIGITAL, "layout clock style mapping changed");
static_assert((uint8_t)UI_LAYOUT_CLOCK_ANALOG == (uint8_t)UI_CLOCK_ANALOG, "layout clock style mapping changed");
static_assert(UI_LAYOUT_MAX_WIDGETS_PER_PAGE >= UI_MAX_WIDGETS_PER_PAGE, "layout widget capacity changed");
static_assert(UI_LAYOUT_WEATHER_FOCUS_FORECAST_DAY_COUNT == WEATHER_FOCUS_FORECAST_DAY_COUNT, "weather focus forecast layout count changed");

static UiLayoutFontProfile currentLayoutFontProfile()
{
  switch (getUiFontProfile())
  {
  case UI_FONT_PROFILE_SERIF:
    return UI_LAYOUT_FONT_PROFILE_SERIF;
  case UI_FONT_PROFILE_MONO:
    return UI_LAYOUT_FONT_PROFILE_MONO;
  case UI_FONT_PROFILE_SYSTEM:
  default:
    return UI_LAYOUT_FONT_PROFILE_SYSTEM;
  }
}

static UiLayoutWidgetConfig toLayoutWidgetConfig(const UiWidgetConfig &widget)
{
  return {
      widget.type,
      widget.clockStyle,
      widget.showSeconds != 0,
      widget.showHistoryGraph != 0,
  };
}

static void applyWidgetLayout(WidgetRuntimeState &state, const UiWidgetLayout &layout)
{
  state.cardRect = toDisplayRect(layout.card);
  state.contentRect = toDisplayRect(layout.content);
  state.controlRect = toDisplayRect(layout.control);
  state.secondaryRect = toDisplayRect(layout.secondary);
  state.tertiaryRect = toDisplayRect(layout.tertiary);
  state.faceRect = toDisplayRect(layout.face);
  state.clockTimeRect = toDisplayRect(layout.clockTime);
  state.secondsRect = toDisplayRect(layout.seconds);

  for (int index = 0; index < 8; index++)
  {
    state.digitRects[index] = toDisplayRect(layout.digits[index]);
  }
  for (int index = 0; index < 3; index++)
  {
    state.actionRects[index] = toDisplayRect(layout.actions[index]);
  }
}

static void layoutWeatherFocusPage()
{
  UiWeatherFocusPageLayout layout = {};
  const UiPageChromeLayoutInput input = {
      display.width(),
      display.height(),
      showPageChrome(),
  };
  computeWeatherFocusPageLayout(input, layout);

  weatherFocusContentRect = toDisplayRect(layout.content);
  weatherFocusHeroRect = toDisplayRect(layout.hero);
  weatherFocusHeroIconRect = toDisplayRect(layout.heroIcon);
  weatherFocusStatsRect = toDisplayRect(layout.stats);
  weatherFocusTemperatureChartRect = toDisplayRect(layout.temperatureChart);
  weatherFocusRainChartRect = toDisplayRect(layout.rainChart);
  weatherFocusTimelineRect = toDisplayRect(layout.timeline);
  for (int index = 0; index < WEATHER_FOCUS_FORECAST_DAY_COUNT; index++)
  {
    weatherFocusForecastRects[index] = toDisplayRect(layout.forecast[index]);
  }

  navLeftRect = toDisplayRect(layout.navLeft);
  navRightRect = toDisplayRect(layout.navRight);
  debugIpRect = toDisplayRect(layout.debugIp);
}

static void layoutOverviewPage()
{
  const UiPageConfig &page = UI_PAGES[currentPageIndex];
  UiLayoutWidgetConfig layoutWidgets[UI_MAX_WIDGETS_PER_PAGE] = {};
  UiWidgetLayout widgetLayouts[UI_MAX_WIDGETS_PER_PAGE] = {};
  bool widgetVisible[UI_MAX_WIDGETS_PER_PAGE] = {};
  for (int widgetIndex = 0; widgetIndex < page.widgetCount; widgetIndex++)
  {
    layoutWidgets[widgetIndex] = toLayoutWidgetConfig(page.widgets[widgetIndex]);
    widgetVisible[widgetIndex] = widgetShouldBeVisible(currentPageIndex, widgetIndex);
  }

  UiOverviewPageLayout layout = {};
  layout.widgets = widgetLayouts;
  layout.widgetCapacity = UI_MAX_WIDGETS_PER_PAGE;
  const UiOverviewPageLayoutInput input = {
      display.width(),
      display.height(),
      showPageChrome(),
      currentLayoutFontProfile(),
      page.widgetCount,
      layoutWidgets,
      widgetVisible,
  };
  computeOverviewPageLayout(input, layout);

  for (int widgetIndex = 0; widgetIndex < page.widgetCount; widgetIndex++)
  {
    applyWidgetLayout(
        getWidgetState(currentPageIndex, widgetIndex),
        layout.widgets[widgetIndex]);
  }

  navLeftRect = toDisplayRect(layout.navLeft);
  navRightRect = toDisplayRect(layout.navRight);
  debugIpRect = toDisplayRect(layout.debugIp);
}

static void layoutMediaPlayerPage()
{
  UiMediaPlayerPageLayout layout = {};
  const UiPageChromeLayoutInput input = {
      display.width(),
      display.height(),
      showPageChrome(),
  };
  computeMediaPlayerPageLayout(input, layout);

  mediaPlayerContentRect = toDisplayRect(layout.content);
  mediaPlayerBodyRect = toDisplayRect(layout.body);
  mediaPlayerCoverRect = toDisplayRect(layout.cover);
  mediaPlayerProgressRect = toDisplayRect(layout.progress);
  mediaPlayerPrevButtonRect = toDisplayRect(layout.prevButton);
  mediaPlayerPlayPauseButtonRect = toDisplayRect(layout.playPauseButton);
  mediaPlayerNextButtonRect = toDisplayRect(layout.nextButton);

  navLeftRect = toDisplayRect(layout.navLeft);
  navRightRect = toDisplayRect(layout.navRight);
  debugIpRect = toDisplayRect(layout.debugIp);
}

static void layoutStandardPage()
{
  const UiPageConfig &page = UI_PAGES[currentPageIndex];
  UiLayoutWidgetConfig layoutWidgets[UI_MAX_WIDGETS_PER_PAGE] = {};
  UiWidgetLayout widgetLayouts[UI_MAX_WIDGETS_PER_PAGE] = {};
  bool widgetVisible[UI_MAX_WIDGETS_PER_PAGE] = {};
  for (int widgetIndex = 0; widgetIndex < page.widgetCount; widgetIndex++)
  {
    layoutWidgets[widgetIndex] = toLayoutWidgetConfig(page.widgets[widgetIndex]);
    widgetVisible[widgetIndex] = widgetShouldBeVisible(currentPageIndex, widgetIndex);
  }

  UiStandardPageLayout layout = {};
  layout.widgets = widgetLayouts;
  layout.widgetCapacity = UI_MAX_WIDGETS_PER_PAGE;
  const UiStandardPageLayoutInput input = {
      display.width(),
      display.height(),
      showPageChrome(),
      currentLayoutFontProfile(),
      page.widgetCount,
      layoutWidgets,
      widgetVisible,
  };
  computeStandardPageLayout(input, layout);

  for (int widgetIndex = 0; widgetIndex < page.widgetCount; widgetIndex++)
  {
    applyWidgetLayout(
        getWidgetState(currentPageIndex, widgetIndex),
        layout.widgets[widgetIndex]);
  }

  navLeftRect = toDisplayRect(layout.navLeft);
  navRightRect = toDisplayRect(layout.navRight);
  debugIpRect = toDisplayRect(layout.debugIp);
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

  layoutStandardPage();
}
