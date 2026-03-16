#include <Arduino.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <Update.h>
#include <WiFi.h>
#include <WebServer.h>
#include <math.h>
#include <time.h>
#if __has_include(<bb_captouch.h>)
#include <bb_captouch.h>
#define CAPTOUCH_AVAILABLE 1
#else
#define CAPTOUCH_AVAILABLE 0
#endif

#include "device_config.h"
#include "generated_ui_config.h"
#if __has_include("generated_mdi_icons.h")
#include "generated_mdi_icons.h"
#define UI_MDI_ICONS_AVAILABLE 1
#else
#define UI_MDI_ICONS_AVAILABLE 0
#endif
#if __has_include("generated_media_cover.h")
#include "generated_media_cover.h"
#define UI_MEDIA_COVER_AVAILABLE 1
#else
#define UI_MEDIA_COVER_AVAILABLE 0
#endif
#include "generated_weather_icons.h"
#if __has_include("generated_pio_wifi.h")
#include "generated_pio_wifi.h"
#endif

#if __has_include(<FastEPD.h>)
#include <FastEPD.h>
#define FASTEPD_AVAILABLE 1
#if __has_include("fonts/Courier_Prime_24.h")
#include "fonts/Courier_Prime_24.h"
#define UI_COURIER_24_AVAILABLE 1
#else
#define UI_COURIER_24_AVAILABLE 0
#endif
#if __has_include("fonts/Lora_24.h")
#include "fonts/Lora_24.h"
#define UI_LORA_24_AVAILABLE 1
#else
#define UI_LORA_24_AVAILABLE 0
#endif
#if __has_include("fonts/Inter_Regular_18.h")
#include "fonts/Inter_Regular_18.h"
#define UI_INTER_18_AVAILABLE 1
#else
#define UI_INTER_18_AVAILABLE 0
#endif
#if __has_include("fonts/Inter_Regular_16.h")
#include "fonts/Inter_Regular_16.h"
#define UI_INTER_16_AVAILABLE 1
#else
#define UI_INTER_16_AVAILABLE 0
#endif
#if __has_include("fonts/Inter_Regular_22.h")
#include "fonts/Inter_Regular_22.h"
#define UI_INTER_22_AVAILABLE 1
#else
#define UI_INTER_22_AVAILABLE 0
#endif
#if __has_include("fonts/IBMPlexSerif_18.h")
#include "fonts/IBMPlexSerif_18.h"
#define UI_IBM_PLEX_SERIF_18_AVAILABLE 1
#else
#define UI_IBM_PLEX_SERIF_18_AVAILABLE 0
#endif
#if __has_include("fonts/IBMPlexSerif_16.h")
#include "fonts/IBMPlexSerif_16.h"
#define UI_IBM_PLEX_SERIF_16_AVAILABLE 1
#else
#define UI_IBM_PLEX_SERIF_16_AVAILABLE 0
#endif
#if __has_include("fonts/IBMPlexSerif_22.h")
#include "fonts/IBMPlexSerif_22.h"
#define UI_IBM_PLEX_SERIF_22_AVAILABLE 1
#else
#define UI_IBM_PLEX_SERIF_22_AVAILABLE 0
#endif
#if __has_include("fonts/IBMPlexMono_18.h")
#include "fonts/IBMPlexMono_18.h"
#define UI_IBM_PLEX_MONO_18_AVAILABLE 1
#else
#define UI_IBM_PLEX_MONO_18_AVAILABLE 0
#endif
#if __has_include("fonts/IBMPlexMono_16.h")
#include "fonts/IBMPlexMono_16.h"
#define UI_IBM_PLEX_MONO_16_AVAILABLE 1
#else
#define UI_IBM_PLEX_MONO_16_AVAILABLE 0
#endif
#if __has_include("fonts/IBMPlexMono_20.h")
#include "fonts/IBMPlexMono_20.h"
#define UI_IBM_PLEX_MONO_20_AVAILABLE 1
#else
#define UI_IBM_PLEX_MONO_20_AVAILABLE 0
#endif
#if __has_include("fonts/Roboto_Black_30.h")
#include "fonts/Roboto_Black_30.h"
#define UI_THERMOSTAT_CURRENT_FONT_AVAILABLE 1
#define UI_THERMOSTAT_CURRENT_FONT Roboto_Black_30
#elif __has_include("fonts/Roboto_Black_20.h")
#include "fonts/Roboto_Black_20.h"
#define UI_THERMOSTAT_CURRENT_FONT_AVAILABLE 1
#define UI_THERMOSTAT_CURRENT_FONT Roboto_Black_20
#else
#define UI_THERMOSTAT_CURRENT_FONT_AVAILABLE 0
#endif
#if __has_include("fonts/Roboto_Regular_20.h")
#include "fonts/Roboto_Regular_20.h"
#define UI_ROBOTO_REGULAR_20_AVAILABLE 1
#define UI_THERMOSTAT_TARGET_FONT_AVAILABLE 1
#else
#define UI_ROBOTO_REGULAR_20_AVAILABLE 0
#define UI_THERMOSTAT_TARGET_FONT_AVAILABLE 0
#endif
#if __has_include("fonts/Roboto_Black_40.h")
#include "fonts/Roboto_Black_40.h"
#define UI_WEATHER_FONT_AVAILABLE 1
#else
#define UI_WEATHER_FONT_AVAILABLE 0
#endif
#else
#define FASTEPD_AVAILABLE 0
#define UI_COURIER_24_AVAILABLE 0
#define UI_LORA_24_AVAILABLE 0
#define UI_INTER_16_AVAILABLE 0
#define UI_INTER_18_AVAILABLE 0
#define UI_INTER_22_AVAILABLE 0
#define UI_IBM_PLEX_SERIF_16_AVAILABLE 0
#define UI_IBM_PLEX_SERIF_18_AVAILABLE 0
#define UI_IBM_PLEX_SERIF_22_AVAILABLE 0
#define UI_IBM_PLEX_MONO_16_AVAILABLE 0
#define UI_IBM_PLEX_MONO_18_AVAILABLE 0
#define UI_IBM_PLEX_MONO_20_AVAILABLE 0
#define UI_ROBOTO_REGULAR_20_AVAILABLE 0
#define UI_THERMOSTAT_TARGET_FONT_AVAILABLE 0
#define UI_WEATHER_FONT_AVAILABLE 0
#endif

#ifndef PARTIAL_REFRESH_MS_OVERRIDE
#define PARTIAL_REFRESH_MS_OVERRIDE PARTIAL_REFRESH_MS
#endif

#ifndef FULL_REFRESH_EVERY_N_PARTIALS_OVERRIDE
#define FULL_REFRESH_EVERY_N_PARTIALS_OVERRIDE FULL_REFRESH_EVERY_N_PARTIALS
#endif

#ifndef UI_SHOW_SWITCH
#define UI_SHOW_SWITCH 1
#endif

#ifndef UI_BUILD_ID
#define UI_BUILD_ID "dev-local"
#endif

#ifndef WIFI_SSID_PIO
#define WIFI_SSID_PIO ""
#endif

#ifndef WIFI_PASSWORD_PIO
#define WIFI_PASSWORD_PIO ""
#endif

#if CAPTOUCH_AVAILABLE
#define TOUCH_SDA 41
#define TOUCH_SCL 42
#define TOUCH_INT 48
#define TOUCH_RST -1
#endif

static const char *FIRMWARE_DISPLAY_NAME = "M5PaperS3 FastEPD Firmware";
static const char *FIRMWARE_VERSION_NAME = "0.1.0";
static const char *IMPROV_DEVICE_NAME = "M5PaperS3";
static const uint8_t IMPROV_HEADER_BYTES[] = {'I', 'M', 'P', 'R', 'O', 'V'};

enum ImprovMessageType : uint8_t
{
  IMPROV_CURRENT_STATE = 0x01,
  IMPROV_ERROR_STATE = 0x02,
  IMPROV_RPC = 0x03,
  IMPROV_RPC_RESULT = 0x04,
};

enum ImprovCurrentState : uint8_t
{
  IMPROV_STATE_READY = 0x02,
  IMPROV_STATE_PROVISIONING = 0x03,
  IMPROV_STATE_PROVISIONED = 0x04,
};

enum ImprovErrorState : uint8_t
{
  IMPROV_ERROR_NONE = 0x00,
  IMPROV_ERROR_INVALID_RPC_PACKET = 0x01,
  IMPROV_ERROR_UNKNOWN_RPC_COMMAND = 0x02,
  IMPROV_ERROR_UNABLE_TO_CONNECT = 0x03,
};

enum ImprovRpcCommand : uint8_t
{
  IMPROV_RPC_SEND_WIFI_SETTINGS = 0x01,
  IMPROV_RPC_REQUEST_CURRENT_STATE = 0x02,
  IMPROV_RPC_REQUEST_INFO = 0x03,
  IMPROV_RPC_REQUEST_WIFI_NETWORKS = 0x04,
};

WebServer server(80);
Preferences preferences;
static uint32_t partialCounter = 0;
static uint32_t lastPartialRefresh = 0;
static uint32_t lastWifiRetry = 0;
static String serialBuffer;
static bool serverStarted = false;
static bool improvProvisioningActive = false;
static uint8_t improvPacketBuffer[256];
static size_t improvPacketLength = 0;
static size_t improvExpectedLength = 0;

static void renderStatusScreen(const char *title, const char *line1 = "", const char *line2 = "");

#if FASTEPD_AVAILABLE
static FASTEPD display;
static bool displayReady = false;
static bool pageReady = false;
static bool ntpConfigured = false;
static uint32_t lastClockUpdateMs = 0;
static uint32_t lastValueUpdateMs = 0;
static uint32_t lastWeatherUpdateMs = 0;
static uint32_t lastFullRefreshMs = 0;
static int currentPageIndex = 0;
static BB_RECT debugIpRect = {0, 0, 0, 0};
static BB_RECT navLeftRect = {0, 0, 0, 0};
static BB_RECT navRightRect = {0, 0, 0, 0};
static BB_RECT weatherFocusContentRect = {0, 0, 0, 0};
static BB_RECT weatherFocusHeroRect = {0, 0, 0, 0};
static BB_RECT weatherFocusHeroIconRect = {0, 0, 0, 0};
static BB_RECT weatherFocusTimelineRect = {0, 0, 0, 0};
static BB_RECT weatherFocusForecastRects[4];
static BB_RECT mediaPlayerContentRect = {0, 0, 0, 0};
static BB_RECT mediaPlayerBodyRect = {0, 0, 0, 0};
static BB_RECT mediaPlayerCoverRect = {0, 0, 0, 0};
static BB_RECT mediaPlayerProgressRect = {0, 0, 0, 0};
static char lastDebugIp[40] = "";

static inline bool uiThemeDark()
{
  return UI_THEME_DARK != 0;
}

static inline uint16_t uiMonoInk()
{
  return uiThemeDark() ? BBEP_WHITE : BBEP_BLACK;
}

static inline uint16_t uiMonoPaper()
{
  return uiThemeDark() ? BBEP_BLACK : BBEP_WHITE;
}

static inline uint8_t uiGrayValue(uint8_t lightModeValue)
{
  return uiThemeDark() ? (uint8_t)(15 - lightModeValue) : lightModeValue;
}

static inline uint8_t uiGrayInk()
{
  return uiGrayValue(0);
}

static inline uint8_t uiGrayPaper()
{
  return uiGrayValue(15);
}

static inline void setThemeMonoText()
{
  display.setTextColor(uiMonoInk(), uiMonoPaper());
}

static inline void setThemeGrayText(uint8_t lightForeground = 0, uint8_t lightBackground = 15)
{
  display.setTextColor(uiGrayValue(lightForeground), uiGrayValue(lightBackground));
}

typedef struct
{
  int tempC;
  const char *condition;
} WeatherFrame;

static const WeatherFrame WEATHER_FRAMES[] = {
    {7, "Cloudy"},
    {8, "Light rain"},
    {9, "Clear"},
    {6, "Windy"},
    {5, "Rain"},
};

static const char *WEATHER_FORECAST_LABELS[] = {
    "+2h",
    "+4h",
    "+6h",
    "+8h",
};

typedef struct
{
  BB_RECT cardRect;
  BB_RECT contentRect;
  BB_RECT controlRect;
  BB_RECT secondaryRect;
  BB_RECT tertiaryRect;
  BB_RECT faceRect;
  BB_RECT digitRects[8];
  BB_RECT secondsRect;
  int value;
  int maxValue;
  bool enabled;
  int direction;
  int phase;
  char lastClockText[16];
} WidgetRuntimeState;

static WidgetRuntimeState widgetStates[UI_PAGE_COUNT][UI_MAX_WIDGETS_PER_PAGE];
static int weatherPagePhases[UI_PAGE_COUNT];

#if CAPTOUCH_AVAILABLE
static BBCapTouch capTouch;
static bool touchReady = false;
static bool touchPressed = false;
static uint32_t lastTouchActionMs = 0;
#endif

static bool isPointInRect(int x, int y, const BB_RECT &rect)
{
  return x >= rect.x && x < (rect.x + rect.w) && y >= rect.y && y < (rect.y + rect.h);
}

static bool activePageIsWeatherFocus();
static bool activePageUsesGrayMode();

static bool isPointInRectExpanded(int x, int y, const BB_RECT &rect, int pad)
{
  BB_RECT expanded = rect;
  expanded.x -= pad;
  expanded.y -= pad;
  expanded.w += pad * 2;
  expanded.h += pad * 2;
  return isPointInRect(x, y, expanded);
}

static int centeredX(const char *text)
{
  BB_RECT bounds;
  display.getStringBox(text, &bounds);
  const int x = (display.width() - bounds.w) / 2;
  return x < 0 ? 0 : x;
}

static void printTextAt(const char *text, int x, int y)
{
  display.setCursor(x, y);
  display.print(text);
}

static void drawReadableLine(const char *text, int x, int y)
{
  printTextAt(text, x, y);
  printTextAt(text, x + 1, y);
}

enum UiTextRole : uint8_t
{
  UI_TEXT_META = 0,
  UI_TEXT_BODY = 1,
  UI_TEXT_TITLE = 2,
  UI_TEXT_HERO = 3,
};

enum UiFontProfile : uint8_t
{
  UI_FONT_PROFILE_SYSTEM = 0,
  UI_FONT_PROFILE_SERIF = 1,
  UI_FONT_PROFILE_MONO = 2,
};

static UiFontProfile getUiFontProfile()
{
  if (strcmp(UI_FONT_NAME, "Serif") == 0)
  {
    return UI_FONT_PROFILE_SERIF;
  }
  if (strcmp(UI_FONT_NAME, "Mono") == 0)
  {
    return UI_FONT_PROFILE_MONO;
  }
  return UI_FONT_PROFILE_SYSTEM;
}

static void selectTextFont(UiTextRole role);

static const void *getUiAccentFont()
{
  switch (getUiFontProfile())
  {
  case UI_FONT_PROFILE_SERIF:
#if UI_IBM_PLEX_SERIF_18_AVAILABLE
    return IBMPlexSerif_18;
#elif UI_LORA_24_AVAILABLE
    return Lora_24;
#endif
    break;
  case UI_FONT_PROFILE_MONO:
#if UI_IBM_PLEX_MONO_18_AVAILABLE
    return IBMPlexMono_18;
#elif UI_COURIER_24_AVAILABLE
    return Courier_Prime_24;
#endif
    break;
  case UI_FONT_PROFILE_SYSTEM:
  default:
#if UI_INTER_18_AVAILABLE
    return Inter_Regular_18;
#elif UI_ROBOTO_REGULAR_20_AVAILABLE
    return Roboto_Regular_20;
#endif
    break;
  }

#if UI_INTER_18_AVAILABLE
  return Inter_Regular_18;
#elif UI_ROBOTO_REGULAR_20_AVAILABLE
  return Roboto_Regular_20;
#elif UI_IBM_PLEX_SERIF_18_AVAILABLE
  return IBMPlexSerif_18;
#elif UI_IBM_PLEX_MONO_18_AVAILABLE
  return IBMPlexMono_18;
#elif UI_LORA_24_AVAILABLE
  return Lora_24;
#elif UI_COURIER_24_AVAILABLE
  return Courier_Prime_24;
#else
  return nullptr;
#endif
}

static bool hasUiAccentFont()
{
  return getUiAccentFont() != nullptr;
}

static const void *getUiPageTitleFont()
{
  switch (getUiFontProfile())
  {
  case UI_FONT_PROFILE_SERIF:
#if UI_IBM_PLEX_SERIF_16_AVAILABLE
    return IBMPlexSerif_16;
#elif UI_IBM_PLEX_SERIF_18_AVAILABLE
    return IBMPlexSerif_18;
#endif
    break;
  case UI_FONT_PROFILE_MONO:
#if UI_IBM_PLEX_MONO_16_AVAILABLE
    return IBMPlexMono_16;
#elif UI_IBM_PLEX_MONO_18_AVAILABLE
    return IBMPlexMono_18;
#endif
    break;
  case UI_FONT_PROFILE_SYSTEM:
  default:
#if UI_INTER_16_AVAILABLE
    return Inter_Regular_16;
#elif UI_INTER_18_AVAILABLE
    return Inter_Regular_18;
#endif
    break;
  }
  return getUiAccentFont();
}

static const void *getUiMediaArtistFont()
{
  return getUiAccentFont();
}

static const void *getUiMediaTitleFont()
{
  switch (getUiFontProfile())
  {
  case UI_FONT_PROFILE_SERIF:
#if UI_IBM_PLEX_SERIF_22_AVAILABLE
    return IBMPlexSerif_22;
#elif UI_IBM_PLEX_SERIF_18_AVAILABLE
    return IBMPlexSerif_18;
#endif
    break;
  case UI_FONT_PROFILE_SYSTEM:
#if UI_INTER_22_AVAILABLE
    return Inter_Regular_22;
#elif UI_INTER_18_AVAILABLE
    return Inter_Regular_18;
#elif UI_ROBOTO_REGULAR_20_AVAILABLE
    return Roboto_Regular_20;
#endif
    break;
  case UI_FONT_PROFILE_MONO:
#if UI_IBM_PLEX_MONO_20_AVAILABLE
    return IBMPlexMono_20;
#elif UI_IBM_PLEX_MONO_18_AVAILABLE
    return IBMPlexMono_18;
#endif
    break;
  default:
    break;
  }
  return nullptr;
}

static int textWidthForCurrentSelection(const char *text)
{
  BB_RECT bounds;
  display.setCursor(0, 0);
  display.getStringBox(text, &bounds);
  display.setItalic(false);
  return bounds.w;
}

static void truncateTextToWidth(
    const char *input,
    char *output,
    size_t outputLen,
    int maxWidth,
    const void *customFont,
    UiTextRole role,
    int hardCharacterLimit = 0)
{
  if (outputLen == 0)
  {
    return;
  }
  output[0] = '\0';
  if (input == nullptr)
  {
    return;
  }

  size_t candidateLen = strlen(input);
  if (hardCharacterLimit > 0 && candidateLen > (size_t)hardCharacterLimit)
  {
    candidateLen = (size_t)hardCharacterLimit;
  }
  if (candidateLen >= outputLen)
  {
    candidateLen = outputLen - 1;
  }

  memcpy(output, input, candidateLen);
  output[candidateLen] = '\0';

  if (customFont != nullptr)
  {
    display.setItalic(false);
    display.setFont(customFont);
  }
  else
  {
    selectTextFont(role);
  }

  if (textWidthForCurrentSelection(output) <= maxWidth && candidateLen == strlen(input))
  {
    return;
  }

  for (int len = (int)candidateLen; len >= 1; len--)
  {
    snprintf(output, outputLen, "%.*s...", len, input);
    if (textWidthForCurrentSelection(output) <= maxWidth)
    {
      return;
    }
  }

  snprintf(output, outputLen, "...");
}

static void drawCenteredTextRoleAtTop(const char *text, int topY, UiTextRole role, bool gray)
{
  display.setCursor(0, 0);
  selectTextFont(role);
  BB_RECT bounds;
  display.getStringBox(text, &bounds);
  const int x = ((display.width() - bounds.w) / 2) < 0 ? 0 : ((display.width() - bounds.w) / 2);
  if (gray)
  {
    setThemeGrayText();
  }
  else
  {
    setThemeMonoText();
  }
  display.setCursor(x, topY - bounds.y);
  display.print(text);
  display.setItalic(false);
}

static void selectTextFont(UiTextRole role)
{
  display.setItalic(false);
  switch (getUiFontProfile())
  {
  case UI_FONT_PROFILE_SERIF:
    display.setFont(FONT_12x16);
    display.setItalic(true);
    break;
  case UI_FONT_PROFILE_MONO:
    display.setFont(FONT_12x16);
    break;
  case UI_FONT_PROFILE_SYSTEM:
  default:
    display.setFont(role == UI_TEXT_META ? FONT_8x8 : FONT_12x16);
    break;
  }
}

static int textWidthForRole(const char *text, UiTextRole role)
{
  display.setCursor(0, 0);
  selectTextFont(role);
  BB_RECT bounds;
  display.getStringBox(text, &bounds);
  display.setItalic(false);
  return bounds.w;
}

static int baselineForTopAlignedText(const char *text, UiTextRole role, int topY)
{
  display.setCursor(0, 0);
  selectTextFont(role);
  BB_RECT bounds;
  display.getStringBox(text, &bounds);
  display.setItalic(false);
  return topY - bounds.y;
}

static int customFontTextWidth(const void *font, const char *text)
{
  display.setItalic(false);
  display.setFont(font);
  display.setCursor(0, 0);
  BB_RECT bounds;
  display.getStringBox(text, &bounds);
  return bounds.w;
}

static int customFontBaselineForTop(const void *font, const char *text, int topY)
{
  display.setItalic(false);
  display.setFont(font);
  display.setCursor(0, 0);
  BB_RECT bounds;
  display.getStringBox(text, &bounds);
  return topY - bounds.y;
}

static void drawCustomTextAtTop(const void *font, const char *text, int x, int topY)
{
  display.setItalic(false);
  display.setFont(font);
  setThemeMonoText();
  display.setCursor(x, customFontBaselineForTop(font, text, topY));
  display.print(text);
}

static void drawCustomTextAtTopBold(const void *font, const char *text, int x, int topY, int passes = 2)
{
  if (passes < 1)
  {
    passes = 1;
  }
  const int baseline = customFontBaselineForTop(font, text, topY);
  display.setItalic(false);
  display.setFont(font);
  setThemeMonoText();
  for (int pass = 0; pass < passes; pass++)
  {
    display.setCursor(x + pass, baseline);
    display.print(text);
  }
}

static void drawCustomTextAtTopAA(const void *font, const char *text, int x, int topY)
{
  display.setItalic(false);
  display.setFont(font, true);
  setThemeGrayText();
  display.setCursor(x, customFontBaselineForTop(font, text, topY));
  display.print(text);
}

static void drawCenteredCustomTextAtTop(const void *font, const char *text, int topY)
{
  const int width = customFontTextWidth(font, text);
  int x = (display.width() - width) / 2;
  if (x < 0)
  {
    x = 0;
  }
  drawCustomTextAtTop(font, text, x, topY);
}

static void drawCenteredCustomTextAtTopAA(const void *font, const char *text, int topY)
{
  const int width = customFontTextWidth(font, text);
  int x = (display.width() - width) / 2;
  if (x < 0)
  {
    x = 0;
  }
  drawCustomTextAtTopAA(font, text, x, topY);
}

static void drawTextRole(const char *text, int x, int y, UiTextRole role)
{
  selectTextFont(role);
  setThemeMonoText();
  if (role == UI_TEXT_TITLE || role == UI_TEXT_HERO)
  {
    printTextAt(text, x, y);
  }
  else
  {
    drawReadableLine(text, x, y);
  }
  display.setItalic(false);
}

static void drawBoldLine(int x1, int y1, int x2, int y2, int thickness)
{
  if (thickness <= 1)
  {
    display.drawLine(x1, y1, x2, y2, uiMonoInk());
    return;
  }

  const int half = thickness / 2;
  const int dx = x2 - x1;
  const int dy = y2 - y1;

  if (abs(dx) >= abs(dy))
  {
    for (int offset = -half; offset <= half; offset++)
    {
      display.drawLine(x1, y1 + offset, x2, y2 + offset, uiMonoInk());
    }
  }
  else
  {
    for (int offset = -half; offset <= half; offset++)
    {
      display.drawLine(x1 + offset, y1, x2 + offset, y2, uiMonoInk());
    }
  }
}

static void drawCenteredTextRole(const char *text, int y, UiTextRole role)
{
  const int width = textWidthForRole(text, role);
  int x = (display.width() - width) / 2;
  if (x < 0)
  {
    x = 0;
  }
  if (role == UI_TEXT_TITLE || role == UI_TEXT_HERO)
  {
    drawTextRole(text, x, baselineForTopAlignedText(text, role, y), role);
    return;
  }
  drawTextRole(text, x, y, role);
}

static bool clockWidgetIsAnalog(const UiWidgetConfig &widget)
{
  return widget.clockStyle == UI_CLOCK_ANALOG;
}

static bool clockWidgetShowsSeconds(const UiWidgetConfig &widget)
{
  return widget.showSeconds != 0;
}

static bool readClockTime(struct tm &timeInfo)
{
  return getLocalTime(&timeInfo, 10);
}

static bool readClockText(const UiWidgetConfig &widget, char *out, size_t outLen)
{
  struct tm timeInfo;
  if (readClockTime(timeInfo))
  {
    strftime(out, outLen, clockWidgetShowsSeconds(widget) ? "%H:%M:%S" : "%H:%M", &timeInfo);
    return true;
  }
  snprintf(out, outLen, clockWidgetShowsSeconds(widget) ? "--:--:--" : "--:--");
  return false;
}

static void configureNtpIfNeeded()
{
  if (ntpConfigured || WiFi.status() != WL_CONNECTED)
  {
    return;
  }
  configTzTime(
      "CET-1CEST,M3.5.0/02,M10.5.0/03",
      "pool.ntp.org",
      "time.nist.gov",
      "time.google.com");
  ntpConfigured = true;
  Serial.println("NTP_SYNC_STARTED");
}

static void buildDebugIpText(char *out, size_t outLen)
{
  if (WiFi.status() == WL_CONNECTED)
  {
    const String ip = WiFi.localIP().toString();
    snprintf(out, outLen, "IP %s", ip.c_str());
  }
  else
  {
    snprintf(out, outLen, "IP offline");
  }
}

static void drawDebugIpText(const char *debugIp, bool partialRefresh)
{
  if (!displayReady)
  {
    return;
  }

  if (activePageUsesGrayMode())
  {
    display.setMode(BB_MODE_4BPP);
    setThemeGrayText();
    display.fillRect(debugIpRect.x, debugIpRect.y, debugIpRect.w, debugIpRect.h, uiGrayPaper());
    display.setFont(FONT_8x8);
  }
  else
  {
    display.setMode(BB_MODE_1BPP);
    setThemeMonoText();
    display.fillRect(debugIpRect.x, debugIpRect.y, debugIpRect.w, debugIpRect.h, uiMonoPaper());
  }

  const int textWidth = textWidthForRole(debugIp, UI_TEXT_META);
  int textX = debugIpRect.x + debugIpRect.w - textWidth;
  if (textX < debugIpRect.x)
  {
    textX = debugIpRect.x;
  }
  drawTextRole(debugIp, textX, debugIpRect.y, UI_TEXT_META);

  if (partialRefresh)
  {
    if (activePageUsesGrayMode())
    {
#ifdef CLEAR_FAST
      display.fullUpdate(CLEAR_FAST, false, &debugIpRect);
#else
      display.fullUpdate(1, false, &debugIpRect);
#endif
    }
    else
    {
      display.partialUpdate(false);
      partialCounter++;
    }
    lastPartialRefresh = millis();
  }
}

static void drawSevenSegmentSymbol(int x, int y, int w, int h, int thickness, char symbol)
{
  static const uint8_t digitMap[10] = {
      0x3F, // 0
      0x06, // 1
      0x5B, // 2
      0x4F, // 3
      0x66, // 4
      0x6D, // 5
      0x7D, // 6
      0x07, // 7
      0x7F, // 8
      0x6F  // 9
  };

  int vLen = (h - (3 * thickness)) / 2;
  if (vLen < 4)
  {
    return;
  }
  int hLen = w - (2 * thickness);
  if (hLen < 4)
  {
    return;
  }

  uint8_t segments = 0;
  if (symbol >= '0' && symbol <= '9')
  {
    segments = digitMap[symbol - '0'];
  }
  else if (symbol == '-')
  {
    segments = 0x40; // middle segment only
  }
  else
  {
    return;
  }

  auto drawSeg = [&](bool on, int sx, int sy, int sw, int sh)
  {
    if (on)
    {
      display.fillRect(sx, sy, sw, sh, uiMonoInk());
    }
  };

  const bool a = segments & 0x01;
  const bool b = segments & 0x02;
  const bool c = segments & 0x04;
  const bool d = segments & 0x08;
  const bool e = segments & 0x10;
  const bool f = segments & 0x20;
  const bool g = segments & 0x40;

  drawSeg(a, x + thickness, y, hLen, thickness);
  drawSeg(f, x, y + thickness, thickness, vLen);
  drawSeg(b, x + w - thickness, y + thickness, thickness, vLen);
  drawSeg(g, x + thickness, y + thickness + vLen, hLen, thickness);
  drawSeg(e, x, y + (2 * thickness) + vLen, thickness, vLen);
  drawSeg(c, x + w - thickness, y + (2 * thickness) + vLen, thickness, vLen);
  drawSeg(d, x + thickness, y + (2 * thickness) + (2 * vLen), hLen, thickness);
}

static void drawSevenSegmentColon(int x, int y, int w, int h, int thickness)
{
  int dotSize = thickness;
  if (dotSize < 6)
  {
    dotSize = 6;
  }
  int cx = x + ((w - dotSize) / 2);
  int topY = y + (h / 3) - (dotSize / 2);
  int bottomY = y + ((2 * h) / 3) - (dotSize / 2);
  display.fillRect(cx, topY, dotSize, dotSize, uiMonoInk());
  display.fillRect(cx, bottomY, dotSize, dotSize, uiMonoInk());
}

static int clampInt(int value, int minValue, int maxValue)
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

static void formatTemperatureTenths(int valueTenths, char *out, size_t outLen)
{
  const int absValue = abs(valueTenths);
  const int whole = absValue / 10;
  const int fraction = absValue % 10;
  snprintf(out, outLen, "%s%d.%d", valueTenths < 0 ? "-" : "", whole, fraction);
}

static WidgetRuntimeState &getWidgetState(int pageIndex, int widgetIndex)
{
  return widgetStates[pageIndex][widgetIndex];
}

static UiWidgetConfig getWidgetConfig(int pageIndex, int widgetIndex)
{
  return UI_PAGES[pageIndex].widgets[widgetIndex];
}

static bool pageIsWeatherFocus(int pageIndex)
{
  return UI_PAGES[pageIndex].pageType == UI_PAGE_WEATHER_FOCUS;
}

static bool pageIsMediaPlayer(int pageIndex)
{
  return UI_PAGES[pageIndex].pageType == UI_PAGE_MEDIA_PLAYER;
}

static bool activePageIsWeatherFocus()
{
  return pageIsWeatherFocus(currentPageIndex);
}

static bool activePageIsMediaPlayer()
{
  return pageIsMediaPlayer(currentPageIndex);
}

static bool activePageUsesGrayMode()
{
  return activePageIsMediaPlayer();
}

static bool showPageChrome()
{
  return UI_PAGE_COUNT > 1;
}

static int widgetWeight(uint8_t type)
{
  switch (type)
  {
  case UI_WIDGET_CLOCK:
    return 18;
  case UI_WIDGET_WEATHER:
    return 11;
  case UI_WIDGET_PROGRESS:
    return 6;
  case UI_WIDGET_SWITCH:
    return 5;
  case UI_WIDGET_SLIDER:
    return 10;
  case UI_WIDGET_THERMOSTAT:
    return 9;
  default:
    return 8;
  }
}

static void fillDitherRect(int x, int y, int w, int h, uint8_t shade)
{
  if (w <= 0 || h <= 0)
  {
    return;
  }
  if (shade == 0)
  {
    display.fillRect(x, y, w, h, uiMonoPaper());
    return;
  }
  if (shade >= 4)
  {
    display.fillRect(x, y, w, h, uiMonoInk());
    return;
  }

  for (int yy = y; yy < y + h; yy++)
  {
    for (int xx = x; xx < x + w; xx++)
    {
      bool black = false;
      switch (shade)
      {
      case 1:
        black = ((xx + yy) & 0x3) == 0;
        break;
      case 2:
        black = ((xx + yy) & 0x1) == 0;
        break;
      case 3:
        black = ((xx + yy) & 0x3) != 0;
        break;
      default:
        break;
      }
      display.drawPixelFast(xx, yy, black ? uiMonoInk() : uiMonoPaper());
    }
  }
}

static void fillDitherRoundRect(int x, int y, int w, int h, int r, uint8_t shade)
{
  if (w <= 0 || h <= 0)
  {
    return;
  }
  if (r < 1)
  {
    fillDitherRect(x, y, w, h, shade);
    return;
  }

  if (shade == 0)
  {
    display.fillRoundRect(x, y, w, h, r, uiMonoPaper());
    return;
  }
  if (shade >= 4)
  {
    display.fillRoundRect(x, y, w, h, r, uiMonoInk());
    return;
  }

  const int left = x;
  const int right = x + w - 1;
  const int top = y;
  const int bottom = y + h - 1;
  const int rr = r * r;
  const int cxL = left + r;
  const int cxR = right - r;
  const int cyT = top + r;
  const int cyB = bottom - r;

  for (int yy = top; yy <= bottom; yy++)
  {
    for (int xx = left; xx <= right; xx++)
    {
      bool inside = false;

      if (xx >= cxL && xx <= cxR)
      {
        inside = true;
      }
      else if (yy >= cyT && yy <= cyB)
      {
        inside = true;
      }
      else
      {
        const int cx = (xx < cxL) ? cxL : cxR;
        const int cy = (yy < cyT) ? cyT : cyB;
        const int dx = xx - cx;
        const int dy = yy - cy;
        inside = (dx * dx + dy * dy) <= rr;
      }

      if (!inside)
      {
        continue;
      }

      bool black = false;
      switch (shade)
      {
      case 1:
        black = ((xx + yy) & 0x3) == 0;
        break;
      case 2:
        black = ((xx + yy) & 0x1) == 0;
        break;
      case 3:
        black = ((xx + yy) & 0x3) != 0;
        break;
      default:
        break;
      }
      display.drawPixelFast(xx, yy, black ? uiMonoInk() : uiMonoPaper());
    }
  }
}

#if UI_MDI_ICONS_AVAILABLE
static void drawMdiMonoIconAt(const MdiMonoIconAsset *icon, int x, int y)
{
  if (icon == nullptr)
  {
    return;
  }

  const int pitch = (icon->width + 7) / 8;
  for (int yy = 0; yy < (int)icon->height; yy++)
  {
    for (int xx = 0; xx < (int)icon->width; xx++)
    {
      const uint8_t packed = pgm_read_byte(icon->pixels + (yy * pitch) + (xx / 8));
      if ((packed & (0x80 >> (xx & 7))) == 0)
      {
        continue;
      }
      display.drawPixelFast(x + xx, y + yy, uiMonoInk());
    }
  }
}

static void drawMdiMonoIconCentered(const BB_RECT &rect, const MdiMonoIconAsset *icon)
{
  if (icon == nullptr)
  {
    return;
  }

  const int iconX = rect.x + ((rect.w - (int)icon->width) / 2);
  const int iconY = rect.y + ((rect.h - (int)icon->height) / 2);
  drawMdiMonoIconAt(icon, iconX, iconY);
}

static void drawMdiMonoIconScaled(const BB_RECT &rect, const MdiMonoIconAsset *icon, int padding = 0)
{
  if (icon == nullptr || rect.w <= 0 || rect.h <= 0)
  {
    return;
  }

  const int availableW = rect.w - (padding * 2);
  const int availableH = rect.h - (padding * 2);
  if (availableW <= 0 || availableH <= 0)
  {
    return;
  }

  const int targetSize = availableW < availableH ? availableW : availableH;
  const int targetW = targetSize;
  const int targetH = targetSize;
  const int pitch = (icon->width + 7) / 8;
  const int iconX = rect.x + ((rect.w - targetW) / 2);
  const int iconY = rect.y + ((rect.h - targetH) / 2);

  for (int yy = 0; yy < targetH; yy++)
  {
    const int srcY = (yy * icon->height) / targetH;
    for (int xx = 0; xx < targetW; xx++)
    {
      const int srcX = (xx * icon->width) / targetW;
      const uint8_t packed = pgm_read_byte(icon->pixels + (srcY * pitch) + (srcX / 8));
      if ((packed & (0x80 >> (srcX & 7))) == 0)
      {
        continue;
      }
      display.drawPixelFast(iconX + xx, iconY + yy, uiMonoInk());
    }
  }
}

static void drawMdiMonoIconScaledColor(const BB_RECT &rect, const MdiMonoIconAsset *icon, uint16_t color, int padding = 0)
{
  if (icon == nullptr || rect.w <= 0 || rect.h <= 0)
  {
    return;
  }

  const int availableW = rect.w - (padding * 2);
  const int availableH = rect.h - (padding * 2);
  if (availableW <= 0 || availableH <= 0)
  {
    return;
  }

  const int targetSize = availableW < availableH ? availableW : availableH;
  const int targetW = targetSize;
  const int targetH = targetSize;
  const int pitch = (icon->width + 7) / 8;
  const int iconX = rect.x + ((rect.w - targetW) / 2);
  const int iconY = rect.y + ((rect.h - targetH) / 2);

  for (int yy = 0; yy < targetH; yy++)
  {
    const int srcY = (yy * icon->height) / targetH;
    for (int xx = 0; xx < targetW; xx++)
    {
      const int srcX = (xx * icon->width) / targetW;
      const uint8_t packed = pgm_read_byte(icon->pixels + (srcY * pitch) + (srcX / 8));
      if ((packed & (0x80 >> (srcX & 7))) == 0)
      {
        continue;
      }
      display.drawPixelFast(iconX + xx, iconY + yy, color);
    }
  }
}

static void drawMdiMonoIconScaledGray(const BB_RECT &rect, const MdiMonoIconAsset *icon, uint8_t lightGray = 1, int padding = 0)
{
  if (icon == nullptr || rect.w <= 0 || rect.h <= 0)
  {
    return;
  }

  const int availableW = rect.w - (padding * 2);
  const int availableH = rect.h - (padding * 2);
  if (availableW <= 0 || availableH <= 0)
  {
    return;
  }

  const int targetSize = availableW < availableH ? availableW : availableH;
  const int targetW = targetSize;
  const int targetH = targetSize;
  const int pitch = (icon->width + 7) / 8;
  const int iconX = rect.x + ((rect.w - targetW) / 2);
  const int iconY = rect.y + ((rect.h - targetH) / 2);
  const uint8_t iconShade = uiGrayValue(lightGray);

  for (int yy = 0; yy < targetH; yy++)
  {
    const int destY = iconY + yy;
    if (destY < 0 || destY >= display.height())
    {
      continue;
    }
    const int srcY = (yy * icon->height) / targetH;
    for (int xx = 0; xx < targetW; xx++)
    {
      const int destX = iconX + xx;
      if (destX < 0 || destX >= display.width())
      {
        continue;
      }
      const int srcX = (xx * icon->width) / targetW;
      const uint8_t packed = pgm_read_byte(icon->pixels + (srcY * pitch) + (srcX / 8));
      if ((packed & (0x80 >> (srcX & 7))) == 0)
      {
        continue;
      }
      display.drawPixelFast(destX, destY, iconShade);
    }
  }
}
#endif

static const MdiMonoIconAsset *getMdiWeatherIconAsset(const char *condition)
{
#if UI_MDI_ICONS_AVAILABLE
  if (condition == nullptr)
  {
    return &MDI_ICON_ASSET_WEATHER_CLOUDY;
  }
  if (strstr(condition, "Clear") != nullptr)
  {
    return &MDI_ICON_ASSET_WEATHER_SUNNY;
  }
  if (strstr(condition, "Wind") != nullptr)
  {
    return &MDI_ICON_ASSET_WEATHER_WINDY;
  }
  if (strstr(condition, "Light rain") != nullptr || strstr(condition, "Drizzle") != nullptr)
  {
    return &MDI_ICON_ASSET_WEATHER_RAINY;
  }
  if (strstr(condition, "Rain") != nullptr || strstr(condition, "rain") != nullptr)
  {
    return &MDI_ICON_ASSET_WEATHER_POURING;
  }
  return &MDI_ICON_ASSET_WEATHER_CLOUDY;
#else
  (void)condition;
  return nullptr;
#endif
}

static const MdiMonoIconAsset *getSliderIconAssetByName(const char *iconName)
{
#if UI_MDI_ICONS_AVAILABLE
  if (iconName == nullptr || iconName[0] == '\0' || strcmp(iconName, "lightbulb") == 0)
  {
    return &MDI_ICON_ASSET_SLIDER_LIGHTBULB;
  }
  if (strcmp(iconName, "lamp") == 0)
  {
    return &MDI_ICON_ASSET_SLIDER_LAMP;
  }
  if (strcmp(iconName, "fan") == 0)
  {
    return &MDI_ICON_ASSET_SLIDER_FAN;
  }
  if (strcmp(iconName, "speaker") == 0)
  {
    return &MDI_ICON_ASSET_SLIDER_SPEAKER;
  }
  if (strcmp(iconName, "volume-high") == 0)
  {
    return &MDI_ICON_ASSET_SLIDER_VOLUME_HIGH;
  }
  if (strcmp(iconName, "blinds-horizontal") == 0)
  {
    return &MDI_ICON_ASSET_SLIDER_BLINDS_HORIZONTAL;
  }
  if (strcmp(iconName, "water-percent") == 0)
  {
    return &MDI_ICON_ASSET_SLIDER_WATER_PERCENT;
  }
  if (strcmp(iconName, "thermometer") == 0)
  {
    return &MDI_ICON_ASSET_SLIDER_THERMOMETER;
  }
  if (strcmp(iconName, "air-humidifier") == 0)
  {
    return &MDI_ICON_ASSET_SLIDER_AIR_HUMIDIFIER;
  }
  if (strcmp(iconName, "brightness-6") == 0)
  {
    return &MDI_ICON_ASSET_SLIDER_BRIGHTNESS_6;
  }
#else
  (void)iconName;
#endif
  return nullptr;
}

static void drawChevronButton(const BB_RECT &rect, bool left)
{
#if UI_MDI_ICONS_AVAILABLE
  drawMdiMonoIconCentered(rect, left ? &MDI_ICON_ASSET_CHEVRON_LEFT : &MDI_ICON_ASSET_CHEVRON_RIGHT);
#else
  const int midY = rect.y + (rect.h / 2);
  const int innerLeft = rect.x + 8;
  const int innerRight = rect.x + rect.w - 8;
  if (left)
  {
    drawBoldLine(innerRight, midY - 9, innerLeft, midY, 3);
    drawBoldLine(innerLeft, midY, innerRight, midY + 9, 3);
  }
  else
  {
    drawBoldLine(innerLeft, midY - 9, innerRight, midY, 3);
    drawBoldLine(innerRight, midY, innerLeft, midY + 9, 3);
  }
#endif
}

static void drawMiniChevron(const BB_RECT &rect, bool up)
{
  drawMdiMonoIconCentered(rect, up ? &MDI_ICON_ASSET_CHEVRON_UP : &MDI_ICON_ASSET_CHEVRON_DOWN);
}

static void drawPageDots()
{
  if (!showPageChrome())
  {
    return;
  }
  const int totalWidth = (UI_PAGE_COUNT * 16) - 8;
  const int startX = (display.width() - totalWidth) / 2;
  const int y = display.height() - 44;

  for (int i = 0; i < UI_PAGE_COUNT; i++)
  {
    const int dotX = startX + (i * 16);
    if (i == currentPageIndex)
    {
      display.fillCircle(dotX, y, 5, uiMonoInk());
    }
    else
    {
      display.drawCircle(dotX, y, 4, uiMonoInk());
    }
  }
}

static void drawWidgetCardBase(const BB_RECT &rect)
{
  if (uiThemeDark())
  {
    display.fillRoundRect(rect.x, rect.y, rect.w, rect.h, 22, uiMonoPaper());
  }
  else
  {
    fillDitherRoundRect(rect.x, rect.y, rect.w, rect.h, 22, 0);
  }
  display.drawRoundRect(rect.x, rect.y, rect.w, rect.h, 22, uiMonoInk());
}

#include "ui/widget_layout.inc"
#include "ui/widgets/clock_widget.inc"

static const WeatherIconAsset *getWeatherIconAsset(const char *condition)
{
  if (condition == nullptr)
  {
    return &WEATHER_ICON_ASSET_CLOUDY;
  }
  if (strstr(condition, "Clear") != nullptr)
  {
    return &WEATHER_ICON_ASSET_CLEAR_DAY;
  }
  if (strstr(condition, "Wind") != nullptr)
  {
    return &WEATHER_ICON_ASSET_WIND;
  }
  if (strstr(condition, "Light rain") != nullptr || strstr(condition, "Drizzle") != nullptr)
  {
    return &WEATHER_ICON_ASSET_DRIZZLE;
  }
  if (strstr(condition, "Rain") != nullptr || strstr(condition, "rain") != nullptr)
  {
    return &WEATHER_ICON_ASSET_RAIN;
  }
  return &WEATHER_ICON_ASSET_CLOUDY;
}

static bool shouldDrawBlackFromGray(uint8_t gray, int x, int y)
{
  static const uint8_t bayer4x4[4][4] = {
      {0, 8, 2, 10},
      {12, 4, 14, 6},
      {3, 11, 1, 9},
      {15, 7, 13, 5},
  };
  const uint8_t adjustedGray = gray > 2 ? gray - 2 : 0;
  return adjustedGray < bayer4x4[y & 3][x & 3];
}

static void drawWeatherMeteocon(const BB_RECT &rect, const char *condition)
{
  const WeatherIconAsset *icon = getWeatherIconAsset(condition);
  if (icon == nullptr)
  {
    return;
  }

  const int iconX = rect.x + ((rect.w - icon->width) / 2);
  const int iconY = rect.y + ((rect.h - icon->height) / 2);
  const int pitch = (icon->width + 1) / 2;

  fillDitherRoundRect(rect.x, rect.y, rect.w, rect.h, 14, 0);
  // display.drawRoundRect(rect.x, rect.y, rect.w, rect.h, 14, BBEP_BLACK);

  for (int yy = 0; yy < (int)icon->height; yy++)
  {
    for (int xx = 0; xx < (int)icon->width; xx++)
    {
      const uint8_t packed = pgm_read_byte(icon->pixels + (yy * pitch) + (xx / 2));
      const uint8_t gray = (xx & 1) == 0 ? ((packed >> 4) & 0x0F) : (packed & 0x0F);
      display.drawPixelFast(iconX + xx, iconY + yy, shouldDrawBlackFromGray(gray, xx, yy) ? uiMonoInk() : uiMonoPaper());
    }
  }
}

static void drawWeatherMeteoconMonoRaw(const BB_RECT &rect, const char *condition)
{
  const WeatherIconAsset *icon = getWeatherIconAsset(condition);
  if (icon == nullptr || rect.w <= 0 || rect.h <= 0)
  {
    return;
  }

  const int pitch = (icon->width + 1) / 2;
  for (int yy = 0; yy < rect.h; yy++)
  {
    const int destY = rect.y + yy;
    if (destY < 0 || destY >= display.height())
    {
      continue;
    }
    const int srcY = (yy * icon->height) / rect.h;
    for (int xx = 0; xx < rect.w; xx++)
    {
      const int destX = rect.x + xx;
      if (destX < 0 || destX >= display.width())
      {
        continue;
      }
      const int srcX = (xx * icon->width) / rect.w;
      const uint8_t packed = pgm_read_byte(icon->pixels + (srcY * pitch) + (srcX / 2));
      const uint8_t gray = (srcX & 1) == 0 ? ((packed >> 4) & 0x0F) : (packed & 0x0F);
      display.drawPixelFast(destX, destY, shouldDrawBlackFromGray(gray, destX, destY) ? uiMonoInk() : uiMonoPaper());
    }
  }
}

static void drawWeatherMeteocon4bpp(const BB_RECT &rect, const char *condition, uint8_t backgroundShade)
{
  const WeatherIconAsset *icon = getWeatherIconAsset(condition);
  if (icon == nullptr)
  {
    return;
  }

  display.fillRoundRect(rect.x, rect.y, rect.w, rect.h, 16, uiGrayValue(backgroundShade));
  display.drawRoundRect(rect.x, rect.y, rect.w, rect.h, 16, uiGrayValue(1));

  const int pitch = (icon->width + 1) / 2;
  const int innerPad = rect.w >= 120 ? 10 : 6;
  const int targetSize = clampInt((rect.w < rect.h ? rect.w : rect.h) - (innerPad * 2), 24, rect.w < rect.h ? rect.w : rect.h);
  const int targetW = targetSize;
  const int targetH = targetSize;
  const int iconX = rect.x + ((rect.w - targetW) / 2);
  const int iconY = rect.y + ((rect.h - targetH) / 2);

  for (int yy = 0; yy < targetH; yy++)
  {
    const int srcY = (yy * icon->height) / targetH;
    for (int xx = 0; xx < targetW; xx++)
    {
      const int srcX = (xx * icon->width) / targetW;
      const uint8_t packed = pgm_read_byte(icon->pixels + (srcY * pitch) + (srcX / 2));
      const uint8_t gray = (srcX & 1) == 0 ? ((packed >> 4) & 0x0F) : (packed & 0x0F);
      if (gray >= 15)
      {
        continue;
      }
      uint8_t mappedGray = gray > 3 ? gray - 3 : 0;
      if (mappedGray > 13)
      {
        mappedGray = 13;
      }
      display.drawPixelFast(iconX + xx, iconY + yy, uiGrayValue(mappedGray));
    }
  }
}

static void drawWeatherMeteocon4bppRaw(const BB_RECT &rect, const char *condition)
{
  const WeatherIconAsset *icon = getWeatherIconAsset(condition);
  if (icon == nullptr || rect.w <= 0 || rect.h <= 0)
  {
    return;
  }

  const int pitch = (icon->width + 1) / 2;
  for (int yy = 0; yy < rect.h; yy++)
  {
    const int destY = rect.y + yy;
    if (destY < 0 || destY >= display.height())
    {
      continue;
    }
    const int srcY = (yy * icon->height) / rect.h;
    for (int xx = 0; xx < rect.w; xx++)
    {
      const int destX = rect.x + xx;
      if (destX < 0 || destX >= display.width())
      {
        continue;
      }
      const int srcX = (xx * icon->width) / rect.w;
      const uint8_t packed = pgm_read_byte(icon->pixels + (srcY * pitch) + (srcX / 2));
      const uint8_t gray = (srcX & 1) == 0 ? ((packed >> 4) & 0x0F) : (packed & 0x0F);
      if (gray >= 15)
      {
        continue;
      }
      uint8_t mappedGray = gray > 2 ? gray - 2 : 0;
      if (mappedGray > 12)
      {
        mappedGray = 12;
      }
      display.drawPixelFast(destX, destY, uiGrayValue(mappedGray));
    }
  }
}

#include "ui/pages/media_player_page.inc"
#include "ui/pages/weather_focus_page.inc"

static void drawWeatherIcon(const BB_RECT &rect, const char *condition)
{
#if UI_MDI_ICONS_AVAILABLE
  const MdiMonoIconAsset *icon = getMdiWeatherIconAsset(condition);
  if (icon != nullptr)
  {
    drawMdiMonoIconCentered(rect, icon);
    return;
  }
#endif
  const int iconX = rect.x;
  const int iconY = rect.y;
  const int iconW = rect.w;
  const int iconH = rect.h;
  const int radius = iconH / 5;
  fillDitherRoundRect(iconX, iconY, iconW, iconH, radius, 1);
  display.drawRoundRect(iconX, iconY, iconW, iconH, radius, uiMonoInk());

  const bool rainy = strstr(condition, "rain") != nullptr || strstr(condition, "Rain") != nullptr;
  const bool clear = strstr(condition, "Clear") != nullptr;

  if (clear)
  {
    const int cx = iconX + (iconW / 2);
    const int cy = iconY + (iconH / 2);
    const int sunR = iconH / 5;
    display.fillCircle(cx, cy, sunR, uiMonoPaper());
    display.drawCircle(cx, cy, sunR, uiMonoInk());
    display.drawLine(cx - sunR - 8, cy, cx - sunR - 2, cy, uiMonoInk());
    display.drawLine(cx + sunR + 2, cy, cx + sunR + 8, cy, uiMonoInk());
    display.drawLine(cx, cy - sunR - 8, cx, cy - sunR - 2, uiMonoInk());
    display.drawLine(cx, cy + sunR + 2, cx, cy + sunR + 8, uiMonoInk());
    return;
  }

  const int cloudY = iconY + (iconH / 2) - 8;
  display.fillCircle(iconX + 24, cloudY + 10, 11, uiMonoPaper());
  display.fillCircle(iconX + 39, cloudY + 6, 14, uiMonoPaper());
  display.fillCircle(iconX + 56, cloudY + 11, 11, uiMonoPaper());
  display.fillRect(iconX + 22, cloudY + 12, 40, 14, uiMonoPaper());
  display.drawCircle(iconX + 24, cloudY + 10, 11, uiMonoInk());
  display.drawCircle(iconX + 39, cloudY + 6, 14, uiMonoInk());
  display.drawCircle(iconX + 56, cloudY + 11, 11, uiMonoInk());
  display.drawLine(iconX + 21, cloudY + 26, iconX + 63, cloudY + 26, uiMonoInk());

  if (rainy)
  {
    display.drawLine(iconX + 28, cloudY + 32, iconX + 25, cloudY + 40, uiMonoInk());
    display.drawLine(iconX + 40, cloudY + 32, iconX + 37, cloudY + 40, uiMonoInk());
    display.drawLine(iconX + 52, cloudY + 32, iconX + 49, cloudY + 40, uiMonoInk());
  }
}

#include "ui/widgets/progress_widget.inc"
#include "ui/widgets/slider_widget.inc"
#include "ui/widgets/weather_widget.inc"
#include "ui/widgets/switch_widget.inc"
#include "ui/widgets/thermostat_widget.inc"
#include "ui/widgets/widget_dispatch.inc"

static void renderActivePage(bool pageTransition = false)
{
  if (!displayReady)
  {
    return;
  }

  layoutCurrentPage();
  if (pageTransition)
  {
    display.clearWhite(true);
  }

  if (activePageIsMediaPlayer())
  {
    display.setMode(BB_MODE_4BPP);
    setThemeGrayText();
    display.fillScreen(uiGrayPaper());

    if (showPageChrome())
    {
      const void *pageTitleFont = getUiPageTitleFont();
      if (pageTitleFont != nullptr)
      {
        drawCenteredCustomTextAtTopAA(pageTitleFont, UI_PAGES[currentPageIndex].name, 24);
      }
      else
      {
        drawCenteredTextRoleAtTop(UI_PAGES[currentPageIndex].name, 24, UI_TEXT_META, true);
      }
    }

    drawMediaPlayerBody();
    if (showPageChrome())
    {
      drawChevronButton(navLeftRect, true);
      drawChevronButton(navRightRect, false);
      drawPageDots();
    }
  }
  else
  {
    display.setMode(BB_MODE_1BPP);
    setThemeMonoText();
    display.fillScreen(uiMonoPaper());

    if (showPageChrome())
    {
      const void *pageTitleFont = getUiPageTitleFont();
      if (pageTitleFont != nullptr)
      {
        drawCenteredCustomTextAtTop(pageTitleFont, UI_PAGES[currentPageIndex].name, 26);
      }
      else
      {
        drawCenteredTextRoleAtTop(UI_PAGES[currentPageIndex].name, 26, UI_TEXT_META, false);
      }
    }

    if (activePageIsWeatherFocus())
    {
      drawWeatherFocusBody();
    }
    else
    {
      for (int widgetIndex = 0; widgetIndex < UI_PAGES[currentPageIndex].widgetCount; widgetIndex++)
      {
        drawWidgetByType(widgetIndex, false);
      }
    }

    if (showPageChrome())
    {
      drawChevronButton(navLeftRect, true);
      drawChevronButton(navRightRect, false);
      drawPageDots();
    }
  }

  char initialIpText[40];
  buildDebugIpText(initialIpText, sizeof(initialIpText));
  drawDebugIpText(initialIpText, false);
  snprintf(lastDebugIp, sizeof(lastDebugIp), "%s", initialIpText);

#ifdef CLEAR_FAST
  display.fullUpdate(CLEAR_FAST, false);
#else
  display.fullUpdate(1, false);
#endif

  display.backupPlane();
  partialCounter = 0;
  lastPartialRefresh = millis();
  pageReady = true;
  lastFullRefreshMs = millis();
}

static bool getPrimarySwitchLocation(int &pageIndexOut, int &widgetIndexOut)
{
  for (int pageIndex = 0; pageIndex < UI_PAGE_COUNT; pageIndex++)
  {
    for (int widgetIndex = 0; widgetIndex < UI_PAGES[pageIndex].widgetCount; widgetIndex++)
    {
      if (getWidgetConfig(pageIndex, widgetIndex).type == UI_WIDGET_SWITCH)
      {
        pageIndexOut = pageIndex;
        widgetIndexOut = widgetIndex;
        return true;
      }
    }
  }
  return false;
}

static bool getPrimarySwitchState(bool &enabledOut)
{
  int pageIndex = 0;
  int widgetIndex = 0;
  if (!getPrimarySwitchLocation(pageIndex, widgetIndex))
  {
    return false;
  }
  enabledOut = getWidgetState(pageIndex, widgetIndex).enabled;
  return true;
}

static bool setPrimarySwitchState(bool enabled, bool redraw)
{
  int pageIndex = 0;
  int widgetIndex = 0;
  if (!getPrimarySwitchLocation(pageIndex, widgetIndex))
  {
    return false;
  }
  WidgetRuntimeState &state = getWidgetState(pageIndex, widgetIndex);
  state.enabled = enabled;
  if (redraw && displayReady && pageReady && pageIndex == currentPageIndex)
  {
    drawSwitchWidget(widgetIndex, true);
  }
  return true;
}

static void pollTouchInput()
{
#if CAPTOUCH_AVAILABLE
  if (!touchReady || !displayReady || !pageReady)
  {
    return;
  }

  TOUCHINFO ti;
  capTouch.getSamples(&ti);
  const bool isPressed = ti.count > 0;

  if (isPressed && !touchPressed)
  {
    touchPressed = true;
    const int rawX = ti.x[0];
    const int rawY = ti.y[0];
    const int w = display.width();
    const int h = display.height();
    const uint32_t now = millis();

    const int mappedPoints[6][2] = {
        {rawX, rawY},
        {w - 1 - rawY, rawX},
        {w - 1 - rawX, h - 1 - rawY},
        {rawY, h - 1 - rawX},
        {w - 1 - rawX, rawY},
        {rawX, h - 1 - rawY},
    };
    const char *mappedNames[6] = {"RAW", "ROT90", "ROT180", "ROT270", "MIRROR_X", "MIRROR_Y"};

    for (int i = 0; i < 6; i++)
    {
      const int tx = mappedPoints[i][0];
      const int ty = mappedPoints[i][1];
      if (tx < -32 || ty < -32 || tx > w + 32 || ty > h + 32)
      {
        continue;
      }

      if (now - lastTouchActionMs <= 250)
      {
        return;
      }

      if (isPointInRectExpanded(tx, ty, navLeftRect, 8))
      {
        lastTouchActionMs = now;
        currentPageIndex = (currentPageIndex - 1 + UI_PAGE_COUNT) % UI_PAGE_COUNT;
        renderActivePage(true);
        Serial.printf("PAGE_SWITCH DIR=LEFT MAP=%s RAW=%d,%d XY=%d,%d\n", mappedNames[i], rawX, rawY, tx, ty);
        return;
      }

      if (isPointInRectExpanded(tx, ty, navRightRect, 8))
      {
        lastTouchActionMs = now;
        currentPageIndex = (currentPageIndex + 1) % UI_PAGE_COUNT;
        renderActivePage(true);
        Serial.printf("PAGE_SWITCH DIR=RIGHT MAP=%s RAW=%d,%d XY=%d,%d\n", mappedNames[i], rawX, rawY, tx, ty);
        return;
      }

      for (int widgetIndex = 0; widgetIndex < UI_PAGES[currentPageIndex].widgetCount; widgetIndex++)
      {
        const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
        WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);

        if (widget.type == UI_WIDGET_SWITCH && isPointInRectExpanded(tx, ty, state.cardRect, 10))
        {
          lastTouchActionMs = now;
          state.enabled = !state.enabled;
          drawSwitchWidget(widgetIndex, true);
          Serial.printf(
              "SWITCH_TOUCH VALUE=%d MAP=%s RAW=%d,%d XY=%d,%d\n",
              state.enabled ? 1 : 0,
              mappedNames[i],
              rawX,
              rawY,
              tx,
              ty);
          return;
        }

        if (widget.type == UI_WIDGET_SLIDER && isPointInRectExpanded(tx, ty, state.controlRect, 14))
        {
          lastTouchActionMs = now;
          state.value = sliderValueFromTouch(state, tx);
          drawSliderWidget(widgetIndex, true);
          Serial.printf(
              "SLIDER_TOUCH VALUE=%d MAP=%s RAW=%d,%d XY=%d,%d\n",
              state.value,
              mappedNames[i],
              rawX,
              rawY,
              tx,
              ty);
          return;
        }

        if (widget.type == UI_WIDGET_THERMOSTAT)
        {
          const int maxTemp = widget.maxValue > 0 ? widget.maxValue : 300;
          if (isPointInRectExpanded(tx, ty, state.controlRect, 10))
          {
            lastTouchActionMs = now;
            state.value = clampInt(state.value + 5, 120, maxTemp);
            drawThermostatWidget(widgetIndex, true);
            Serial.printf(
                "THERMOSTAT_TOUCH ACTION=INCREASE VALUE=%.1f MAP=%s RAW=%d,%d XY=%d,%d\n",
                state.value / 10.0f,
                mappedNames[i],
                rawX,
                rawY,
                tx,
                ty);
            return;
          }

          if (isPointInRectExpanded(tx, ty, state.secondaryRect, 10))
          {
            lastTouchActionMs = now;
            state.value = clampInt(state.value - 5, 120, maxTemp);
            drawThermostatWidget(widgetIndex, true);
            Serial.printf(
                "THERMOSTAT_TOUCH ACTION=DECREASE VALUE=%.1f MAP=%s RAW=%d,%d XY=%d,%d\n",
                state.value / 10.0f,
                mappedNames[i],
                rawX,
                rawY,
                tx,
                ty);
            return;
          }
        }
      }
    }

    Serial.printf("TOUCH_MISS RAW=%d,%d\n", rawX, rawY);
  }
  else if (!isPressed)
  {
    touchPressed = false;
  }
#endif
}

static void runDisplayLoop()
{
  if (!displayReady)
  {
    return;
  }

  if (!pageReady)
  {
    renderActivePage();
    return;
  }

  configureNtpIfNeeded();
  pollTouchInput();

  if (FULL_REFRESH_EVERY_N_PARTIALS_OVERRIDE > 0 &&
      millis() - lastFullRefreshMs >= (uint32_t)FULL_REFRESH_EVERY_N_PARTIALS_OVERRIDE * 1000UL)
  {
    renderActivePage();
    return;
  }

  char currentDebugIp[40];
  buildDebugIpText(currentDebugIp, sizeof(currentDebugIp));
  const uint32_t nowMs = millis();
  if (activePageIsWeatherFocus())
  {
    bool rerenderWeatherPage = false;
    if (strcmp(currentDebugIp, lastDebugIp) != 0)
    {
      snprintf(lastDebugIp, sizeof(lastDebugIp), "%s", currentDebugIp);
      rerenderWeatherPage = true;
    }
    if (nowMs - lastWeatherUpdateMs >= 15000)
    {
      lastWeatherUpdateMs = nowMs;
      const int frameCount = (int)(sizeof(WEATHER_FRAMES) / sizeof(WEATHER_FRAMES[0]));
      weatherPagePhases[currentPageIndex] = (weatherPagePhases[currentPageIndex] + 1) % frameCount;
      rerenderWeatherPage = true;
    }
    if (rerenderWeatherPage)
    {
      renderActivePage();
    }
    return;
  }

  if (activePageIsMediaPlayer())
  {
    if (strcmp(currentDebugIp, lastDebugIp) != 0)
    {
      drawDebugIpText(currentDebugIp, true);
      snprintf(lastDebugIp, sizeof(lastDebugIp), "%s", currentDebugIp);
    }
    return;
  }

  if (strcmp(currentDebugIp, lastDebugIp) != 0)
  {
    drawDebugIpText(currentDebugIp, true);
    snprintf(lastDebugIp, sizeof(lastDebugIp), "%s", currentDebugIp);
  }

  if (nowMs - lastClockUpdateMs >= 250)
  {
    lastClockUpdateMs = nowMs;
    for (int widgetIndex = 0; widgetIndex < UI_PAGES[currentPageIndex].widgetCount; widgetIndex++)
    {
      const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
      if (widget.type != UI_WIDGET_CLOCK)
      {
        continue;
      }

      WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
      char currentClock[16];
      readClockText(widget, currentClock, sizeof(currentClock));
      if (strcmp(currentClock, state.lastClockText) != 0)
      {
        const bool secondsEnabled = clockWidgetShowsSeconds(widget);
        const bool minuteChanged = strncmp(currentClock, state.lastClockText, 5) != 0;
        if (clockWidgetIsAnalog(widget) || !secondsEnabled || minuteChanged)
        {
          drawClockWidget(widgetIndex, true);
        }
        else
        {
          drawClockSecondsPartial(widgetIndex, currentClock);
          snprintf(state.lastClockText, sizeof(state.lastClockText), "%s", currentClock);
        }
      }
    }
  }

  if (nowMs - lastValueUpdateMs >= 5000)
  {
    lastValueUpdateMs = nowMs;
    for (int widgetIndex = 0; widgetIndex < UI_PAGES[currentPageIndex].widgetCount; widgetIndex++)
    {
      const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
      WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);

      if (widget.type == UI_WIDGET_PROGRESS)
      {
        state.value += 5;
        if (state.value > state.maxValue)
        {
          state.value = 0;
        }
        drawProgressWidget(widgetIndex, true);
      }
      else if (widget.type == UI_WIDGET_SLIDER)
      {
        state.value += state.direction * 4;
        if (state.value >= state.maxValue)
        {
          state.value = state.maxValue;
          state.direction = -1;
        }
        else if (state.value <= 0)
        {
          state.value = 0;
          state.direction = 1;
        }
        drawSliderWidget(widgetIndex, true);
      }
    }
  }

  if (nowMs - lastWeatherUpdateMs >= 15000)
  {
    lastWeatherUpdateMs = nowMs;
    for (int widgetIndex = 0; widgetIndex < UI_PAGES[currentPageIndex].widgetCount; widgetIndex++)
    {
      const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
      if (widget.type != UI_WIDGET_WEATHER)
      {
        continue;
      }
      WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
      state.phase = (state.phase + 1) % (int)(sizeof(WEATHER_FRAMES) / sizeof(WEATHER_FRAMES[0]));
      drawWeatherWidget(widgetIndex, true);
    }
  }
}

static void setupTouch()
{
#if CAPTOUCH_AVAILABLE
  const int rc = capTouch.init(TOUCH_SDA, TOUCH_SCL, TOUCH_RST, TOUCH_INT);
#ifdef CT_SUCCESS
  if (rc == CT_SUCCESS)
  {
    touchReady = true;
    Serial.println("TOUCH_READY");
  }
  else
  {
    Serial.printf("TOUCH_INIT_FAILED rc=%d\n", rc);
  }
#else
  touchReady = rc == 0;
  if (touchReady)
  {
    Serial.println("TOUCH_READY");
  }
  else
  {
    Serial.printf("TOUCH_INIT_FAILED rc=%d\n", rc);
  }
#endif
#else
  Serial.println("TOUCH_NOT_AVAILABLE");
#endif
}

static void setupDisplay()
{
  if (display.initPanel(BB_PANEL_M5PAPERS3) == 0)
  {
    displayReady = true;
    display.setMode(BB_MODE_1BPP);
    display.setPasses(5, 7);
    display.setRotation(90);
    setupTouch();
    initializeWidgetStates();
    display.clearWhite(true);
    if (UI_PAGE_COUNT > 0)
    {
      renderActivePage();
    }
    else
    {
      renderStatusScreen("Successful.");
    }
    Serial.println("FastEPD initialized for M5PaperS3.");
  }
  else
  {
    Serial.println("FastEPD init failed for M5PaperS3 (check PSRAM/board settings).");
  }
}
#endif

struct WifiCredentials
{
  String ssid;
  String password;
  bool valid;
};

static WifiCredentials currentCredentials = {"", "", false};
static bool otaUploadHadError = false;
static String otaUploadErrorMessage = "";
static bool otaUploadStarted = false;
static bool otaUploadFinished = false;
static size_t otaUploadBytes = 0;

static void renderStatusScreen(const char *title, const char *line1, const char *line2)
{
#if FASTEPD_AVAILABLE
  if (!displayReady)
  {
    return;
  }

  display.setMode(BB_MODE_1BPP);
  display.fillScreen(uiMonoPaper());
  setThemeMonoText();

  const char *lines[3] = {title, line1, line2};
  int visibleLines = 0;
  for (int i = 0; i < 3; i++)
  {
    if (lines[i][0] != '\0')
    {
      visibleLines++;
    }
  }

  display.setFont(FONT_12x16);
  const int lineHeight = 24;
  const int startY = (display.height() - (visibleLines * lineHeight)) / 2;
  int lineIndex = 0;
  for (int i = 0; i < 3; i++)
  {
    if (lines[i][0] == '\0')
    {
      continue;
    }
    const int x = centeredX(lines[i]);
    const int y = startY + (lineIndex * lineHeight);
    drawReadableLine(lines[i], x, y);
    lineIndex++;
  }

#ifdef CLEAR_NONE
  display.fullUpdate(CLEAR_NONE, false);
#else
  display.fullUpdate(0, false, nullptr);
#endif
#else
  (void)title;
  (void)line1;
  (void)line2;
#endif
}

static String extractJsonString(const String &json, const char *key)
{
  const String keyPattern = String("\"") + key + "\"";
  const int keyPos = json.indexOf(keyPattern);
  if (keyPos < 0)
  {
    return "";
  }

  const int colonPos = json.indexOf(':', keyPos + keyPattern.length());
  if (colonPos < 0)
  {
    return "";
  }

  const int valueStart = json.indexOf('"', colonPos + 1);
  if (valueStart < 0)
  {
    return "";
  }

  int valueEnd = valueStart + 1;
  bool escaped = false;
  while (valueEnd < json.length())
  {
    const char ch = json[valueEnd];
    if (ch == '\\' && !escaped)
    {
      escaped = true;
      valueEnd++;
      continue;
    }
    if (ch == '"' && !escaped)
    {
      break;
    }
    escaped = false;
    valueEnd++;
  }

  if (valueEnd >= json.length())
  {
    return "";
  }

  String parsed = json.substring(valueStart + 1, valueEnd);
  parsed.replace("\\/", "/");
  parsed.replace("\\\"", "\"");
  parsed.replace("\\\\", "\\");
  return parsed;
}

static bool performOtaFromUrl(const String &firmwareUrl, String &errorOut)
{
  if (WiFi.status() != WL_CONNECTED)
  {
    errorOut = "WIFI_NOT_CONNECTED";
    return false;
  }

  WiFiClient client;
  HTTPClient http;
  http.setTimeout(15000);
  if (!http.begin(client, firmwareUrl))
  {
    errorOut = "HTTP_BEGIN_FAILED";
    return false;
  }

  const int statusCode = http.GET();
  if (statusCode != HTTP_CODE_OK)
  {
    errorOut = String("HTTP_") + statusCode;
    http.end();
    return false;
  }

  int contentLength = http.getSize();
  if (contentLength <= 0)
  {
    contentLength = UPDATE_SIZE_UNKNOWN;
  }

  if (!Update.begin(static_cast<size_t>(contentLength)))
  {
    errorOut = String("UPDATE_BEGIN_") + Update.getError();
    http.end();
    return false;
  }

  WiFiClient *stream = http.getStreamPtr();
  uint8_t buffer[1024];
  size_t writtenTotal = 0;
  uint32_t lastProgressLog = 0;
  uint32_t lastDataMs = millis();
  constexpr uint32_t otaDataTimeoutMs = 15000;

  while (http.connected() && (contentLength == UPDATE_SIZE_UNKNOWN || writtenTotal < static_cast<size_t>(contentLength)))
  {
    const size_t available = stream->available();
    if (available == 0)
    {
      if (millis() - lastDataMs > otaDataTimeoutMs)
      {
        errorOut = "OTA_STREAM_TIMEOUT";
        Update.abort();
        http.end();
        return false;
      }
      delay(1);
      continue;
    }

    const size_t toRead = available > sizeof(buffer) ? sizeof(buffer) : available;
    const size_t readLen = stream->readBytes(buffer, toRead);
    if (readLen == 0)
    {
      delay(1);
      continue;
    }
    lastDataMs = millis();

    const size_t written = Update.write(buffer, readLen);
    if (written != readLen)
    {
      errorOut = String("UPDATE_WRITE_") + Update.getError();
      Update.abort();
      http.end();
      return false;
    }
    writtenTotal += written;

    if (contentLength != UPDATE_SIZE_UNKNOWN && millis() - lastProgressLog > 1000)
    {
      const int percent = static_cast<int>((writtenTotal * 100U) / static_cast<size_t>(contentLength));
      Serial.printf("OTA_PROGRESS=%d\n", percent);
      lastProgressLog = millis();
    }
  }

  if (!Update.end())
  {
    errorOut = String("UPDATE_END_") + Update.getError();
    http.end();
    return false;
  }

  if (!Update.isFinished())
  {
    errorOut = "UPDATE_INCOMPLETE";
    http.end();
    return false;
  }

  http.end();
  return true;
}

void handleHealth()
{
  String payload = "{\"ok\":true,\"wifiConnected\":";
  payload += WiFi.status() == WL_CONNECTED ? "true" : "false";
  payload += ",\"ip\":\"";
  payload += WiFi.localIP().toString();
  payload += "\"}";
  server.send(200, "application/json", payload);
}

void handleRoot()
{
  String html = "<!doctype html><html><head><meta charset=\"utf-8\">";
  html += "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">";
  html += "<title>M5PaperS3</title>";
  html += "<style>body{font-family:system-ui,sans-serif;background:#f5f5f4;color:#18181b;padding:24px;}";
  html += ".card{max-width:520px;margin:0 auto;background:#fff;border:1px solid #d4d4d8;border-radius:18px;padding:24px;}";
  html += "code{background:#f4f4f5;padding:2px 6px;border-radius:6px;}p{line-height:1.5;}</style></head><body>";
  html += "<div class=\"card\"><h1>M5PaperS3 is online</h1>";
  html += "<p>Use this IP in the web app to save the device for OTA updates.</p>";
  html += "<p><strong>IP:</strong> <code>";
  html += WiFi.localIP().toString();
  html += "</code></p><p><strong>Firmware:</strong> ";
  html += FIRMWARE_DISPLAY_NAME;
  html += "</p><p><strong>Version:</strong> ";
  html += FIRMWARE_VERSION_NAME;
  html += "</p></div></body></html>";
  server.send(200, "text/html", html);
}

void handleOtaRequest()
{
  String firmwareUrl = "";
  if (server.hasArg("plain"))
  {
    firmwareUrl = extractJsonString(server.arg("plain"), "firmwareUrl");
  }
  if (firmwareUrl.length() == 0 && server.hasArg("firmwareUrl"))
  {
    firmwareUrl = server.arg("firmwareUrl");
  }
  firmwareUrl.trim();

  if (firmwareUrl.length() == 0)
  {
    server.send(400, "application/json", "{\"ok\":false,\"error\":\"missing firmwareUrl\"}");
    return;
  }

  Serial.printf("OTA_START URL=%s\n", firmwareUrl.c_str());
  renderStatusScreen("OTA update", "Downloading...");

  String otaError;
  const bool otaOk = performOtaFromUrl(firmwareUrl, otaError);
  if (!otaOk)
  {
    Serial.printf("OTA_FAILED %s\n", otaError.c_str());
    renderStatusScreen("OTA failed", otaError.c_str());
    String payload = "{\"ok\":false,\"error\":\"";
    payload += otaError;
    payload += "\"}";
    server.send(500, "application/json", payload);
    return;
  }

  Serial.println("OTA_SUCCESS");
  server.send(200, "application/json", "{\"ok\":true,\"rebooting\":true}");
  delay(350);
  renderStatusScreen("OTA complete", "Rebooting...");
  delay(700);
  ESP.restart();
}

void handleOtaUploadData()
{
  HTTPUpload &upload = server.upload();

  if (upload.status == UPLOAD_FILE_START)
  {
    otaUploadHadError = false;
    otaUploadErrorMessage = "";
    otaUploadStarted = true;
    otaUploadFinished = false;
    otaUploadBytes = 0;
    Serial.printf("OTA_UPLOAD_START NAME=%s SIZE=%d\n", upload.filename.c_str(), upload.totalSize);
    renderStatusScreen("OTA update", "Uploading...");
    if (!Update.begin(UPDATE_SIZE_UNKNOWN))
    {
      otaUploadHadError = true;
      otaUploadErrorMessage = String("UPDATE_BEGIN_") + Update.getError();
    }
    return;
  }

  if (upload.status == UPLOAD_FILE_WRITE)
  {
    if (otaUploadHadError)
    {
      return;
    }
    const size_t written = Update.write(upload.buf, upload.currentSize);
    if (written != upload.currentSize)
    {
      otaUploadHadError = true;
      otaUploadErrorMessage = String("UPDATE_WRITE_") + Update.getError();
    }
    otaUploadBytes += written;
    return;
  }

  if (upload.status == UPLOAD_FILE_END)
  {
    if (otaUploadHadError)
    {
      Update.abort();
      return;
    }
    if (!Update.end(true))
    {
      otaUploadHadError = true;
      otaUploadErrorMessage = String("UPDATE_END_") + Update.getError();
      return;
    }
    if (!Update.isFinished())
    {
      otaUploadHadError = true;
      otaUploadErrorMessage = "UPDATE_INCOMPLETE";
      return;
    }
    otaUploadFinished = true;
    Serial.println("OTA_UPLOAD_SUCCESS");
    return;
  }

  if (upload.status == UPLOAD_FILE_ABORTED)
  {
    otaUploadHadError = true;
    otaUploadErrorMessage = "UPLOAD_ABORTED";
    otaUploadFinished = false;
    Update.abort();
    Serial.println("OTA_UPLOAD_ABORTED");
  }
}

void handleOtaUploadRequest()
{
  if (!otaUploadStarted || !otaUploadFinished || otaUploadBytes == 0)
  {
    const String noDataError = "UPLOAD_NO_DATA";
    Serial.printf("OTA_UPLOAD_FAILED %s\n", noDataError.c_str());
    renderStatusScreen("OTA failed", "No upload data");
    server.send(400, "application/json", "{\"ok\":false,\"error\":\"UPLOAD_NO_DATA\"}");
    return;
  }

  if (otaUploadHadError)
  {
    Serial.printf("OTA_UPLOAD_FAILED %s\n", otaUploadErrorMessage.c_str());
    renderStatusScreen("OTA failed", otaUploadErrorMessage.c_str());
    String payload = "{\"ok\":false,\"error\":\"";
    payload += otaUploadErrorMessage;
    payload += "\"}";
    server.send(500, "application/json", payload);
    return;
  }

  server.send(200, "application/json", "{\"ok\":true,\"rebooting\":true}");
  delay(300);
  renderStatusScreen("OTA complete", "Rebooting...");
  delay(700);
  ESP.restart();
}

void handleAutomationSwitchState()
{
  String payload = "{\"enabled\":";
  bool enabled = false;
  if (getPrimarySwitchState(enabled))
  {
    payload += enabled ? "true" : "false";
  }
  else
  {
    payload += "false";
  }
  payload += "}";
  server.send(200, "application/json", payload);
}

void handleAutomationSwitchSet()
{
  bool currentEnabled = false;
  const bool hasSwitch = getPrimarySwitchState(currentEnabled);
  bool nextState = hasSwitch ? !currentEnabled : false;

  if (server.hasArg("enabled"))
  {
    String lowered = server.arg("enabled");
    lowered.toLowerCase();
    nextState = lowered == "1" || lowered == "true" || lowered == "on";
  }

  if (!hasSwitch)
  {
    server.send(404, "application/json", "{\"ok\":false,\"error\":\"NO_SWITCH_WIDGET\"}");
    return;
  }

  if (nextState != currentEnabled)
  {
    setPrimarySwitchState(nextState, true);
    Serial.printf("AUTOMATION_SWITCH=%d\n", nextState ? 1 : 0);
  }

  String payload = "{\"ok\":true,\"enabled\":";
  payload += nextState ? "true" : "false";
  payload += "}";
  server.send(200, "application/json", payload);
}

static WifiCredentials loadCredentials()
{
  WifiCredentials credentials = {"", "", false};

  if (preferences.begin("wifi", false))
  {
    if (preferences.isKey("ssid"))
    {
      credentials.ssid = preferences.getString("ssid", "");
    }
    if (preferences.isKey("password"))
    {
      credentials.password = preferences.getString("password", "");
    }
    preferences.end();
  }
  else
  {
    Serial.println("WIFI_PREFS_UNAVAILABLE");
  }

  if (credentials.ssid.length() > 0)
  {
    credentials.valid = true;
    Serial.println("WIFI_SOURCE=NVS");
    return credentials;
  }

  credentials.ssid = WIFI_SSID_BUILD;
  credentials.password = WIFI_PASSWORD_BUILD;
  credentials.valid = credentials.ssid.length() > 0;
  if (credentials.valid)
  {
    Serial.println("WIFI_SOURCE=WEB_BUILD");
    return credentials;
  }

  credentials.ssid = WIFI_SSID_PIO;
  credentials.password = WIFI_PASSWORD_PIO;
  credentials.valid = credentials.ssid.length() > 0;
  if (credentials.valid)
  {
    Serial.println("WIFI_SOURCE=PIO_ENV");
    return credentials;
  }

  credentials.ssid = WIFI_SSID;
  credentials.password = WIFI_PASSWORD;
  credentials.valid = credentials.ssid.length() > 0;
  if (credentials.valid)
  {
    Serial.println("WIFI_SOURCE=DEVICE_CONFIG");
  }
  return credentials;
}

static void saveCredentials(const String &ssid, const String &password)
{
  if (!preferences.begin("wifi", false))
  {
    Serial.println("WIFI_SAVE_FAILED");
    return;
  }
  preferences.putString("ssid", ssid);
  preferences.putString("password", password);
  preferences.end();
}

static void startServerIfNeeded()
{
  if (!serverStarted && WiFi.status() == WL_CONNECTED)
  {
    server.begin();
    serverStarted = true;
    Serial.println("HTTP_SERVER_STARTED");
  }
}

static String getDeviceNextUrl()
{
  if (WiFi.status() != WL_CONNECTED)
  {
    return "";
  }
  return String("http://") + WiFi.localIP().toString() + "/";
}

static uint8_t getImprovCurrentState()
{
  if (improvProvisioningActive)
  {
    return IMPROV_STATE_PROVISIONING;
  }
  return WiFi.status() == WL_CONNECTED ? IMPROV_STATE_PROVISIONED : IMPROV_STATE_READY;
}

static void clearImprovPacketState()
{
  improvPacketLength = 0;
  improvExpectedLength = 0;
}

static void writeImprovPacket(uint8_t type, const uint8_t *data, size_t dataLength)
{
  const size_t totalLength = 7 + 1 + 1 + dataLength + 1;
  if (totalLength > sizeof(improvPacketBuffer))
  {
    return;
  }

  size_t offset = 0;
  for (size_t i = 0; i < sizeof(IMPROV_HEADER_BYTES); i++)
  {
    improvPacketBuffer[offset++] = IMPROV_HEADER_BYTES[i];
  }
  improvPacketBuffer[offset++] = 0x01;
  improvPacketBuffer[offset++] = type;
  improvPacketBuffer[offset++] = static_cast<uint8_t>(dataLength);
  for (size_t i = 0; i < dataLength; i++)
  {
    improvPacketBuffer[offset++] = data[i];
  }

  uint8_t checksum = 0;
  for (size_t i = 0; i < offset; i++)
  {
    checksum = static_cast<uint8_t>(checksum + improvPacketBuffer[i]);
  }
  improvPacketBuffer[offset++] = checksum;

  Serial.write(improvPacketBuffer, offset);
  Serial.write('\n');
}

static void sendImprovCurrentStatePacket()
{
  const uint8_t payload[1] = {getImprovCurrentState()};
  writeImprovPacket(IMPROV_CURRENT_STATE, payload, sizeof(payload));
}

static void sendImprovErrorPacket(uint8_t error)
{
  const uint8_t payload[1] = {error};
  writeImprovPacket(IMPROV_ERROR_STATE, payload, sizeof(payload));
}

static size_t appendImprovStringField(uint8_t *buffer, size_t offset, size_t capacity, const String &value)
{
  const size_t len = value.length();
  if (len > 255 || offset + 1 + len > capacity)
  {
    return offset;
  }
  buffer[offset++] = static_cast<uint8_t>(len);
  for (size_t i = 0; i < len; i++)
  {
    buffer[offset++] = static_cast<uint8_t>(value[i]);
  }
  return offset;
}

static void sendImprovRpcFields(uint8_t command, const String fields[], size_t fieldCount)
{
  uint8_t payload[220];
  payload[0] = command;
  payload[1] = 0;
  size_t offset = 2;

  for (size_t i = 0; i < fieldCount; i++)
  {
    offset = appendImprovStringField(payload, offset, sizeof(payload), fields[i]);
  }

  payload[1] = static_cast<uint8_t>(offset - 2);
  writeImprovPacket(IMPROV_RPC_RESULT, payload, offset);
}

static void sendImprovInfoPacket()
{
  const String fields[] = {
      String(FIRMWARE_DISPLAY_NAME),
      String(FIRMWARE_VERSION_NAME),
      String("ESP32-S3"),
      String(IMPROV_DEVICE_NAME),
  };
  sendImprovRpcFields(IMPROV_RPC_REQUEST_INFO, fields, 4);
}

static void sendImprovCurrentStateResponse()
{
  sendImprovCurrentStatePacket();
  if (getImprovCurrentState() == IMPROV_STATE_PROVISIONED)
  {
    const String fields[] = {getDeviceNextUrl()};
    sendImprovRpcFields(IMPROV_RPC_REQUEST_CURRENT_STATE, fields, 1);
  }
}

static void sendImprovWifiScanResults()
{
  const int networkCount = WiFi.scanNetworks(false, true);
  if (networkCount < 0)
  {
    sendImprovErrorPacket(IMPROV_ERROR_UNKNOWN_RPC_COMMAND);
    return;
  }

  for (int i = 0; i < networkCount; i++)
  {
    const String fields[] = {
        WiFi.SSID(i),
        String(WiFi.RSSI(i)),
        WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? String("NO") : String("YES"),
    };
    sendImprovRpcFields(IMPROV_RPC_REQUEST_WIFI_NETWORKS, fields, 3);
  }
  WiFi.scanDelete();
  uint8_t payload[2] = {IMPROV_RPC_REQUEST_WIFI_NETWORKS, 0};
  writeImprovPacket(IMPROV_RPC_RESULT, payload, sizeof(payload));
}

static void connectWifi(const WifiCredentials &credentials)
{
  if (!credentials.valid)
  {
    Serial.println("WIFI_MISSING_CREDENTIALS");
    return;
  }

  WiFi.disconnect();
  delay(50);
  WiFi.mode(WIFI_STA);
  WiFi.begin(credentials.ssid.c_str(), credentials.password.c_str());
  Serial.printf("WIFI_CONNECTING SSID=%s\n", credentials.ssid.c_str());
}

static bool waitForWifiOrTimeout(uint32_t timeoutMs)
{
  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs)
  {
    delay(250);
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    const String ip = WiFi.localIP().toString();
    Serial.printf("WIFI_CONNECTED IP=%s\n", ip.c_str());
    startServerIfNeeded();
    return true;
  }
  Serial.println("WIFI_CONNECT_TIMEOUT");
  return false;
}

static bool applyProvisioningCredentials(const String &ssid, const String &password)
{
  const WifiCredentials previousCredentials = currentCredentials;
  const WifiCredentials candidate = {ssid, password, true};

  improvProvisioningActive = true;
  sendImprovErrorPacket(IMPROV_ERROR_NONE);
  sendImprovCurrentStatePacket();
  renderStatusScreen("Wi-Fi setup", "Connecting...");

  connectWifi(candidate);
  const bool connected = waitForWifiOrTimeout(15000);
  improvProvisioningActive = false;

  if (connected)
  {
    currentCredentials = candidate;
    saveCredentials(ssid, password);
    sendImprovErrorPacket(IMPROV_ERROR_NONE);
    sendImprovCurrentStatePacket();
    const String fields[] = {getDeviceNextUrl()};
    sendImprovRpcFields(IMPROV_RPC_SEND_WIFI_SETTINGS, fields, 1);
    if (UI_PAGE_COUNT > 0)
    {
      renderActivePage();
    }
    return true;
  }

  currentCredentials = previousCredentials;
  sendImprovErrorPacket(IMPROV_ERROR_UNABLE_TO_CONNECT);
  sendImprovCurrentStatePacket();
  renderStatusScreen("Wi-Fi setup", "Connection failed");
  if (previousCredentials.valid)
  {
    connectWifi(previousCredentials);
    waitForWifiOrTimeout(8000);
  }
  return false;
}

static void handleProvisioningCommand(const String &line)
{
  if (!line.startsWith("WIFI:"))
  {
    return;
  }

  const int separator = line.indexOf('|', 5);
  if (separator < 0)
  {
    Serial.println("WIFI_INVALID_FORMAT");
    return;
  }

  const String ssid = line.substring(5, separator);
  const String password = line.substring(separator + 1);
  if (ssid.length() == 0)
  {
    Serial.println("WIFI_INVALID_SSID");
    return;
  }

  if (applyProvisioningCredentials(ssid, password))
  {
    Serial.println("WIFI_SAVED");
  }
  else
  {
    Serial.println("WIFI_CONNECT_FAILED");
  }
}

static void handleImprovRpcPacket(const uint8_t *data, size_t dataLength)
{
  if (dataLength < 2)
  {
    sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
    return;
  }

  const uint8_t command = data[0];
  const uint8_t payloadLength = data[1];
  if (dataLength != static_cast<size_t>(payloadLength) + 2)
  {
    sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
    return;
  }

  if (command == IMPROV_RPC_REQUEST_CURRENT_STATE)
  {
    sendImprovCurrentStateResponse();
    return;
  }

  if (command == IMPROV_RPC_REQUEST_INFO)
  {
    sendImprovInfoPacket();
    return;
  }

  if (command == IMPROV_RPC_REQUEST_WIFI_NETWORKS)
  {
    sendImprovWifiScanResults();
    return;
  }

  if (command == IMPROV_RPC_SEND_WIFI_SETTINGS)
  {
    if (payloadLength < 2)
    {
      sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
      return;
    }
    size_t index = 2;
    const uint8_t ssidLength = data[index++];
    if (index + ssidLength > dataLength)
    {
      sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
      return;
    }
    String ssid;
    for (uint8_t i = 0; i < ssidLength; i++)
    {
      ssid += static_cast<char>(data[index++]);
    }
    if (index >= dataLength)
    {
      sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
      return;
    }
    const uint8_t passwordLength = data[index++];
    if (index + passwordLength > dataLength)
    {
      sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
      return;
    }
    String password;
    for (uint8_t i = 0; i < passwordLength; i++)
    {
      password += static_cast<char>(data[index++]);
    }
    if (ssid.length() == 0)
    {
      sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
      return;
    }
    applyProvisioningCredentials(ssid, password);
    return;
  }

  sendImprovErrorPacket(IMPROV_ERROR_UNKNOWN_RPC_COMMAND);
}

static void processSerialAsciiByte(uint8_t byteValue)
{
  const char c = static_cast<char>(byteValue);
  if (c == '\n')
  {
    String line = serialBuffer;
    serialBuffer = "";
    line.trim();
    handleProvisioningCommand(line);
    return;
  }
  if (c == '\r')
  {
    return;
  }
  if (byteValue >= 32 && byteValue <= 126)
  {
    serialBuffer += c;
  }
}

static void flushImprovCandidateToAscii()
{
  for (size_t i = 0; i < improvPacketLength; i++)
  {
    processSerialAsciiByte(improvPacketBuffer[i]);
  }
  clearImprovPacketState();
}

static void handleImprovPacketBuffer()
{
  if (improvPacketLength < 10)
  {
    sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
    clearImprovPacketState();
    return;
  }

  uint8_t checksum = 0;
  for (size_t i = 0; i < improvPacketLength - 1; i++)
  {
    checksum = static_cast<uint8_t>(checksum + improvPacketBuffer[i]);
  }
  if (checksum != improvPacketBuffer[improvPacketLength - 1])
  {
    sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
    clearImprovPacketState();
    return;
  }

  const uint8_t version = improvPacketBuffer[6];
  const uint8_t packetType = improvPacketBuffer[7];
  const uint8_t packetLength = improvPacketBuffer[8];
  if (version != 0x01 || packetType != IMPROV_RPC)
  {
    sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
    clearImprovPacketState();
    return;
  }

  handleImprovRpcPacket(&improvPacketBuffer[9], packetLength);
  clearImprovPacketState();
}

static void handleSerialProvisioning()
{
  while (Serial.available() > 0)
  {
    const uint8_t byteValue = static_cast<uint8_t>(Serial.read());

    if (improvPacketLength == 0)
    {
      if (byteValue == IMPROV_HEADER_BYTES[0])
      {
        improvPacketBuffer[improvPacketLength++] = byteValue;
      }
      else
      {
        processSerialAsciiByte(byteValue);
      }
      continue;
    }

    if (improvPacketLength >= sizeof(improvPacketBuffer))
    {
      clearImprovPacketState();
      processSerialAsciiByte(byteValue);
      continue;
    }

    improvPacketBuffer[improvPacketLength++] = byteValue;

    if (improvPacketLength <= sizeof(IMPROV_HEADER_BYTES))
    {
      const size_t headerIndex = improvPacketLength - 1;
      if (improvPacketBuffer[headerIndex] != IMPROV_HEADER_BYTES[headerIndex])
      {
        flushImprovCandidateToAscii();
      }
      continue;
    }

    if (improvPacketLength == 9)
    {
      improvExpectedLength = 9 + improvPacketBuffer[8] + 1;
      if (improvExpectedLength > sizeof(improvPacketBuffer) || improvExpectedLength < 10)
      {
        clearImprovPacketState();
      }
      continue;
    }

    if (improvExpectedLength > 0 && improvPacketLength == improvExpectedLength)
    {
      handleImprovPacketBuffer();
      continue;
    }

    if (byteValue == '\n' && improvExpectedLength == 0)
    {
      flushImprovCandidateToAscii();
    }
  }
}

void setup()
{
  Serial.begin(115200);
  int totalWidgets = 0;
  for (int pageIndex = 0; pageIndex < UI_PAGE_COUNT; pageIndex++)
  {
    totalWidgets += UI_PAGES[pageIndex].widgetCount;
  }
  Serial.printf("FW_BUILD_ID %s\n", UI_BUILD_ID);
  Serial.printf("UI_CONFIG PAGES=%d FONT=%s THEME_DARK=%d\n", UI_PAGE_COUNT, UI_FONT_NAME, UI_THEME_DARK);
  Serial.printf(
      "UI_WIDGETS TOTAL=%d PARTIAL_MS=%d FULL_EVERY=%d\n",
      totalWidgets,
      PARTIAL_REFRESH_MS_OVERRIDE,
      FULL_REFRESH_EVERY_N_PARTIALS_OVERRIDE);

  setupDisplay();

  currentCredentials = loadCredentials();
  connectWifi(currentCredentials);
  waitForWifiOrTimeout(15000);

  server.on("/", HTTP_GET, handleRoot);
  server.on("/api/health", HTTP_GET, handleHealth);
  server.on("/api/ota", HTTP_POST, handleOtaRequest);
  server.on("/api/ota/upload", HTTP_POST, handleOtaUploadRequest, handleOtaUploadData);
  server.on("/api/automation-switch", HTTP_GET, handleAutomationSwitchState);
  server.on("/api/automation-switch", HTTP_POST, handleAutomationSwitchSet);
  startServerIfNeeded();
}

void loop()
{
  handleSerialProvisioning();

  if (WiFi.status() == WL_CONNECTED)
  {
    startServerIfNeeded();
  }

  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiRetry > 30000)
  {
    lastWifiRetry = millis();
    connectWifi(currentCredentials);
    waitForWifiOrTimeout(8000);
  }

  if (serverStarted && WiFi.status() == WL_CONNECTED)
  {
    server.handleClient();
  }
  runDisplayLoop();
}
