#pragma once

#include <stdint.h>

typedef struct
{
  int x;
  int y;
  int w;
  int h;
} UiLayoutRect;

typedef struct
{
  UiLayoutRect card;
  UiLayoutRect content;
  UiLayoutRect control;
  UiLayoutRect secondary;
  UiLayoutRect tertiary;
  UiLayoutRect face;
  UiLayoutRect clockTime;
  UiLayoutRect seconds;
  UiLayoutRect digits[8];
  UiLayoutRect actions[3];
} UiWidgetLayout;

typedef struct
{
  UiWidgetLayout *widgets;
  uint8_t widgetCapacity;
  UiLayoutRect navLeft;
  UiLayoutRect navRight;
  UiLayoutRect debugIp;
} UiStandardPageLayout;

enum UiLayoutWidgetType : uint8_t
{
  UI_LAYOUT_WIDGET_CLOCK = 0,
  UI_LAYOUT_WIDGET_WEATHER = 1,
  UI_LAYOUT_WIDGET_PROGRESS = 2,
  UI_LAYOUT_WIDGET_SWITCH = 3,
  UI_LAYOUT_WIDGET_BUTTON = 4,
  UI_LAYOUT_WIDGET_SLIDER = 5,
  UI_LAYOUT_WIDGET_THERMOSTAT = 6,
  UI_LAYOUT_WIDGET_TEXT = 7,
  UI_LAYOUT_WIDGET_TITLE = 8,
};

enum UiLayoutClockStyle : uint8_t
{
  UI_LAYOUT_CLOCK_DIGITAL = 0,
  UI_LAYOUT_CLOCK_ANALOG = 1,
};

enum UiLayoutFontProfile : uint8_t
{
  UI_LAYOUT_FONT_PROFILE_SYSTEM = 0,
  UI_LAYOUT_FONT_PROFILE_SERIF = 1,
  UI_LAYOUT_FONT_PROFILE_MONO = 2,
};

typedef struct
{
  uint8_t type;
  uint8_t clockStyle;
  bool showSeconds;
  bool showHistoryGraph;
} UiLayoutWidgetConfig;

typedef struct
{
  int displayWidth;
  int displayHeight;
  bool showChrome;
  UiLayoutFontProfile fontProfile;
  uint8_t widgetCount;
  const UiLayoutWidgetConfig *widgets;
  const bool *widgetVisible;
} UiStandardPageLayoutInput;

void computeStandardPageLayout(
    const UiStandardPageLayoutInput &input,
    UiStandardPageLayout &layoutOut);
