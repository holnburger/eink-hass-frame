#include "ui_layout_helpers.h"

#include <string.h>

static constexpr int STANDARD_PAGE_MARGIN = 24;
static constexpr int STANDARD_PAGE_TOP_WITH_CHROME = 76;
static constexpr int STANDARD_PAGE_TOP_NO_CHROME = 28;
static constexpr int STANDARD_PAGE_FOOTER_WITH_CHROME_OFFSET = 78;
static constexpr int STANDARD_PAGE_FOOTER_NO_CHROME_OFFSET = 20;
static constexpr int STANDARD_PAGE_WIDGET_GAP = 16;
static constexpr int STANDARD_PAGE_NAV_Y_OFFSET = 67;
static constexpr int STANDARD_PAGE_NAV_SIZE = 48;
static constexpr int STANDARD_PAGE_NAV_LEFT_OFFSET = 1;
static constexpr int STANDARD_PAGE_NAV_RIGHT_OFFSET = 47;
static constexpr int STANDARD_CARD_HORIZONTAL_PADDING = 18;
static constexpr int STANDARD_CARD_DEFAULT_CONTENT_TOP = 52;
static constexpr int STANDARD_CARD_DEFAULT_CONTENT_BOTTOM_PADDING = 18;
static constexpr int STANDARD_CLOCK_CONTENT_TOP = 50;
static constexpr int STANDARD_CLOCK_CONTENT_BOTTOM_PADDING = 18;
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

static bool layoutWidgetVisible(const UiStandardPageLayoutInput &input, int widgetIndex)
{
  return input.widgetVisible == nullptr || input.widgetVisible[widgetIndex];
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

static void computeStandardClockLayout(
    const UiLayoutWidgetConfig &widget,
    UiLayoutFontProfile fontProfile,
    UiWidgetLayout &layout)
{
  memset(layout.digits, 0, sizeof(layout.digits));
  layout.clockTime = {0, 0, 0, 0};
  layout.seconds = {0, 0, 0, 0};
  layout.face = {0, 0, 0, 0};

  if (layoutClockWidgetIsAnalog(widget))
  {
    const int faceSize = layoutMinInt(layout.content.w, layout.content.h);
    const int inset = 8;
    layout.face = {
        layout.content.x + ((layout.content.w - faceSize) / 2) + inset,
        layout.content.y + ((layout.content.h - faceSize) / 2) + inset,
        faceSize - (inset * 2),
        faceSize - (inset * 2),
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
    computeStandardClockLayout(widget, fontProfile, layout);
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

  const int widgetCount =
      input.widgetCount < layoutOut.widgetCapacity
          ? input.widgetCount
          : layoutOut.widgetCapacity;
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
    if (layoutWidgetVisible(input, widgetIndex))
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
    if (!layoutWidgetVisible(input, widgetIndex))
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

  layoutOut.navLeft =
      input.showChrome
          ? UiLayoutRect{
                STANDARD_PAGE_MARGIN - STANDARD_PAGE_NAV_LEFT_OFFSET,
                input.displayHeight - STANDARD_PAGE_NAV_Y_OFFSET,
                STANDARD_PAGE_NAV_SIZE,
                STANDARD_PAGE_NAV_SIZE}
          : UiLayoutRect{0, 0, 0, 0};
  layoutOut.navRight =
      input.showChrome
          ? UiLayoutRect{
                input.displayWidth - STANDARD_PAGE_MARGIN - STANDARD_PAGE_NAV_RIGHT_OFFSET,
                input.displayHeight - STANDARD_PAGE_NAV_Y_OFFSET,
                STANDARD_PAGE_NAV_SIZE,
                STANDARD_PAGE_NAV_SIZE}
          : UiLayoutRect{0, 0, 0, 0};
  layoutOut.debugIp = {0, 0, 0, 0};
}
