#pragma once

#include <stdint.h>

// Default UI build config. This file is overwritten by /api/firmware/build.
#define UI_FONT_NAME "System Sans"
#define UI_THEME_DARK 0
#define UI_BUILD_ID "dev-local"
#define PARTIAL_REFRESH_MS_OVERRIDE 30000
#define FULL_REFRESH_EVERY_N_PARTIALS_OVERRIDE 60
#define WIFI_SSID_BUILD ""
#define WIFI_PASSWORD_BUILD ""

enum UiWidgetType : uint8_t {
  UI_WIDGET_CLOCK = 0,
  UI_WIDGET_WEATHER = 1,
  UI_WIDGET_PROGRESS = 2,
  UI_WIDGET_SWITCH = 3,
  UI_WIDGET_SLIDER = 4,
  UI_WIDGET_NONE = 255,
};

typedef struct {
  uint8_t type;
  const char *label;
  int16_t value;
  int16_t maxValue;
  uint8_t enabled;
} UiWidgetConfig;

typedef struct {
  const char *name;
  uint8_t widgetCount;
  UiWidgetConfig widgets[4];
} UiPageConfig;

#define UI_PAGE_COUNT 1
#define UI_MAX_WIDGETS_PER_PAGE 4
static const UiPageConfig UI_PAGES[UI_PAGE_COUNT] = {
    {"Home",
     4,
     {
         {UI_WIDGET_CLOCK, "Clock", 0, 100, 0},
         {UI_WIDGET_WEATHER, "Weather", 0, 100, 0},
         {UI_WIDGET_PROGRESS, "Progress", 45, 100, 0},
         {UI_WIDGET_SWITCH, "Switch", 0, 100, 0},
     }},
};
