#include "ui_layout_helpers.h"

#include <string.h>

static constexpr int STANDARD_PAGE_MARGIN = 24;
static constexpr int STANDARD_PAGE_TOP_WITH_CHROME = 76;
static constexpr int STANDARD_PAGE_TOP_NO_CHROME = 28;
static constexpr int STANDARD_PAGE_FOOTER_WITH_CHROME_OFFSET = 78;
static constexpr int STANDARD_PAGE_FOOTER_NO_CHROME_OFFSET = 20;
static constexpr int STANDARD_PAGE_WIDGET_GAP = 16;
static constexpr int PAGE_NAV_Y_OFFSET = 67;
static constexpr int PAGE_NAV_SIZE = 48;
static constexpr int PAGE_NAV_LEFT_OFFSET = 1;
static constexpr int PAGE_NAV_RIGHT_OFFSET = 47;
static constexpr int STANDARD_CARD_HORIZONTAL_PADDING = 18;
static constexpr int STANDARD_CARD_DEFAULT_CONTENT_TOP = 52;
static constexpr int STANDARD_CARD_DEFAULT_CONTENT_BOTTOM_PADDING = 18;
static constexpr int STANDARD_CLOCK_CONTENT_TOP = 50;
static constexpr int STANDARD_CLOCK_CONTENT_BOTTOM_PADDING = 18;
static constexpr int STANDARD_ANALOG_CLOCK_INSET = 8;
static constexpr int STANDARD_PROGRESS_BAR_BOTTOM_OFFSET = 21;
static constexpr int STANDARD_PROGRESS_BAR_HEIGHT = 9;
static constexpr int STANDARD_SWITCH_WIDTH = 96;
static constexpr int STANDARD_SWITCH_HEIGHT = 36;
static constexpr int STANDARD_SWITCH_RIGHT_OFFSET = 130;
static constexpr int STANDARD_THERMOSTAT_VALUE_TOP_OFFSET = 46;
static constexpr int STANDARD_THERMOSTAT_CHEVRON_RIGHT_OFFSET = 44;
static constexpr int STANDARD_THERMOSTAT_CHEVRON_TOUCH_SIZE = 36;
static constexpr int STANDARD_THERMOSTAT_CHEVRON_TOUCH_INSET = 6;
static constexpr int STANDARD_THERMOSTAT_BUTTON_SIZE = 26;
static constexpr int STANDARD_THERMOSTAT_BUTTON_GAP = 8;
static constexpr int STANDARD_THERMOSTAT_HISTORY_BUTTON_TOP_OFFSET = 44;
static constexpr int STANDARD_THERMOSTAT_BUTTON_BOTTOM_OFFSET = 11;

static constexpr int OVERVIEW_PAGE_MARGIN = 24;
static constexpr int OVERVIEW_CONTENT_TOP = 18;
static constexpr int OVERVIEW_FOOTER_WITH_CHROME_OFFSET = 64;
static constexpr int OVERVIEW_FOOTER_NO_CHROME_OFFSET = 16;
static constexpr int OVERVIEW_STACK_TOP_OFFSET = 8;
static constexpr int OVERVIEW_BUTTON_SIZE = 84;
static constexpr int OVERVIEW_BUTTON_GAP_X = 22;
static constexpr int OVERVIEW_BUTTON_GAP_Y = 18;
static constexpr int OVERVIEW_BUTTON_BOTTOM_INSET = 22;
static constexpr int OVERVIEW_CONTENT_TO_BUTTON_GAP = 24;
static constexpr int OVERVIEW_STACK_BOTTOM_INSET = 8;
static constexpr int OVERVIEW_WEATHER_HEIGHT = 126;
static constexpr int OVERVIEW_PROGRESS_HEIGHT = 92;
static constexpr int OVERVIEW_TEXT_HEIGHT = 108;
static constexpr int OVERVIEW_CONTENT_MIN_HEIGHT = 80;
static constexpr int OVERVIEW_ANALOG_CLOCK_HEIGHT = 300;
static constexpr int OVERVIEW_DIGITAL_CLOCK_HEIGHT = 212;
static constexpr int OVERVIEW_ANALOG_CLOCK_MIN_HEIGHT = 216;
static constexpr int OVERVIEW_DIGITAL_CLOCK_MIN_HEIGHT = 164;
static constexpr int OVERVIEW_ANALOG_CLOCK_INSET = 2;
static constexpr int OVERVIEW_WEATHER_ICON_HEIGHT_OFFSET = 38;
static constexpr int OVERVIEW_WEATHER_ICON_MIN_SIZE = 54;
static constexpr int OVERVIEW_WEATHER_ICON_MAX_SIZE = 68;
static constexpr int OVERVIEW_WEATHER_ICON_RIGHT_OFFSET = 8;
static constexpr int OVERVIEW_WEATHER_HORIZONTAL_PADDING = 18;
static constexpr int OVERVIEW_WEATHER_CONTENT_TOP = 14;
static constexpr int OVERVIEW_WEATHER_ICON_GAP = 16;
static constexpr int OVERVIEW_PROGRESS_BAR_WIDTH_OFFSET = 88;
static constexpr int OVERVIEW_PROGRESS_BAR_MIN_WIDTH = 120;
static constexpr int OVERVIEW_PROGRESS_BAR_BOTTOM_OFFSET = 20;
static constexpr int OVERVIEW_PROGRESS_BAR_HEIGHT = 10;

static constexpr int WEATHER_FOCUS_MARGIN = 22;
static constexpr int WEATHER_FOCUS_TOP_WITH_CHROME = 24;
static constexpr int WEATHER_FOCUS_TOP_NO_CHROME = 20;
static constexpr int WEATHER_FOCUS_FOOTER_WITH_CHROME_OFFSET = 78;
static constexpr int WEATHER_FOCUS_FOOTER_NO_CHROME_OFFSET = 16;
static constexpr int WEATHER_FOCUS_HERO_TOP_OFFSET = 8;
static constexpr int WEATHER_FOCUS_HERO_HEIGHT = 300;
static constexpr int WEATHER_FOCUS_HERO_ICON_X_OFFSET = 12;
static constexpr int WEATHER_FOCUS_HERO_ICON_Y_OFFSET = 36;
static constexpr int WEATHER_FOCUS_HERO_ICON_SIZE = 236;
static constexpr int WEATHER_FOCUS_STATS_GAP = 14;
static constexpr int WEATHER_FOCUS_STATS_HEIGHT = 68;
static constexpr int WEATHER_FOCUS_CHART_GAP = 12;
static constexpr int WEATHER_FOCUS_HOURLY_CHART_HEIGHT = 190;
static constexpr int WEATHER_FOCUS_FORECAST_GAP = 12;
static constexpr int WEATHER_FOCUS_TIMELINE_BOTTOM_INSET = 8;

static constexpr int MEDIA_PLAYER_MARGIN = 24;
static constexpr int MEDIA_PLAYER_TOP_WITH_CHROME = 24;
static constexpr int MEDIA_PLAYER_TOP_NO_CHROME = 20;
static constexpr int MEDIA_PLAYER_FOOTER_WITH_CHROME_OFFSET = 78;
static constexpr int MEDIA_PLAYER_FOOTER_NO_CHROME_OFFSET = 16;
static constexpr int MEDIA_PLAYER_BODY_WIDTH = 420;
static constexpr int MEDIA_PLAYER_BODY_HEIGHT = 560;
static constexpr int MEDIA_PLAYER_COVER_SIZE = 384;
static constexpr int MEDIA_PLAYER_COVER_TOP_OFFSET = 8;
static constexpr int MEDIA_PLAYER_PROGRESS_X_OFFSET = 14;
static constexpr int MEDIA_PLAYER_PROGRESS_TOP_OFFSET = 492;
static constexpr int MEDIA_PLAYER_PROGRESS_HEIGHT = 12;
static constexpr int MEDIA_PLAYER_CONTROL_GAP = 14;
static constexpr int MEDIA_PLAYER_CONTROL_WIDTH = 48;
static constexpr int MEDIA_PLAYER_CONTROL_HEIGHT = 48;
static constexpr int MEDIA_PLAYER_CONTROLS_TOP_OFFSET = 512;

static int layoutClampInt(int value, int minValue, int maxValue)
{
  if (value < minValue)
  {
    return minValue;
  }
  if (value > maxValue)
  {
    return maxValue;
  }
  return value;
}

static int layoutMinInt(int left, int right)
{
  return left < right ? left : right;
}

static bool layoutClockWidgetIsAnalog(const UiLayoutWidgetConfig &widget)
{
  return widget.clockStyle == UI_LAYOUT_CLOCK_ANALOG;
}

static bool layoutClockWidgetShowsSeconds(const UiLayoutWidgetConfig &widget)
{
  return widget.showSeconds;
}

static bool layoutThermostatShowsHistoryGraph(const UiLayoutWidgetConfig &widget)
{
  return widget.type == UI_LAYOUT_WIDGET_THERMOSTAT && widget.showHistoryGraph;
}

static bool layoutWidgetVisible(const bool *visibleFlags, int widgetIndex)
{
  return visibleFlags == nullptr || visibleFlags[widgetIndex];
}

static int cappedWidgetCount(uint8_t widgetCount, uint8_t widgetCapacity)
{
  const int cappedByOutput =
      widgetCount < widgetCapacity
          ? widgetCount
          : widgetCapacity;
  return cappedByOutput < UI_LAYOUT_MAX_WIDGETS_PER_PAGE
             ? cappedByOutput
             : UI_LAYOUT_MAX_WIDGETS_PER_PAGE;
}

static UiLayoutRect layoutNavLeftRect(bool showChrome, int displayHeight, int margin)
{
  return showChrome
             ? UiLayoutRect{
                   margin - PAGE_NAV_LEFT_OFFSET,
                   displayHeight - PAGE_NAV_Y_OFFSET,
                   PAGE_NAV_SIZE,
                   PAGE_NAV_SIZE}
             : UiLayoutRect{0, 0, 0, 0};
}

static UiLayoutRect layoutNavRightRect(
    bool showChrome,
    int displayWidth,
    int displayHeight,
    int margin)
{
  return showChrome
             ? UiLayoutRect{
                   displayWidth - margin - PAGE_NAV_RIGHT_OFFSET,
                   displayHeight - PAGE_NAV_Y_OFFSET,
                   PAGE_NAV_SIZE,
                   PAGE_NAV_SIZE}
             : UiLayoutRect{0, 0, 0, 0};
}

static int standardWidgetWeight(const UiLayoutWidgetConfig &widget)
{
  if (layoutThermostatShowsHistoryGraph(widget))
  {
    return 14;
  }

  switch (widget.type)
  {
  case UI_LAYOUT_WIDGET_CLOCK:
    return 18;
  case UI_LAYOUT_WIDGET_WEATHER:
    return 11;
  case UI_LAYOUT_WIDGET_PROGRESS:
    return 6;
  case UI_LAYOUT_WIDGET_SWITCH:
  case UI_LAYOUT_WIDGET_BUTTON:
    return 5;
  case UI_LAYOUT_WIDGET_SLIDER:
    return 10;
  case UI_LAYOUT_WIDGET_THERMOSTAT:
    return 9;
  case UI_LAYOUT_WIDGET_TEXT:
    return 8;
  case UI_LAYOUT_WIDGET_TITLE:
    return 3;
  default:
    return 8;
  }
}

static int standardWidgetMinHeight(const UiLayoutWidgetConfig &widget)
{
  switch (widget.type)
  {
  case UI_LAYOUT_WIDGET_PROGRESS:
    return 52;
  case UI_LAYOUT_WIDGET_SWITCH:
  case UI_LAYOUT_WIDGET_BUTTON:
    return 56;
  case UI_LAYOUT_WIDGET_TITLE:
    return 34;
  case UI_LAYOUT_WIDGET_TEXT:
    return 148;
  case UI_LAYOUT_WIDGET_THERMOSTAT:
    return layoutThermostatShowsHistoryGraph(widget) ? 182 : 100;
  default:
    return 88;
  }
}

static int standardWidgetMaxHeight(const UiLayoutWidgetConfig &widget)
{
  switch (widget.type)
  {
  case UI_LAYOUT_WIDGET_PROGRESS:
    return 84;
  case UI_LAYOUT_WIDGET_SWITCH:
  case UI_LAYOUT_WIDGET_BUTTON:
    return 92;
  case UI_LAYOUT_WIDGET_TITLE:
    return 54;
  case UI_LAYOUT_WIDGET_TEXT:
    return 244;
  case UI_LAYOUT_WIDGET_THERMOSTAT:
    return layoutThermostatShowsHistoryGraph(widget) ? 224 : 132;
  default:
    return 340;
  }
}

static UiLayoutRect paddedRect(
    const UiLayoutRect &rect,
    int left,
    int top,
    int right,
    int bottom)
{
  return {
      rect.x + left,
      rect.y + top,
      rect.w - left - right,
      rect.h - top - bottom,
  };
}

static void clampRectToBounds(UiLayoutRect &rect, const UiLayoutRect &bounds)
{
  if (rect.x < bounds.x)
  {
    rect.x = bounds.x;
  }
  if (rect.y < bounds.y)
  {
    rect.y = bounds.y;
  }

  const int maxRight = bounds.x + bounds.w;
  const int maxBottom = bounds.y + bounds.h;
  if (rect.x + rect.w > maxRight)
  {
    rect.w = maxRight - rect.x;
  }
  if (rect.y + rect.h > maxBottom)
  {
    rect.h = maxBottom - rect.y;
  }
}

static void inflateRect(UiLayoutRect &rect, int amount)
{
  rect.x -= amount;
  rect.y -= amount;
  rect.w += amount * 2;
  rect.h += amount * 2;
}

static void computeClockLayout(
    const UiLayoutWidgetConfig &widget,
    UiLayoutFontProfile fontProfile,
    int analogInset,
    UiWidgetLayout &layout)
{
  memset(layout.digits, 0, sizeof(layout.digits));
  layout.clockTime = {0, 0, 0, 0};
  layout.seconds = {0, 0, 0, 0};
  layout.face = {0, 0, 0, 0};

  if (layoutClockWidgetIsAnalog(widget))
  {
    const int faceSize = layoutMinInt(layout.content.w, layout.content.h);
    layout.face = {
        layout.content.x + ((layout.content.w - faceSize) / 2) + analogInset,
        layout.content.y + ((layout.content.h - faceSize) / 2) + analogInset,
        faceSize - (analogInset * 2),
        faceSize - (analogInset * 2),
    };
    return;
  }

  const bool showSeconds = layoutClockWidgetShowsSeconds(widget);
  const int totalChars = showSeconds ? 8 : 5;
  const int colonCount = showSeconds ? 2 : 1;
  const int digitCount = showSeconds ? 6 : 4;
  const int gap = fontProfile == UI_LAYOUT_FONT_PROFILE_MONO ? 10 : 8;
  const int colonW = fontProfile == UI_LAYOUT_FONT_PROFILE_SERIF ? 18 : 16;
  int digitW = (layout.content.w - (colonCount * colonW) - ((totalChars - 1) * gap)) / digitCount;
  digitW = layoutClampInt(digitW, 28, 58);
  int digitH = layout.content.h - 10;
  digitH = layoutClampInt(digitH, 68, 150);

  const int totalWidth = (digitCount * digitW) + (colonCount * colonW) + ((totalChars - 1) * gap);
  int x = layout.content.x + ((layout.content.w - totalWidth) / 2);
  const int y = layout.content.y + ((layout.content.h - digitH) / 2);

  for (int i = 0; i < totalChars; i++)
  {
    const bool isColon = i == 2 || (showSeconds && i == 5);
    const int symbolW = isColon ? colonW : digitW;
    layout.digits[i] = {x, y, symbolW, digitH};
    x += symbolW + gap;
  }

  layout.clockTime = layout.digits[0];
  const int timeRight = layout.digits[totalChars - 1].x + layout.digits[totalChars - 1].w;
  layout.clockTime.w = timeRight - layout.clockTime.x;
  inflateRect(layout.clockTime, 2);
  clampRectToBounds(layout.clockTime, layout.content);

  if (showSeconds)
  {
    layout.seconds = layout.digits[6];
    const int right = layout.digits[7].x + layout.digits[7].w;
    layout.seconds.w = right - layout.seconds.x;
    inflateRect(layout.seconds, 2);
    clampRectToBounds(layout.seconds, layout.content);
  }
}

static void computeStandardWidgetLayout(
    const UiLayoutWidgetConfig &widget,
    int x,
    int y,
    int width,
    int height,
    UiLayoutFontProfile fontProfile,
    UiWidgetLayout &layout)
{
  layout.card = {x, y, width, height};
  layout.content = paddedRect(
      layout.card,
      STANDARD_CARD_HORIZONTAL_PADDING,
      STANDARD_CARD_DEFAULT_CONTENT_TOP,
      STANDARD_CARD_HORIZONTAL_PADDING,
      STANDARD_CARD_DEFAULT_CONTENT_BOTTOM_PADDING);

  if (widget.type == UI_LAYOUT_WIDGET_CLOCK)
  {
    layout.content = paddedRect(
        layout.card,
        STANDARD_CARD_HORIZONTAL_PADDING,
        STANDARD_CLOCK_CONTENT_TOP,
        STANDARD_CARD_HORIZONTAL_PADDING,
        STANDARD_CLOCK_CONTENT_BOTTOM_PADDING);
    computeClockLayout(widget, fontProfile, STANDARD_ANALOG_CLOCK_INSET, layout);
  }
  else if (widget.type == UI_LAYOUT_WIDGET_WEATHER)
  {
    const int iconSize = layoutClampInt(layout.card.h - 18, 112, 128);
    layout.secondary = {
        layout.card.x + layout.card.w - iconSize - 14,
        layout.card.y + 9,
        iconSize,
        iconSize,
    };
  }
  else if (widget.type == UI_LAYOUT_WIDGET_PROGRESS || widget.type == UI_LAYOUT_WIDGET_SLIDER)
  {
    if (widget.type == UI_LAYOUT_WIDGET_SLIDER)
    {
      const int sliderHeight = layoutClampInt(layout.card.h - 42, 42, 52);
      layout.control = {
          layout.card.x + STANDARD_CARD_HORIZONTAL_PADDING,
          layout.card.y + layout.card.h - sliderHeight - 14,
          layout.card.w - (STANDARD_CARD_HORIZONTAL_PADDING * 2),
          sliderHeight,
      };
      layout.secondary = {
          layout.control.x,
          layout.control.y,
          sliderHeight,
          sliderHeight,
      };
    }
    else
    {
      layout.control = {
          layout.card.x + STANDARD_CARD_HORIZONTAL_PADDING,
          layout.card.y + layout.card.h - STANDARD_PROGRESS_BAR_BOTTOM_OFFSET,
          layout.card.w - (STANDARD_CARD_HORIZONTAL_PADDING * 2),
          STANDARD_PROGRESS_BAR_HEIGHT,
      };
    }
  }
  else if (widget.type == UI_LAYOUT_WIDGET_SWITCH || widget.type == UI_LAYOUT_WIDGET_BUTTON)
  {
    layout.control = {
        layout.card.x + layout.card.w - STANDARD_SWITCH_RIGHT_OFFSET,
        layout.card.y + (layout.card.h / 2) - (STANDARD_SWITCH_HEIGHT / 2),
        STANDARD_SWITCH_WIDTH,
        STANDARD_SWITCH_HEIGHT,
    };
  }
  else if (widget.type == UI_LAYOUT_WIDGET_THERMOSTAT)
  {
    const bool showHistoryGraph = layoutThermostatShowsHistoryGraph(widget);
    const int valueTop = layout.card.y + STANDARD_THERMOSTAT_VALUE_TOP_OFFSET;
    const int chevronX = layout.card.x + layout.card.w - STANDARD_THERMOSTAT_CHEVRON_RIGHT_OFFSET;
    const int buttonY = showHistoryGraph
                            ? layout.card.y + STANDARD_THERMOSTAT_HISTORY_BUTTON_TOP_OFFSET
                            : layout.card.y + layout.card.h - STANDARD_THERMOSTAT_BUTTON_SIZE - STANDARD_THERMOSTAT_BUTTON_BOTTOM_OFFSET;

    layout.tertiary = {chevronX - 108, valueTop + 14, 92, 24};
    layout.control = {
        chevronX - STANDARD_THERMOSTAT_CHEVRON_TOUCH_INSET,
        valueTop - 8,
        STANDARD_THERMOSTAT_CHEVRON_TOUCH_SIZE,
        STANDARD_THERMOSTAT_CHEVRON_TOUCH_SIZE,
    };
    layout.secondary = {
        chevronX - STANDARD_THERMOSTAT_CHEVRON_TOUCH_INSET,
        valueTop + 28,
        STANDARD_THERMOSTAT_CHEVRON_TOUCH_SIZE,
        STANDARD_THERMOSTAT_CHEVRON_TOUCH_SIZE,
    };
    layout.actions[0] = {
        layout.card.x + STANDARD_CARD_HORIZONTAL_PADDING,
        buttonY,
        STANDARD_THERMOSTAT_BUTTON_SIZE,
        STANDARD_THERMOSTAT_BUTTON_SIZE,
    };
    layout.actions[1] = {
        layout.card.x + STANDARD_CARD_HORIZONTAL_PADDING + STANDARD_THERMOSTAT_BUTTON_SIZE + STANDARD_THERMOSTAT_BUTTON_GAP,
        buttonY,
        STANDARD_THERMOSTAT_BUTTON_SIZE,
        STANDARD_THERMOSTAT_BUTTON_SIZE,
    };
    layout.actions[2] = {
        layout.card.x + STANDARD_CARD_HORIZONTAL_PADDING + ((STANDARD_THERMOSTAT_BUTTON_SIZE + STANDARD_THERMOSTAT_BUTTON_GAP) * 2),
        buttonY,
        STANDARD_THERMOSTAT_BUTTON_SIZE,
        STANDARD_THERMOSTAT_BUTTON_SIZE,
    };
  }
}

void computeStandardPageLayout(
    const UiStandardPageLayoutInput &input,
    UiStandardPageLayout &layoutOut)
{
  if (layoutOut.widgets != nullptr && layoutOut.widgetCapacity > 0)
  {
    memset(layoutOut.widgets, 0, sizeof(UiWidgetLayout) * layoutOut.widgetCapacity);
  }
  layoutOut.navLeft = {0, 0, 0, 0};
  layoutOut.navRight = {0, 0, 0, 0};
  layoutOut.debugIp = {0, 0, 0, 0};

  if (input.widgets == nullptr || layoutOut.widgets == nullptr)
  {
    return;
  }

  const int widgetCount = cappedWidgetCount(input.widgetCount, layoutOut.widgetCapacity);
  const int topY = input.showChrome ? STANDARD_PAGE_TOP_WITH_CHROME : STANDARD_PAGE_TOP_NO_CHROME;
  const int footerTop =
      input.showChrome
          ? (input.displayHeight - STANDARD_PAGE_FOOTER_WITH_CHROME_OFFSET)
          : (input.displayHeight - STANDARD_PAGE_FOOTER_NO_CHROME_OFFSET);
  const int availableHeight =
      footerTop -
      topY -
      (widgetCount > 0 ? (widgetCount - 1) * STANDARD_PAGE_WIDGET_GAP : 0);

  int totalWeight = 0;
  int visibleWidgetCount = 0;
  for (int widgetIndex = 0; widgetIndex < widgetCount; widgetIndex++)
  {
    if (layoutWidgetVisible(input.widgetVisible, widgetIndex))
    {
      totalWeight += standardWidgetWeight(input.widgets[widgetIndex]);
      visibleWidgetCount++;
    }
  }
  if (totalWeight <= 0)
  {
    totalWeight = 1;
  }

  int currentY = topY;
  int remainingHeight = availableHeight;
  int remainingWeight = totalWeight;
  int visibleWidgetIndex = 0;

  for (int widgetIndex = 0; widgetIndex < widgetCount; widgetIndex++)
  {
    if (!layoutWidgetVisible(input.widgetVisible, widgetIndex))
    {
      continue;
    }

    const UiLayoutWidgetConfig &widget = input.widgets[widgetIndex];
    const int weight = standardWidgetWeight(widget);
    int cardHeight =
        (visibleWidgetIndex == visibleWidgetCount - 1)
            ? remainingHeight
            : (remainingHeight * weight) / remainingWeight;
    cardHeight = layoutClampInt(
        cardHeight,
        standardWidgetMinHeight(widget),
        standardWidgetMaxHeight(widget));

    computeStandardWidgetLayout(
        widget,
        STANDARD_PAGE_MARGIN,
        currentY,
        input.displayWidth - (STANDARD_PAGE_MARGIN * 2),
        cardHeight,
        input.fontProfile,
        layoutOut.widgets[widgetIndex]);

    currentY += cardHeight + STANDARD_PAGE_WIDGET_GAP;
    remainingHeight -= cardHeight;
    remainingWeight -= weight;
    visibleWidgetIndex++;
  }

  layoutOut.navLeft = layoutNavLeftRect(input.showChrome, input.displayHeight, STANDARD_PAGE_MARGIN);
  layoutOut.navRight = layoutNavRightRect(
      input.showChrome,
      input.displayWidth,
      input.displayHeight,
      STANDARD_PAGE_MARGIN);
  layoutOut.debugIp = {0, 0, 0, 0};
}

static bool overviewWidgetIsStackItem(const UiLayoutWidgetConfig &widget)
{
  return widget.type == UI_LAYOUT_WIDGET_CLOCK ||
         widget.type == UI_LAYOUT_WIDGET_TEXT ||
         widget.type == UI_LAYOUT_WIDGET_WEATHER ||
         widget.type == UI_LAYOUT_WIDGET_PROGRESS;
}

static int overviewContentWidgetHeight(const UiLayoutWidgetConfig &widget)
{
  switch (widget.type)
  {
  case UI_LAYOUT_WIDGET_WEATHER:
    return OVERVIEW_WEATHER_HEIGHT;
  case UI_LAYOUT_WIDGET_PROGRESS:
    return OVERVIEW_PROGRESS_HEIGHT;
  case UI_LAYOUT_WIDGET_TEXT:
    return OVERVIEW_TEXT_HEIGHT;
  default:
    return 0;
  }
}

static int overviewMinimumContentWidgetHeight(const UiLayoutWidgetConfig &widget)
{
  switch (widget.type)
  {
  case UI_LAYOUT_WIDGET_WEATHER:
    return OVERVIEW_WEATHER_HEIGHT;
  case UI_LAYOUT_WIDGET_PROGRESS:
  case UI_LAYOUT_WIDGET_TEXT:
    return OVERVIEW_CONTENT_MIN_HEIGHT;
  default:
    return 0;
  }
}

static int overviewPreferredClockHeight(const UiLayoutWidgetConfig &widget)
{
  return layoutClockWidgetIsAnalog(widget)
             ? OVERVIEW_ANALOG_CLOCK_HEIGHT
             : OVERVIEW_DIGITAL_CLOCK_HEIGHT;
}

static int overviewMinimumClockHeight(const UiLayoutWidgetConfig &widget)
{
  return layoutClockWidgetIsAnalog(widget)
             ? OVERVIEW_ANALOG_CLOCK_MIN_HEIGHT
             : OVERVIEW_DIGITAL_CLOCK_MIN_HEIGHT;
}

static int overviewPreferredStackWidgetHeight(const UiLayoutWidgetConfig &widget)
{
  return widget.type == UI_LAYOUT_WIDGET_CLOCK
             ? overviewPreferredClockHeight(widget)
             : overviewContentWidgetHeight(widget);
}

static int overviewMinimumStackWidgetHeight(const UiLayoutWidgetConfig &widget)
{
  return widget.type == UI_LAYOUT_WIDGET_CLOCK
             ? overviewMinimumClockHeight(widget)
             : overviewMinimumContentWidgetHeight(widget);
}

static void computeOverviewContentWidgetLayout(
    const UiLayoutWidgetConfig &widget,
    int x,
    int y,
    int width,
    int height,
    UiWidgetLayout &layout)
{
  layout.card = {x, y, width, height};
  layout.content = layout.card;

  if (widget.type == UI_LAYOUT_WIDGET_WEATHER)
  {
    const int iconSize = layoutClampInt(
        height - OVERVIEW_WEATHER_ICON_HEIGHT_OFFSET,
        OVERVIEW_WEATHER_ICON_MIN_SIZE,
        OVERVIEW_WEATHER_ICON_MAX_SIZE);
    layout.secondary = {
        layout.card.x + layout.card.w - iconSize - OVERVIEW_WEATHER_ICON_RIGHT_OFFSET,
        layout.card.y + ((layout.card.h - iconSize) / 2),
        iconSize,
        iconSize,
    };
    const int contentX = layout.card.x + OVERVIEW_WEATHER_HORIZONTAL_PADDING;
    const int contentRight = layout.secondary.x - OVERVIEW_WEATHER_ICON_GAP;
    layout.content = {
        contentX,
        layout.card.y + OVERVIEW_WEATHER_CONTENT_TOP,
        contentRight - contentX,
        layout.card.h - (OVERVIEW_WEATHER_CONTENT_TOP * 2),
    };
    if (layout.content.w < 0)
    {
      layout.content.w = 0;
    }
  }
  else if (widget.type == UI_LAYOUT_WIDGET_PROGRESS)
  {
    const int barWidth = width - OVERVIEW_PROGRESS_BAR_WIDTH_OFFSET;
    const int clampedBarWidth =
        barWidth > OVERVIEW_PROGRESS_BAR_MIN_WIDTH
            ? barWidth
            : OVERVIEW_PROGRESS_BAR_MIN_WIDTH;
    layout.control = {
        x + ((width - clampedBarWidth) / 2),
        y + height - OVERVIEW_PROGRESS_BAR_BOTTOM_OFFSET,
        clampedBarWidth,
        OVERVIEW_PROGRESS_BAR_HEIGHT,
    };
  }
}

static void computeOverviewStackWidgetLayout(
    const UiLayoutWidgetConfig &widget,
    int x,
    int y,
    int width,
    int height,
    UiLayoutFontProfile fontProfile,
    UiWidgetLayout &layout)
{
  if (widget.type == UI_LAYOUT_WIDGET_CLOCK)
  {
    layout.card = {x, y, width, height};
    layout.content = layout.card;
    computeClockLayout(widget, fontProfile, OVERVIEW_ANALOG_CLOCK_INSET, layout);
    return;
  }

  computeOverviewContentWidgetLayout(widget, x, y, width, height, layout);
}

static void computeOverviewButtonRows(
    int buttonWidgetCount,
    int buttonRowItemCounts[3],
    int &buttonRows)
{
  static const uint8_t ROW_ITEM_COUNTS[UI_LAYOUT_OVERVIEW_MAX_BUTTONS + 1][3] = {
      {0, 0, 0},
      {1, 0, 0},
      {2, 0, 0},
      {3, 0, 0},
      {2, 2, 0},
      {3, 2, 0},
      {3, 3, 0},
  };

  const int cappedButtonCount =
      buttonWidgetCount > UI_LAYOUT_OVERVIEW_MAX_BUTTONS
          ? UI_LAYOUT_OVERVIEW_MAX_BUTTONS
          : buttonWidgetCount;
  buttonRows = cappedButtonCount >= 4 ? 2 : (cappedButtonCount > 0 ? 1 : 0);
  for (int index = 0; index < 3; index++)
  {
    buttonRowItemCounts[index] = ROW_ITEM_COUNTS[cappedButtonCount][index];
  }
}

void computeOverviewPageLayout(
    const UiOverviewPageLayoutInput &input,
    UiOverviewPageLayout &layoutOut)
{
  if (layoutOut.widgets != nullptr && layoutOut.widgetCapacity > 0)
  {
    memset(layoutOut.widgets, 0, sizeof(UiWidgetLayout) * layoutOut.widgetCapacity);
  }
  layoutOut.navLeft = {0, 0, 0, 0};
  layoutOut.navRight = {0, 0, 0, 0};
  layoutOut.debugIp = {0, 0, 0, 0};

  if (input.widgets == nullptr || layoutOut.widgets == nullptr)
  {
    return;
  }

  const int widgetCount = cappedWidgetCount(input.widgetCount, layoutOut.widgetCapacity);
  int stackWidgetIndices[UI_LAYOUT_MAX_WIDGETS_PER_PAGE] = {};
  int stackWidgetCount = 0;
  int buttonWidgetIndices[UI_LAYOUT_OVERVIEW_MAX_BUTTONS] = {};
  int buttonWidgetCount = 0;

  for (int widgetIndex = 0; widgetIndex < widgetCount; widgetIndex++)
  {
    const UiLayoutWidgetConfig &widget = input.widgets[widgetIndex];
    if (widget.type == UI_LAYOUT_WIDGET_BUTTON &&
        buttonWidgetCount < UI_LAYOUT_OVERVIEW_MAX_BUTTONS)
    {
      buttonWidgetIndices[buttonWidgetCount++] = widgetIndex;
    }
    else if (
        overviewWidgetIsStackItem(widget) &&
        layoutWidgetVisible(input.widgetVisible, widgetIndex) &&
        stackWidgetCount < UI_LAYOUT_MAX_WIDGETS_PER_PAGE)
    {
      stackWidgetIndices[stackWidgetCount++] = widgetIndex;
    }
  }

  int buttonRowItemCounts[3] = {0, 0, 0};
  int buttonRows = 0;
  computeOverviewButtonRows(buttonWidgetCount, buttonRowItemCounts, buttonRows);

  const int footerTop =
      input.showChrome
          ? (input.displayHeight - OVERVIEW_FOOTER_WITH_CHROME_OFFSET)
          : (input.displayHeight - OVERVIEW_FOOTER_NO_CHROME_OFFSET);
  const int stackTop = OVERVIEW_CONTENT_TOP + OVERVIEW_STACK_TOP_OFFSET;
  const int buttonGridHeight =
      buttonRows > 0
          ? (buttonRows * OVERVIEW_BUTTON_SIZE) + ((buttonRows - 1) * OVERVIEW_BUTTON_GAP_Y)
          : 0;
  const int buttonBlockTop =
      buttonRows > 0
          ? footerTop - buttonGridHeight - OVERVIEW_BUTTON_BOTTOM_INSET
          : footerTop;
  const int stackBottom =
      buttonRows > 0
          ? buttonBlockTop - OVERVIEW_CONTENT_TO_BUTTON_GAP
          : footerTop - OVERVIEW_STACK_BOTTOM_INSET;
  const int stackAreaHeight = stackBottom > stackTop ? stackBottom - stackTop : 0;

  int widgetHeights[UI_LAYOUT_MAX_WIDGETS_PER_PAGE] = {};
  int totalStackHeight = 0;
  for (int index = 0; index < stackWidgetCount; index++)
  {
    const UiLayoutWidgetConfig &widget = input.widgets[stackWidgetIndices[index]];
    widgetHeights[index] = overviewPreferredStackWidgetHeight(widget);
    totalStackHeight += widgetHeights[index];
  }

  if (stackAreaHeight > 0 && totalStackHeight > stackAreaHeight)
  {
    int overflow = totalStackHeight - stackAreaHeight;
    for (int pass = 0; pass < 2 && overflow > 0; pass++)
    {
      for (int index = 0; index < stackWidgetCount && overflow > 0; index++)
      {
        const UiLayoutWidgetConfig &widget = input.widgets[stackWidgetIndices[index]];
        const bool isClock = widget.type == UI_LAYOUT_WIDGET_CLOCK;
        if ((pass == 0 && isClock) || (pass == 1 && !isClock))
        {
          continue;
        }

        const int minimumHeight = overviewMinimumStackWidgetHeight(widget);
        const int reducibleHeight = widgetHeights[index] - minimumHeight;
        if (reducibleHeight <= 0)
        {
          continue;
        }
        const int reduction = reducibleHeight < overflow ? reducibleHeight : overflow;
        widgetHeights[index] -= reduction;
        totalStackHeight -= reduction;
        overflow -= reduction;
      }
    }
  }

  if (stackWidgetCount > 0 && stackAreaHeight > 0)
  {
    const int gapCount = stackWidgetCount + 1;
    const int totalGapSpace = totalStackHeight < stackAreaHeight ? stackAreaHeight - totalStackHeight : 0;
    const int equalGap = gapCount > 0 ? totalGapSpace / gapCount : 0;
    int currentY = stackTop + equalGap + ((totalGapSpace - (equalGap * gapCount)) / 2);

    for (int index = 0; index < stackWidgetCount; index++)
    {
      if (widgetHeights[index] <= 0)
      {
        continue;
      }
      const int widgetIndex = stackWidgetIndices[index];
      computeOverviewStackWidgetLayout(
          input.widgets[widgetIndex],
          OVERVIEW_PAGE_MARGIN,
          currentY,
          input.displayWidth - (OVERVIEW_PAGE_MARGIN * 2),
          widgetHeights[index],
          input.fontProfile,
          layoutOut.widgets[widgetIndex]);
      currentY += widgetHeights[index] + equalGap;
    }
  }

  if (buttonRows > 0)
  {
    int buttonIndex = 0;
    for (int row = 0; row < buttonRows; row++)
    {
      const int itemsInRow = buttonRowItemCounts[row];
      const int rowWidth =
          (itemsInRow * OVERVIEW_BUTTON_SIZE) +
          ((itemsInRow - 1) * OVERVIEW_BUTTON_GAP_X);
      const int startX = (input.displayWidth - rowWidth) / 2;
      const int y = buttonBlockTop + (row * (OVERVIEW_BUTTON_SIZE + OVERVIEW_BUTTON_GAP_Y));

      for (int col = 0; col < itemsInRow && buttonIndex < buttonWidgetCount; col++, buttonIndex++)
      {
        const int widgetIndex = buttonWidgetIndices[buttonIndex];
        const int x = startX + (col * (OVERVIEW_BUTTON_SIZE + OVERVIEW_BUTTON_GAP_X));
        layoutOut.widgets[widgetIndex].card = {x, y, OVERVIEW_BUTTON_SIZE, OVERVIEW_BUTTON_SIZE};
        layoutOut.widgets[widgetIndex].content = layoutOut.widgets[widgetIndex].card;
        layoutOut.widgets[widgetIndex].control = layoutOut.widgets[widgetIndex].card;
      }
    }
  }

  layoutOut.navLeft = layoutNavLeftRect(input.showChrome, input.displayHeight, OVERVIEW_PAGE_MARGIN);
  layoutOut.navRight = layoutNavRightRect(
      input.showChrome,
      input.displayWidth,
      input.displayHeight,
      OVERVIEW_PAGE_MARGIN);
  layoutOut.debugIp = {0, 0, 0, 0};
}

void computeWeatherFocusPageLayout(
    const UiPageChromeLayoutInput &input,
    UiWeatherFocusPageLayout &layoutOut)
{
  memset(&layoutOut, 0, sizeof(layoutOut));

  const int contentTop =
      input.showChrome
          ? WEATHER_FOCUS_TOP_WITH_CHROME
          : WEATHER_FOCUS_TOP_NO_CHROME;
  const int footerTop =
      input.showChrome
          ? (input.displayHeight - WEATHER_FOCUS_FOOTER_WITH_CHROME_OFFSET)
          : (input.displayHeight - WEATHER_FOCUS_FOOTER_NO_CHROME_OFFSET);
  const int contentHeight = footerTop - contentTop;

  layoutOut.content = {0, contentTop, input.displayWidth, contentHeight};
  layoutOut.hero = {
      WEATHER_FOCUS_MARGIN,
      contentTop + WEATHER_FOCUS_HERO_TOP_OFFSET,
      input.displayWidth - (WEATHER_FOCUS_MARGIN * 2),
      WEATHER_FOCUS_HERO_HEIGHT,
  };
  layoutOut.heroIcon = {
      layoutOut.hero.x + WEATHER_FOCUS_HERO_ICON_X_OFFSET,
      layoutOut.hero.y + WEATHER_FOCUS_HERO_ICON_Y_OFFSET,
      WEATHER_FOCUS_HERO_ICON_SIZE,
      WEATHER_FOCUS_HERO_ICON_SIZE,
  };
  layoutOut.stats = {
      WEATHER_FOCUS_MARGIN,
      layoutOut.hero.y + layoutOut.hero.h + WEATHER_FOCUS_STATS_GAP,
      input.displayWidth - (WEATHER_FOCUS_MARGIN * 2),
      WEATHER_FOCUS_STATS_HEIGHT,
  };
  layoutOut.temperatureChart = {
      WEATHER_FOCUS_MARGIN,
      layoutOut.stats.y + layoutOut.stats.h + WEATHER_FOCUS_CHART_GAP,
      input.displayWidth - (WEATHER_FOCUS_MARGIN * 2),
      WEATHER_FOCUS_HOURLY_CHART_HEIGHT,
  };
  layoutOut.rainChart = {0, 0, 0, 0};
  layoutOut.timeline = {
      WEATHER_FOCUS_MARGIN,
      layoutOut.temperatureChart.y + layoutOut.temperatureChart.h + WEATHER_FOCUS_FORECAST_GAP,
      input.displayWidth - (WEATHER_FOCUS_MARGIN * 2),
      footerTop -
          (layoutOut.temperatureChart.y + layoutOut.temperatureChart.h + WEATHER_FOCUS_FORECAST_GAP) -
          WEATHER_FOCUS_TIMELINE_BOTTOM_INSET,
  };

  const int cardWidth =
      layoutOut.timeline.w / UI_LAYOUT_WEATHER_FOCUS_FORECAST_DAY_COUNT;
  for (int index = 0; index < UI_LAYOUT_WEATHER_FOCUS_FORECAST_DAY_COUNT; index++)
  {
    const int cardX = layoutOut.timeline.x + (cardWidth * index);
    const int nextX =
        index == (UI_LAYOUT_WEATHER_FOCUS_FORECAST_DAY_COUNT - 1)
            ? layoutOut.timeline.x + layoutOut.timeline.w
            : cardX + cardWidth;
    layoutOut.forecast[index] = {
        cardX,
        layoutOut.timeline.y,
        nextX - cardX,
        layoutOut.timeline.h,
    };
  }

  layoutOut.navLeft = layoutNavLeftRect(input.showChrome, input.displayHeight, WEATHER_FOCUS_MARGIN);
  layoutOut.navRight = layoutNavRightRect(
      input.showChrome,
      input.displayWidth,
      input.displayHeight,
      WEATHER_FOCUS_MARGIN);
  layoutOut.debugIp = {0, 0, 0, 0};
}

void computeMediaPlayerPageLayout(
    const UiPageChromeLayoutInput &input,
    UiMediaPlayerPageLayout &layoutOut)
{
  memset(&layoutOut, 0, sizeof(layoutOut));

  const int contentTop =
      input.showChrome
          ? MEDIA_PLAYER_TOP_WITH_CHROME
          : MEDIA_PLAYER_TOP_NO_CHROME;
  const int footerTop =
      input.showChrome
          ? (input.displayHeight - MEDIA_PLAYER_FOOTER_WITH_CHROME_OFFSET)
          : (input.displayHeight - MEDIA_PLAYER_FOOTER_NO_CHROME_OFFSET);
  const int contentHeight = footerTop - contentTop;
  const int bodyX = (input.displayWidth - MEDIA_PLAYER_BODY_WIDTH) / 2;
  const int bodyY = contentTop + ((contentHeight - MEDIA_PLAYER_BODY_HEIGHT) / 2);
  const int controlsTop = bodyY + MEDIA_PLAYER_CONTROLS_TOP_OFFSET;
  const int controlsWidth =
      (MEDIA_PLAYER_CONTROL_WIDTH * 3) + (MEDIA_PLAYER_CONTROL_GAP * 2);
  const int controlsX = bodyX + ((MEDIA_PLAYER_BODY_WIDTH - controlsWidth) / 2);

  layoutOut.content = {0, contentTop, input.displayWidth, contentHeight};
  layoutOut.body = {
      bodyX,
      bodyY,
      MEDIA_PLAYER_BODY_WIDTH,
      MEDIA_PLAYER_BODY_HEIGHT,
  };
  layoutOut.cover = {
      bodyX + ((MEDIA_PLAYER_BODY_WIDTH - MEDIA_PLAYER_COVER_SIZE) / 2),
      bodyY + MEDIA_PLAYER_COVER_TOP_OFFSET,
      MEDIA_PLAYER_COVER_SIZE,
      MEDIA_PLAYER_COVER_SIZE,
  };
  layoutOut.progress = {
      bodyX + MEDIA_PLAYER_PROGRESS_X_OFFSET,
      bodyY + MEDIA_PLAYER_PROGRESS_TOP_OFFSET,
      MEDIA_PLAYER_BODY_WIDTH - (MEDIA_PLAYER_PROGRESS_X_OFFSET * 2),
      MEDIA_PLAYER_PROGRESS_HEIGHT,
  };
  layoutOut.prevButton = {
      controlsX,
      controlsTop,
      MEDIA_PLAYER_CONTROL_WIDTH,
      MEDIA_PLAYER_CONTROL_HEIGHT,
  };
  layoutOut.playPauseButton = {
      controlsX + MEDIA_PLAYER_CONTROL_WIDTH + MEDIA_PLAYER_CONTROL_GAP,
      controlsTop,
      MEDIA_PLAYER_CONTROL_WIDTH,
      MEDIA_PLAYER_CONTROL_HEIGHT,
  };
  layoutOut.nextButton = {
      controlsX +
          MEDIA_PLAYER_CONTROL_WIDTH +
          MEDIA_PLAYER_CONTROL_GAP +
          MEDIA_PLAYER_CONTROL_WIDTH +
          MEDIA_PLAYER_CONTROL_GAP,
      controlsTop,
      MEDIA_PLAYER_CONTROL_WIDTH,
      MEDIA_PLAYER_CONTROL_HEIGHT,
  };
  layoutOut.navLeft = layoutNavLeftRect(input.showChrome, input.displayHeight, MEDIA_PLAYER_MARGIN);
  layoutOut.navRight = layoutNavRightRect(
      input.showChrome,
      input.displayWidth,
      input.displayHeight,
      MEDIA_PLAYER_MARGIN);
  layoutOut.debugIp = {0, 0, 0, 0};
}
