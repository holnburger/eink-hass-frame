#include <Arduino.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <Update.h>
#include <WiFi.h>
#include <WebServer.h>
#include <time.h>
#if __has_include(<bb_captouch.h>)
#include <bb_captouch.h>
#define CAPTOUCH_AVAILABLE 1
#else
#define CAPTOUCH_AVAILABLE 0
#endif

#include "device_config.h"
#include "generated_ui_config.h"
#if __has_include("generated_pio_wifi.h")
#include "generated_pio_wifi.h"
#endif

#if __has_include(<FastEPD.h>)
#include <FastEPD.h>
#define FASTEPD_AVAILABLE 1
#if __has_include(<Fonts/Roboto_Black_24.h>)
#include <Fonts/Roboto_Black_24.h>
#define UI_TITLE_FONT_AVAILABLE 1
#elif __has_include(<Roboto_Black_24.h>)
#include <Roboto_Black_24.h>
#define UI_TITLE_FONT_AVAILABLE 1
#else
#define UI_TITLE_FONT_AVAILABLE 0
#endif
#else
#define FASTEPD_AVAILABLE 0
#define UI_TITLE_FONT_AVAILABLE 0
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

enum ImprovMessageType : uint8_t {
  IMPROV_CURRENT_STATE = 0x01,
  IMPROV_ERROR_STATE = 0x02,
  IMPROV_RPC = 0x03,
  IMPROV_RPC_RESULT = 0x04,
};

enum ImprovCurrentState : uint8_t {
  IMPROV_STATE_READY = 0x02,
  IMPROV_STATE_PROVISIONING = 0x03,
  IMPROV_STATE_PROVISIONED = 0x04,
};

enum ImprovErrorState : uint8_t {
  IMPROV_ERROR_NONE = 0x00,
  IMPROV_ERROR_INVALID_RPC_PACKET = 0x01,
  IMPROV_ERROR_UNKNOWN_RPC_COMMAND = 0x02,
  IMPROV_ERROR_UNABLE_TO_CONNECT = 0x03,
};

enum ImprovRpcCommand : uint8_t {
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
static char lastDebugIp[40] = "";

typedef struct {
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

typedef struct {
  BB_RECT cardRect;
  BB_RECT contentRect;
  BB_RECT controlRect;
  BB_RECT secondaryRect;
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

#if CAPTOUCH_AVAILABLE
static BBCapTouch capTouch;
static bool touchReady = false;
static bool touchPressed = false;
static uint32_t lastTouchActionMs = 0;
#endif

static bool isPointInRect(int x, int y, const BB_RECT &rect) {
  return x >= rect.x && x < (rect.x + rect.w) && y >= rect.y && y < (rect.y + rect.h);
}

static bool isPointInRectExpanded(int x, int y, const BB_RECT &rect, int pad) {
  BB_RECT expanded = rect;
  expanded.x -= pad;
  expanded.y -= pad;
  expanded.w += pad * 2;
  expanded.h += pad * 2;
  return isPointInRect(x, y, expanded);
}

static int centeredX(const char *text) {
  BB_RECT bounds;
  display.getStringBox(text, &bounds);
  const int x = (display.width() - bounds.w) / 2;
  return x < 0 ? 0 : x;
}

static void drawReadableLine(const char *text, int x, int y) {
  display.drawString(text, x, y);
  display.drawString(text, x + 1, y);
}

enum UiTextRole : uint8_t {
  UI_TEXT_META = 0,
  UI_TEXT_BODY = 1,
  UI_TEXT_TITLE = 2,
};

enum UiFontProfile : uint8_t {
  UI_FONT_PROFILE_SYSTEM = 0,
  UI_FONT_PROFILE_SERIF = 1,
  UI_FONT_PROFILE_MONO = 2,
};

static UiFontProfile getUiFontProfile() {
  if (strcmp(UI_FONT_NAME, "Serif") == 0) {
    return UI_FONT_PROFILE_SERIF;
  }
  if (strcmp(UI_FONT_NAME, "Mono") == 0) {
    return UI_FONT_PROFILE_MONO;
  }
  return UI_FONT_PROFILE_SYSTEM;
}

static void selectTextFont(UiTextRole role) {
  display.setItalic(false);
  switch (getUiFontProfile()) {
    case UI_FONT_PROFILE_SERIF:
      if (role == UI_TEXT_TITLE) {
#if UI_TITLE_FONT_AVAILABLE
        display.setFont(Roboto_Black_24);
#else
        display.setFont(FONT_16x16);
        display.setItalic(true);
#endif
      } else {
        display.setFont(role == UI_TEXT_META ? FONT_12x16 : FONT_16x16);
        display.setItalic(true);
      }
      break;
    case UI_FONT_PROFILE_MONO:
      display.setFont(role == UI_TEXT_TITLE ? FONT_16x16 : FONT_12x16);
      break;
    case UI_FONT_PROFILE_SYSTEM:
    default:
      if (role == UI_TEXT_TITLE) {
#if UI_TITLE_FONT_AVAILABLE
        display.setFont(Roboto_Black_24);
#else
        display.setFont(FONT_16x16);
#endif
      } else {
        display.setFont(role == UI_TEXT_META ? FONT_8x8 : FONT_12x16);
      }
      break;
  }
}

static int textWidthForRole(const char *text, UiTextRole role) {
  selectTextFont(role);
  BB_RECT bounds;
  display.getStringBox(text, &bounds);
  display.setItalic(false);
  return bounds.w;
}

static void drawTextRole(const char *text, int x, int y, UiTextRole role) {
  selectTextFont(role);
  drawReadableLine(text, x, y);
  display.setItalic(false);
}

static void drawCenteredTextRole(const char *text, int y, UiTextRole role) {
  const int width = textWidthForRole(text, role);
  int x = (display.width() - width) / 2;
  if (x < 0) {
    x = 0;
  }
  drawTextRole(text, x, y, role);
}

static bool readClockText(char *out, size_t outLen) {
  struct tm timeInfo;
  if (getLocalTime(&timeInfo, 10)) {
    strftime(out, outLen, "%H:%M:%S", &timeInfo);
    return true;
  }
  snprintf(out, outLen, "--:--:--");
  return false;
}

static void configureNtpIfNeeded() {
  if (ntpConfigured || WiFi.status() != WL_CONNECTED) {
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

static void buildDebugIpText(char *out, size_t outLen) {
  if (WiFi.status() == WL_CONNECTED) {
    const String ip = WiFi.localIP().toString();
    snprintf(out, outLen, "IP %s", ip.c_str());
  } else {
    snprintf(out, outLen, "IP offline");
  }
}

static void drawDebugIpText(const char *debugIp, bool partialRefresh) {
  if (!displayReady) {
    return;
  }

  display.setMode(BB_MODE_1BPP);
  display.setTextColor(BBEP_BLACK, BBEP_WHITE);
  display.fillRect(debugIpRect.x, debugIpRect.y, debugIpRect.w, debugIpRect.h, BBEP_WHITE);
  const int textWidth = textWidthForRole(debugIp, UI_TEXT_META);
  int textX = debugIpRect.x + debugIpRect.w - textWidth;
  if (textX < debugIpRect.x) {
    textX = debugIpRect.x;
  }
  drawTextRole(debugIp, textX, debugIpRect.y, UI_TEXT_META);

  if (partialRefresh) {
    display.partialUpdate(false);
    partialCounter++;
    lastPartialRefresh = millis();
  }
}

static void drawSevenSegmentSymbol(int x, int y, int w, int h, int thickness, char symbol) {
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
  if (vLen < 4) {
    return;
  }
  int hLen = w - (2 * thickness);
  if (hLen < 4) {
    return;
  }

  uint8_t segments = 0;
  if (symbol >= '0' && symbol <= '9') {
    segments = digitMap[symbol - '0'];
  } else if (symbol == '-') {
    segments = 0x40; // middle segment only
  } else {
    return;
  }

  auto drawSeg = [&](bool on, int sx, int sy, int sw, int sh) {
    if (on) {
      display.fillRect(sx, sy, sw, sh, BBEP_BLACK);
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

static void drawSevenSegmentColon(int x, int y, int w, int h, int thickness) {
  int dotSize = thickness;
  if (dotSize < 6) {
    dotSize = 6;
  }
  int cx = x + ((w - dotSize) / 2);
  int topY = y + (h / 3) - (dotSize / 2);
  int bottomY = y + ((2 * h) / 3) - (dotSize / 2);
  display.fillRect(cx, topY, dotSize, dotSize, BBEP_BLACK);
  display.fillRect(cx, bottomY, dotSize, dotSize, BBEP_BLACK);
}

static int clampInt(int value, int minValue, int maxValue) {
  if (value < minValue) {
    return minValue;
  }
  if (value > maxValue) {
    return maxValue;
  }
  return value;
}

static WidgetRuntimeState &getWidgetState(int pageIndex, int widgetIndex) {
  return widgetStates[pageIndex][widgetIndex];
}

static UiWidgetConfig getWidgetConfig(int pageIndex, int widgetIndex) {
  return UI_PAGES[pageIndex].widgets[widgetIndex];
}

static int widgetWeight(uint8_t type) {
  switch (type) {
    case UI_WIDGET_CLOCK:
      return 18;
    case UI_WIDGET_WEATHER:
      return 11;
    case UI_WIDGET_PROGRESS:
    case UI_WIDGET_SWITCH:
    case UI_WIDGET_SLIDER:
      return 10;
    default:
      return 8;
  }
}

static void fillDitherRect(int x, int y, int w, int h, uint8_t shade) {
  if (w <= 0 || h <= 0) {
    return;
  }
  if (shade == 0) {
    display.fillRect(x, y, w, h, BBEP_WHITE);
    return;
  }
  if (shade >= 4) {
    display.fillRect(x, y, w, h, BBEP_BLACK);
    return;
  }

  for (int yy = y; yy < y + h; yy++) {
    for (int xx = x; xx < x + w; xx++) {
      bool black = false;
      switch (shade) {
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
      display.drawPixelFast(xx, yy, black ? BBEP_BLACK : BBEP_WHITE);
    }
  }
}

static void fillDitherRoundRect(int x, int y, int w, int h, int r, uint8_t shade) {
  if (w <= 0 || h <= 0) {
    return;
  }
  if (r < 1) {
    fillDitherRect(x, y, w, h, shade);
    return;
  }

  if (shade == 0) {
    display.fillRoundRect(x, y, w, h, r, BBEP_WHITE);
    return;
  }
  if (shade >= 4) {
    display.fillRoundRect(x, y, w, h, r, BBEP_BLACK);
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

  for (int yy = top; yy <= bottom; yy++) {
    for (int xx = left; xx <= right; xx++) {
      bool inside = false;

      if (xx >= cxL && xx <= cxR) {
        inside = true;
      } else if (yy >= cyT && yy <= cyB) {
        inside = true;
      } else {
        const int cx = (xx < cxL) ? cxL : cxR;
        const int cy = (yy < cyT) ? cyT : cyB;
        const int dx = xx - cx;
        const int dy = yy - cy;
        inside = (dx * dx + dy * dy) <= rr;
      }

      if (!inside) {
        continue;
      }

      bool black = false;
      switch (shade) {
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
      display.drawPixelFast(xx, yy, black ? BBEP_BLACK : BBEP_WHITE);
    }
  }
}

static void drawChevronButton(const BB_RECT &rect, bool left) {
  fillDitherRoundRect(rect.x, rect.y, rect.w, rect.h, rect.h / 2, 1);
  display.drawRoundRect(rect.x, rect.y, rect.w, rect.h, rect.h / 2, BBEP_BLACK);
  const int midY = rect.y + (rect.h / 2);
  if (left) {
    display.drawLine(rect.x + 28, midY - 12, rect.x + 16, midY, BBEP_BLACK);
    display.drawLine(rect.x + 16, midY, rect.x + 28, midY + 12, BBEP_BLACK);
  } else {
    display.drawLine(rect.x + rect.w - 28, midY - 12, rect.x + rect.w - 16, midY, BBEP_BLACK);
    display.drawLine(rect.x + rect.w - 16, midY, rect.x + rect.w - 28, midY + 12, BBEP_BLACK);
  }
}

static void drawPageDots() {
  const int totalWidth = (UI_PAGE_COUNT * 16) - 8;
  const int startX = (display.width() - totalWidth) / 2;
  const int y = display.height() - 44;

  for (int i = 0; i < UI_PAGE_COUNT; i++) {
    const int dotX = startX + (i * 16);
    if (i == currentPageIndex) {
      display.fillCircle(dotX, y, 5, BBEP_BLACK);
    } else {
      display.drawCircle(dotX, y, 4, BBEP_BLACK);
    }
  }
}

static void drawWidgetCardBase(const BB_RECT &rect) {
  fillDitherRoundRect(rect.x, rect.y, rect.w, rect.h, 22, 0);
  display.drawRoundRect(rect.x, rect.y, rect.w, rect.h, 22, BBEP_BLACK);
}

static void initializeWidgetStates() {
  for (int pageIndex = 0; pageIndex < UI_PAGE_COUNT; pageIndex++) {
    for (int widgetIndex = 0; widgetIndex < UI_MAX_WIDGETS_PER_PAGE; widgetIndex++) {
      WidgetRuntimeState &state = widgetStates[pageIndex][widgetIndex];
      memset(&state, 0, sizeof(state));

      if (widgetIndex >= UI_PAGES[pageIndex].widgetCount) {
        continue;
      }

      const UiWidgetConfig widget = getWidgetConfig(pageIndex, widgetIndex);
      state.value = clampInt(widget.value, 0, widget.maxValue > 0 ? widget.maxValue : 100);
      state.maxValue = widget.maxValue > 0 ? widget.maxValue : 100;
      state.enabled = widget.enabled != 0;
      state.direction = 1;
      state.phase = widgetIndex % (int)(sizeof(WEATHER_FRAMES) / sizeof(WEATHER_FRAMES[0]));
      snprintf(state.lastClockText, sizeof(state.lastClockText), "--:--:--");
    }
  }
}

static void computeClockLayout(WidgetRuntimeState &state) {
  constexpr int totalChars = 8; // HH:MM:SS
  constexpr int colonCount = 2;
  constexpr int digitCount = 6;
  const int gap = getUiFontProfile() == UI_FONT_PROFILE_MONO ? 10 : 8;
  const int colonW = getUiFontProfile() == UI_FONT_PROFILE_SERIF ? 18 : 16;
  int digitW = (state.contentRect.w - (colonCount * colonW) - ((totalChars - 1) * gap)) / digitCount;
  digitW = clampInt(digitW, 28, 58);
  int digitH = state.contentRect.h - 10;
  digitH = clampInt(digitH, 68, 150);

  const int totalWidth = (digitCount * digitW) + (colonCount * colonW) + ((totalChars - 1) * gap);
  int x = state.contentRect.x + ((state.contentRect.w - totalWidth) / 2);
  const int y = state.contentRect.y + ((state.contentRect.h - digitH) / 2);

  for (int i = 0; i < totalChars; i++) {
    const bool isColon = (i == 2 || i == 5);
    const int symbolW = isColon ? colonW : digitW;
    state.digitRects[i] = {x, y, symbolW, digitH};
    x += symbolW + gap;
  }

  state.secondsRect = state.digitRects[6];
  const int right = state.digitRects[7].x + state.digitRects[7].w;
  state.secondsRect.w = right - state.secondsRect.x;
  state.secondsRect.x -= 2;
  state.secondsRect.y -= 2;
  state.secondsRect.w += 4;
  state.secondsRect.h += 4;
  if (state.secondsRect.x < state.contentRect.x) {
    state.secondsRect.x = state.contentRect.x;
  }
  if (state.secondsRect.y < state.contentRect.y) {
    state.secondsRect.y = state.contentRect.y;
  }
  const int maxRight = state.contentRect.x + state.contentRect.w;
  const int maxBottom = state.contentRect.y + state.contentRect.h;
  if (state.secondsRect.x + state.secondsRect.w > maxRight) {
    state.secondsRect.w = maxRight - state.secondsRect.x;
  }
  if (state.secondsRect.y + state.secondsRect.h > maxBottom) {
    state.secondsRect.h = maxBottom - state.secondsRect.y;
  }
}

static void layoutCurrentPage() {
  const int width = display.width();
  const int height = display.height();
  const UiPageConfig &page = UI_PAGES[currentPageIndex];
  const int margin = 24;
  const int topY = 92;
  const int footerTop = height - 78;
  const int gap = 16;
  const int availableHeight = footerTop - topY - (page.widgetCount > 0 ? (page.widgetCount - 1) * gap : 0);

  int totalWeight = 0;
  for (int i = 0; i < page.widgetCount; i++) {
    totalWeight += widgetWeight(page.widgets[i].type);
  }
  if (totalWeight <= 0) {
    totalWeight = 1;
  }

  int currentY = topY;
  int remainingHeight = availableHeight;
  int remainingWeight = totalWeight;

  for (int i = 0; i < page.widgetCount; i++) {
    const UiWidgetConfig widget = page.widgets[i];
    WidgetRuntimeState &state = getWidgetState(currentPageIndex, i);
    const int weight = widgetWeight(widget.type);
    int cardHeight = (i == page.widgetCount - 1) ? remainingHeight : (remainingHeight * weight) / remainingWeight;
    cardHeight = clampInt(cardHeight, 88, 340);
    state.cardRect = {margin, currentY, width - (margin * 2), cardHeight};
    state.contentRect = {state.cardRect.x + 18, state.cardRect.y + 52, state.cardRect.w - 36, state.cardRect.h - 70};
    state.controlRect = {0, 0, 0, 0};
    state.secondaryRect = {0, 0, 0, 0};
    state.secondsRect = {0, 0, 0, 0};

    if (widget.type == UI_WIDGET_CLOCK) {
      state.contentRect = {state.cardRect.x + 18, state.cardRect.y + 58, state.cardRect.w - 36, state.cardRect.h - 76};
      computeClockLayout(state);
    } else if (widget.type == UI_WIDGET_WEATHER) {
      state.secondaryRect = {state.cardRect.x + state.cardRect.w - 108, state.cardRect.y + 24, 76, 76};
    } else if (widget.type == UI_WIDGET_PROGRESS || widget.type == UI_WIDGET_SLIDER) {
      state.controlRect = {state.cardRect.x + 18, state.cardRect.y + state.cardRect.h - 34, state.cardRect.w - 36, 18};
    } else if (widget.type == UI_WIDGET_SWITCH) {
      state.controlRect = {state.cardRect.x + state.cardRect.w - 146, state.cardRect.y + (state.cardRect.h / 2) - 24, 112, 48};
    }

    currentY += cardHeight + gap;
    remainingHeight -= cardHeight;
    remainingWeight -= weight;
  }

  navLeftRect = {margin, height - 64, 52, 40};
  navRightRect = {width - margin - 52, height - 64, 52, 40};
  debugIpRect = {width - margin - 230, height - 18, 230, 10};
}

static void drawClockSymbolAtIndex(const WidgetRuntimeState &state, int index, char symbol) {
  if (index < 0 || index > 7) {
    return;
  }
  const BB_RECT rect = state.digitRects[index];
  int thickness = rect.w / (getUiFontProfile() == UI_FONT_PROFILE_SERIF ? 6 : 5);
  thickness = clampInt(thickness, 6, 12);
  if (symbol == ':') {
    drawSevenSegmentColon(rect.x, rect.y, rect.w, rect.h, thickness);
  } else {
    drawSevenSegmentSymbol(rect.x, rect.y, rect.w, rect.h, thickness, symbol);
  }
}

static void drawLargeClockText(const WidgetRuntimeState &state, const char *clockText, int fromIndex, int toIndex) {
  if (fromIndex < 0) {
    fromIndex = 0;
  }
  if (toIndex > 7) {
    toIndex = 7;
  }

  for (int i = fromIndex; i <= toIndex && clockText[i] != '\0'; i++) {
    if (clockText[i] == ':') {
      drawClockSymbolAtIndex(state, i, ':');
    } else {
      drawClockSymbolAtIndex(state, i, clockText[i]);
    }
  }
}

static void drawWeatherIcon(const BB_RECT &rect, const char *condition) {
  const int iconX = rect.x;
  const int iconY = rect.y;
  const int iconW = rect.w;
  const int iconH = rect.h;
  const int radius = iconH / 5;
  fillDitherRoundRect(iconX, iconY, iconW, iconH, radius, 1);
  display.drawRoundRect(iconX, iconY, iconW, iconH, radius, BBEP_BLACK);

  const bool rainy = strstr(condition, "rain") != nullptr || strstr(condition, "Rain") != nullptr;
  const bool clear = strstr(condition, "Clear") != nullptr;

  if (clear) {
    const int cx = iconX + (iconW / 2);
    const int cy = iconY + (iconH / 2);
    const int sunR = iconH / 5;
    display.fillCircle(cx, cy, sunR, BBEP_WHITE);
    display.drawCircle(cx, cy, sunR, BBEP_BLACK);
    display.drawLine(cx - sunR - 8, cy, cx - sunR - 2, cy, BBEP_BLACK);
    display.drawLine(cx + sunR + 2, cy, cx + sunR + 8, cy, BBEP_BLACK);
    display.drawLine(cx, cy - sunR - 8, cx, cy - sunR - 2, BBEP_BLACK);
    display.drawLine(cx, cy + sunR + 2, cx, cy + sunR + 8, BBEP_BLACK);
    return;
  }

  const int cloudY = iconY + (iconH / 2) - 8;
  display.fillCircle(iconX + 24, cloudY + 10, 11, BBEP_WHITE);
  display.fillCircle(iconX + 39, cloudY + 6, 14, BBEP_WHITE);
  display.fillCircle(iconX + 56, cloudY + 11, 11, BBEP_WHITE);
  display.fillRect(iconX + 22, cloudY + 12, 40, 14, BBEP_WHITE);
  display.drawCircle(iconX + 24, cloudY + 10, 11, BBEP_BLACK);
  display.drawCircle(iconX + 39, cloudY + 6, 14, BBEP_BLACK);
  display.drawCircle(iconX + 56, cloudY + 11, 11, BBEP_BLACK);
  display.drawLine(iconX + 21, cloudY + 26, iconX + 63, cloudY + 26, BBEP_BLACK);

  if (rainy) {
    display.drawLine(iconX + 28, cloudY + 32, iconX + 25, cloudY + 40, BBEP_BLACK);
    display.drawLine(iconX + 40, cloudY + 32, iconX + 37, cloudY + 40, BBEP_BLACK);
    display.drawLine(iconX + 52, cloudY + 32, iconX + 49, cloudY + 40, BBEP_BLACK);
  }
}

static void drawClockWidget(int widgetIndex, bool pushPartial) {
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  char clockText[16];
  readClockText(clockText, sizeof(clockText));

  display.setMode(BB_MODE_1BPP);
  display.setTextColor(BBEP_BLACK, BBEP_WHITE);
  drawWidgetCardBase(state.cardRect);
  drawTextRole(widget.label, state.cardRect.x + 18, state.cardRect.y + 18, UI_TEXT_META);
  display.fillRect(state.contentRect.x, state.contentRect.y, state.contentRect.w, state.contentRect.h, BBEP_WHITE);
  drawLargeClockText(state, clockText, 0, 7);
  snprintf(state.lastClockText, sizeof(state.lastClockText), "%s", clockText);

  if (pushPartial) {
    display.partialUpdate(false);
    partialCounter++;
    lastPartialRefresh = millis();
  }
}

static void drawClockSecondsPartial(int widgetIndex, const char *clockText) {
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  display.setMode(BB_MODE_1BPP);
  display.setTextColor(BBEP_BLACK, BBEP_WHITE);
  display.fillRect(state.secondsRect.x, state.secondsRect.y, state.secondsRect.w, state.secondsRect.h, BBEP_WHITE);
  drawLargeClockText(state, clockText, 6, 7);
  display.partialUpdate(false);
  partialCounter++;
  lastPartialRefresh = millis();
}

static void drawProgressWidget(int widgetIndex, bool pushPartial) {
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  const int safeValue = clampInt(state.value, 0, state.maxValue > 0 ? state.maxValue : 100);

  display.setMode(BB_MODE_1BPP);
  display.setTextColor(BBEP_BLACK, BBEP_WHITE);
  drawWidgetCardBase(state.cardRect);
  drawTextRole(widget.label, state.cardRect.x + 18, state.cardRect.y + 18, UI_TEXT_META);

  char valueText[16];
  snprintf(valueText, sizeof(valueText), "%d%%", safeValue);
  const int valueWidth = textWidthForRole(valueText, UI_TEXT_BODY);
  drawTextRole(valueText, state.cardRect.x + state.cardRect.w - valueWidth - 18, state.cardRect.y + 16, UI_TEXT_BODY);

  fillDitherRoundRect(state.controlRect.x, state.controlRect.y, state.controlRect.w, state.controlRect.h, state.controlRect.h / 2, 1);
  display.drawRoundRect(state.controlRect.x, state.controlRect.y, state.controlRect.w, state.controlRect.h, state.controlRect.h / 2, BBEP_BLACK);

  const int fillWidth = (state.controlRect.w * safeValue) / (state.maxValue > 0 ? state.maxValue : 100);
  if (fillWidth > 4) {
    fillDitherRoundRect(
        state.controlRect.x + 2,
        state.controlRect.y + 2,
        fillWidth - 4,
        state.controlRect.h - 4,
        (state.controlRect.h - 4) / 2,
        3);
  }

  if (pushPartial) {
    display.partialUpdate(false);
    partialCounter++;
    lastPartialRefresh = millis();
  }
}

static void drawSliderWidget(int widgetIndex, bool pushPartial) {
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  const int safeValue = clampInt(state.value, 0, state.maxValue > 0 ? state.maxValue : 100);

  display.setMode(BB_MODE_1BPP);
  display.setTextColor(BBEP_BLACK, BBEP_WHITE);
  drawWidgetCardBase(state.cardRect);
  drawTextRole(widget.label, state.cardRect.x + 18, state.cardRect.y + 18, UI_TEXT_META);

  char valueText[16];
  snprintf(valueText, sizeof(valueText), "%d", safeValue);
  const int valueWidth = textWidthForRole(valueText, UI_TEXT_BODY);
  drawTextRole(valueText, state.cardRect.x + state.cardRect.w - valueWidth - 18, state.cardRect.y + 16, UI_TEXT_BODY);

  fillDitherRoundRect(state.controlRect.x, state.controlRect.y + 4, state.controlRect.w, 10, 5, 1);
  display.drawRoundRect(state.controlRect.x, state.controlRect.y + 4, state.controlRect.w, 10, 5, BBEP_BLACK);
  const int knobX = state.controlRect.x + ((state.controlRect.w - 18) * safeValue) / (state.maxValue > 0 ? state.maxValue : 100);
  fillDitherRoundRect(knobX, state.controlRect.y - 2, 18, 22, 9, 2);
  display.drawRoundRect(knobX, state.controlRect.y - 2, 18, 22, 9, BBEP_BLACK);

  if (pushPartial) {
    display.partialUpdate(false);
    partialCounter++;
    lastPartialRefresh = millis();
  }
}

static void drawWeatherWidget(int widgetIndex, bool pushPartial) {
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  const WeatherFrame weather = WEATHER_FRAMES[state.phase % (int)(sizeof(WEATHER_FRAMES) / sizeof(WEATHER_FRAMES[0]))];

  display.setMode(BB_MODE_1BPP);
  display.setTextColor(BBEP_BLACK, BBEP_WHITE);
  drawWidgetCardBase(state.cardRect);
  drawTextRole(widget.label, state.cardRect.x + 18, state.cardRect.y + 18, UI_TEXT_META);

  char line1[32];
  snprintf(line1, sizeof(line1), "%d C", weather.tempC);
  drawTextRole(line1, state.cardRect.x + 18, state.cardRect.y + 48, UI_TEXT_TITLE);
  drawTextRole(weather.condition, state.cardRect.x + 18, state.cardRect.y + 80, UI_TEXT_BODY);
  drawWeatherIcon(state.secondaryRect, weather.condition);

  if (pushPartial) {
    display.partialUpdate(false);
    partialCounter++;
    lastPartialRefresh = millis();
  }
}

static void drawSwitchWidget(int widgetIndex, bool pushPartial) {
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);

  display.setMode(BB_MODE_1BPP);
  display.setTextColor(BBEP_BLACK, BBEP_WHITE);
  drawWidgetCardBase(state.cardRect);
  drawTextRole(widget.label, state.cardRect.x + 18, state.cardRect.y + 18, UI_TEXT_META);
  drawTextRole(state.enabled ? "Enabled" : "Disabled", state.cardRect.x + 18, state.cardRect.y + 58, UI_TEXT_BODY);

  const uint8_t trackShade = state.enabled ? 3 : 1;
  fillDitherRoundRect(
      state.controlRect.x,
      state.controlRect.y,
      state.controlRect.w,
      state.controlRect.h,
      state.controlRect.h / 2,
      trackShade);
  display.drawRoundRect(state.controlRect.x, state.controlRect.y, state.controlRect.w, state.controlRect.h, state.controlRect.h / 2, BBEP_BLACK);

  const int knobMargin = 4;
  const int knobSize = state.controlRect.h - (2 * knobMargin);
  const int knobX = state.enabled
                        ? (state.controlRect.x + state.controlRect.w - knobMargin - knobSize)
                        : (state.controlRect.x + knobMargin);
  const int knobY = state.controlRect.y + knobMargin;
  display.fillCircle(knobX + (knobSize / 2), knobY + (knobSize / 2), knobSize / 2, BBEP_WHITE);
  display.drawCircle(knobX + (knobSize / 2), knobY + (knobSize / 2), knobSize / 2, BBEP_BLACK);

  if (pushPartial) {
    display.partialUpdate(false);
    partialCounter++;
    lastPartialRefresh = millis();
  }
}

static void drawWidgetByType(int widgetIndex, bool pushPartial) {
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  switch (widget.type) {
    case UI_WIDGET_CLOCK:
      drawClockWidget(widgetIndex, pushPartial);
      break;
    case UI_WIDGET_WEATHER:
      drawWeatherWidget(widgetIndex, pushPartial);
      break;
    case UI_WIDGET_PROGRESS:
      drawProgressWidget(widgetIndex, pushPartial);
      break;
    case UI_WIDGET_SWITCH:
      drawSwitchWidget(widgetIndex, pushPartial);
      break;
    case UI_WIDGET_SLIDER:
      drawSliderWidget(widgetIndex, pushPartial);
      break;
    default:
      break;
  }
}

static void renderActivePage() {
  if (!displayReady) {
    return;
  }

  display.setMode(BB_MODE_1BPP);
  display.setTextColor(BBEP_BLACK, BBEP_WHITE);
  layoutCurrentPage();
  display.fillScreen(BBEP_WHITE);

  char pageMeta[24];
  snprintf(pageMeta, sizeof(pageMeta), "Page %d/%d", currentPageIndex + 1, UI_PAGE_COUNT);
  drawTextRole(pageMeta, 24, 24, UI_TEXT_META);
  drawCenteredTextRole(UI_PAGES[currentPageIndex].name, 52, UI_TEXT_TITLE);

  for (int widgetIndex = 0; widgetIndex < UI_PAGES[currentPageIndex].widgetCount; widgetIndex++) {
    drawWidgetByType(widgetIndex, false);
  }

  drawChevronButton(navLeftRect, true);
  drawChevronButton(navRightRect, false);
  drawPageDots();

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
  pageReady = true;
  lastFullRefreshMs = millis();
}

static bool getPrimarySwitchLocation(int &pageIndexOut, int &widgetIndexOut) {
  for (int pageIndex = 0; pageIndex < UI_PAGE_COUNT; pageIndex++) {
    for (int widgetIndex = 0; widgetIndex < UI_PAGES[pageIndex].widgetCount; widgetIndex++) {
      if (getWidgetConfig(pageIndex, widgetIndex).type == UI_WIDGET_SWITCH) {
        pageIndexOut = pageIndex;
        widgetIndexOut = widgetIndex;
        return true;
      }
    }
  }
  return false;
}

static bool getPrimarySwitchState(bool &enabledOut) {
  int pageIndex = 0;
  int widgetIndex = 0;
  if (!getPrimarySwitchLocation(pageIndex, widgetIndex)) {
    return false;
  }
  enabledOut = getWidgetState(pageIndex, widgetIndex).enabled;
  return true;
}

static bool setPrimarySwitchState(bool enabled, bool redraw) {
  int pageIndex = 0;
  int widgetIndex = 0;
  if (!getPrimarySwitchLocation(pageIndex, widgetIndex)) {
    return false;
  }
  WidgetRuntimeState &state = getWidgetState(pageIndex, widgetIndex);
  state.enabled = enabled;
  if (redraw && displayReady && pageReady && pageIndex == currentPageIndex) {
    drawSwitchWidget(widgetIndex, true);
  }
  return true;
}

static void pollTouchInput() {
#if CAPTOUCH_AVAILABLE
  if (!touchReady || !displayReady || !pageReady) {
    return;
  }

  TOUCHINFO ti;
  capTouch.getSamples(&ti);
  const bool isPressed = ti.count > 0;

  if (isPressed && !touchPressed) {
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

    for (int i = 0; i < 6; i++) {
      const int tx = mappedPoints[i][0];
      const int ty = mappedPoints[i][1];
      if (tx < -32 || ty < -32 || tx > w + 32 || ty > h + 32) {
        continue;
      }

      if (now - lastTouchActionMs <= 250) {
        return;
      }

      if (isPointInRectExpanded(tx, ty, navLeftRect, 8)) {
        lastTouchActionMs = now;
        currentPageIndex = (currentPageIndex - 1 + UI_PAGE_COUNT) % UI_PAGE_COUNT;
        renderActivePage();
        Serial.printf("PAGE_SWITCH DIR=LEFT MAP=%s RAW=%d,%d XY=%d,%d\n", mappedNames[i], rawX, rawY, tx, ty);
        return;
      }

      if (isPointInRectExpanded(tx, ty, navRightRect, 8)) {
        lastTouchActionMs = now;
        currentPageIndex = (currentPageIndex + 1) % UI_PAGE_COUNT;
        renderActivePage();
        Serial.printf("PAGE_SWITCH DIR=RIGHT MAP=%s RAW=%d,%d XY=%d,%d\n", mappedNames[i], rawX, rawY, tx, ty);
        return;
      }

      for (int widgetIndex = 0; widgetIndex < UI_PAGES[currentPageIndex].widgetCount; widgetIndex++) {
        const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
        WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);

        if (widget.type == UI_WIDGET_SWITCH && isPointInRectExpanded(tx, ty, state.cardRect, 10)) {
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

        if (widget.type == UI_WIDGET_SLIDER && isPointInRectExpanded(tx, ty, state.controlRect, 10)) {
          lastTouchActionMs = now;
          const int relative = clampInt((tx - state.controlRect.x) * 100 / state.controlRect.w, 0, 100);
          state.value = relative;
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
      }
    }

    Serial.printf("TOUCH_MISS RAW=%d,%d\n", rawX, rawY);
  } else if (!isPressed) {
    touchPressed = false;
  }
#endif
}

static void runDisplayLoop() {
  if (!displayReady) {
    return;
  }

  if (!pageReady) {
    renderActivePage();
    return;
  }

  configureNtpIfNeeded();
  pollTouchInput();

  if (FULL_REFRESH_EVERY_N_PARTIALS_OVERRIDE > 0 &&
      millis() - lastFullRefreshMs >= (uint32_t)FULL_REFRESH_EVERY_N_PARTIALS_OVERRIDE * 1000UL) {
    renderActivePage();
    return;
  }

  char currentDebugIp[40];
  buildDebugIpText(currentDebugIp, sizeof(currentDebugIp));
  if (strcmp(currentDebugIp, lastDebugIp) != 0) {
    drawDebugIpText(currentDebugIp, true);
    snprintf(lastDebugIp, sizeof(lastDebugIp), "%s", currentDebugIp);
  }

  const uint32_t nowMs = millis();
  if (nowMs - lastClockUpdateMs >= 250) {
    lastClockUpdateMs = nowMs;
    for (int widgetIndex = 0; widgetIndex < UI_PAGES[currentPageIndex].widgetCount; widgetIndex++) {
      const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
      if (widget.type != UI_WIDGET_CLOCK) {
        continue;
      }

      WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
      char currentClock[16];
      readClockText(currentClock, sizeof(currentClock));
      if (strcmp(currentClock, state.lastClockText) != 0) {
        const bool hhmmChanged = strncmp(currentClock, state.lastClockText, 5) != 0;
        if (hhmmChanged) {
          drawClockWidget(widgetIndex, true);
        } else {
          drawClockSecondsPartial(widgetIndex, currentClock);
          snprintf(state.lastClockText, sizeof(state.lastClockText), "%s", currentClock);
        }
      }
    }
  }

  if (nowMs - lastValueUpdateMs >= 5000) {
    lastValueUpdateMs = nowMs;
    for (int widgetIndex = 0; widgetIndex < UI_PAGES[currentPageIndex].widgetCount; widgetIndex++) {
      const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
      WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);

      if (widget.type == UI_WIDGET_PROGRESS) {
        state.value += 5;
        if (state.value > state.maxValue) {
          state.value = 0;
        }
        drawProgressWidget(widgetIndex, true);
      } else if (widget.type == UI_WIDGET_SLIDER) {
        state.value += state.direction * 4;
        if (state.value >= state.maxValue) {
          state.value = state.maxValue;
          state.direction = -1;
        } else if (state.value <= 0) {
          state.value = 0;
          state.direction = 1;
        }
        drawSliderWidget(widgetIndex, true);
      }
    }
  }

  if (nowMs - lastWeatherUpdateMs >= 15000) {
    lastWeatherUpdateMs = nowMs;
    for (int widgetIndex = 0; widgetIndex < UI_PAGES[currentPageIndex].widgetCount; widgetIndex++) {
      const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
      if (widget.type != UI_WIDGET_WEATHER) {
        continue;
      }
      WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
      state.phase = (state.phase + 1) % (int)(sizeof(WEATHER_FRAMES) / sizeof(WEATHER_FRAMES[0]));
      drawWeatherWidget(widgetIndex, true);
    }
  }
}

static void setupTouch() {
#if CAPTOUCH_AVAILABLE
  const int rc = capTouch.init(TOUCH_SDA, TOUCH_SCL, TOUCH_RST, TOUCH_INT);
#ifdef CT_SUCCESS
  if (rc == CT_SUCCESS) {
    touchReady = true;
    Serial.println("TOUCH_READY");
  } else {
    Serial.printf("TOUCH_INIT_FAILED rc=%d\n", rc);
  }
#else
  touchReady = rc == 0;
  if (touchReady) {
    Serial.println("TOUCH_READY");
  } else {
    Serial.printf("TOUCH_INIT_FAILED rc=%d\n", rc);
  }
#endif
#else
  Serial.println("TOUCH_NOT_AVAILABLE");
#endif
}

static void setupDisplay() {
  if (display.initPanel(BB_PANEL_M5PAPERS3) == 0) {
    displayReady = true;
    display.setMode(BB_MODE_1BPP);
    display.setPasses(5, 7);
    display.setRotation(90);
    setupTouch();
    initializeWidgetStates();
    display.clearWhite(true);
    if (UI_PAGE_COUNT > 0) {
      renderActivePage();
    } else {
      renderStatusScreen("Successful.");
    }
    Serial.println("FastEPD initialized for M5PaperS3.");
  } else {
    Serial.println("FastEPD init failed for M5PaperS3 (check PSRAM/board settings).");
  }
}
#endif

struct WifiCredentials {
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

static void renderStatusScreen(const char *title, const char *line1, const char *line2) {
#if FASTEPD_AVAILABLE
  if (!displayReady) {
    return;
  }

  display.setMode(BB_MODE_1BPP);
  display.fillScreen(BBEP_WHITE);
  display.setTextColor(BBEP_BLACK, BBEP_WHITE);

  const char *lines[3] = {title, line1, line2};
  int visibleLines = 0;
  for (int i = 0; i < 3; i++) {
    if (lines[i][0] != '\0') {
      visibleLines++;
    }
  }

  display.setFont(FONT_12x16);
  const int lineHeight = 24;
  const int startY = (display.height() - (visibleLines * lineHeight)) / 2;
  int lineIndex = 0;
  for (int i = 0; i < 3; i++) {
    if (lines[i][0] == '\0') {
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

static String extractJsonString(const String &json, const char *key) {
  const String keyPattern = String("\"") + key + "\"";
  const int keyPos = json.indexOf(keyPattern);
  if (keyPos < 0) {
    return "";
  }

  const int colonPos = json.indexOf(':', keyPos + keyPattern.length());
  if (colonPos < 0) {
    return "";
  }

  const int valueStart = json.indexOf('"', colonPos + 1);
  if (valueStart < 0) {
    return "";
  }

  int valueEnd = valueStart + 1;
  bool escaped = false;
  while (valueEnd < json.length()) {
    const char ch = json[valueEnd];
    if (ch == '\\' && !escaped) {
      escaped = true;
      valueEnd++;
      continue;
    }
    if (ch == '"' && !escaped) {
      break;
    }
    escaped = false;
    valueEnd++;
  }

  if (valueEnd >= json.length()) {
    return "";
  }

  String parsed = json.substring(valueStart + 1, valueEnd);
  parsed.replace("\\/", "/");
  parsed.replace("\\\"", "\"");
  parsed.replace("\\\\", "\\");
  return parsed;
}

static bool performOtaFromUrl(const String &firmwareUrl, String &errorOut) {
  if (WiFi.status() != WL_CONNECTED) {
    errorOut = "WIFI_NOT_CONNECTED";
    return false;
  }

  WiFiClient client;
  HTTPClient http;
  http.setTimeout(15000);
  if (!http.begin(client, firmwareUrl)) {
    errorOut = "HTTP_BEGIN_FAILED";
    return false;
  }

  const int statusCode = http.GET();
  if (statusCode != HTTP_CODE_OK) {
    errorOut = String("HTTP_") + statusCode;
    http.end();
    return false;
  }

  int contentLength = http.getSize();
  if (contentLength <= 0) {
    contentLength = UPDATE_SIZE_UNKNOWN;
  }

  if (!Update.begin(static_cast<size_t>(contentLength))) {
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

  while (http.connected() && (contentLength == UPDATE_SIZE_UNKNOWN || writtenTotal < static_cast<size_t>(contentLength))) {
    const size_t available = stream->available();
    if (available == 0) {
      if (millis() - lastDataMs > otaDataTimeoutMs) {
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
    if (readLen == 0) {
      delay(1);
      continue;
    }
    lastDataMs = millis();

    const size_t written = Update.write(buffer, readLen);
    if (written != readLen) {
      errorOut = String("UPDATE_WRITE_") + Update.getError();
      Update.abort();
      http.end();
      return false;
    }
    writtenTotal += written;

    if (contentLength != UPDATE_SIZE_UNKNOWN && millis() - lastProgressLog > 1000) {
      const int percent = static_cast<int>((writtenTotal * 100U) / static_cast<size_t>(contentLength));
      Serial.printf("OTA_PROGRESS=%d\n", percent);
      lastProgressLog = millis();
    }
  }

  if (!Update.end()) {
    errorOut = String("UPDATE_END_") + Update.getError();
    http.end();
    return false;
  }

  if (!Update.isFinished()) {
    errorOut = "UPDATE_INCOMPLETE";
    http.end();
    return false;
  }

  http.end();
  return true;
}

void handleHealth() {
  String payload = "{\"ok\":true,\"wifiConnected\":";
  payload += WiFi.status() == WL_CONNECTED ? "true" : "false";
  payload += ",\"ip\":\"";
  payload += WiFi.localIP().toString();
  payload += "\"}";
  server.send(200, "application/json", payload);
}

void handleRoot() {
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

void handleOtaRequest() {
  String firmwareUrl = "";
  if (server.hasArg("plain")) {
    firmwareUrl = extractJsonString(server.arg("plain"), "firmwareUrl");
  }
  if (firmwareUrl.length() == 0 && server.hasArg("firmwareUrl")) {
    firmwareUrl = server.arg("firmwareUrl");
  }
  firmwareUrl.trim();

  if (firmwareUrl.length() == 0) {
    server.send(400, "application/json", "{\"ok\":false,\"error\":\"missing firmwareUrl\"}");
    return;
  }

  Serial.printf("OTA_START URL=%s\n", firmwareUrl.c_str());
  renderStatusScreen("OTA update", "Downloading...");

  String otaError;
  const bool otaOk = performOtaFromUrl(firmwareUrl, otaError);
  if (!otaOk) {
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

void handleOtaUploadData() {
  HTTPUpload &upload = server.upload();

  if (upload.status == UPLOAD_FILE_START) {
    otaUploadHadError = false;
    otaUploadErrorMessage = "";
    otaUploadStarted = true;
    otaUploadFinished = false;
    otaUploadBytes = 0;
    Serial.printf("OTA_UPLOAD_START NAME=%s SIZE=%d\n", upload.filename.c_str(), upload.totalSize);
    renderStatusScreen("OTA update", "Uploading...");
    if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
      otaUploadHadError = true;
      otaUploadErrorMessage = String("UPDATE_BEGIN_") + Update.getError();
    }
    return;
  }

  if (upload.status == UPLOAD_FILE_WRITE) {
    if (otaUploadHadError) {
      return;
    }
    const size_t written = Update.write(upload.buf, upload.currentSize);
    if (written != upload.currentSize) {
      otaUploadHadError = true;
      otaUploadErrorMessage = String("UPDATE_WRITE_") + Update.getError();
    }
    otaUploadBytes += written;
    return;
  }

  if (upload.status == UPLOAD_FILE_END) {
    if (otaUploadHadError) {
      Update.abort();
      return;
    }
    if (!Update.end(true)) {
      otaUploadHadError = true;
      otaUploadErrorMessage = String("UPDATE_END_") + Update.getError();
      return;
    }
    if (!Update.isFinished()) {
      otaUploadHadError = true;
      otaUploadErrorMessage = "UPDATE_INCOMPLETE";
      return;
    }
    otaUploadFinished = true;
    Serial.println("OTA_UPLOAD_SUCCESS");
    return;
  }

  if (upload.status == UPLOAD_FILE_ABORTED) {
    otaUploadHadError = true;
    otaUploadErrorMessage = "UPLOAD_ABORTED";
    otaUploadFinished = false;
    Update.abort();
    Serial.println("OTA_UPLOAD_ABORTED");
  }
}

void handleOtaUploadRequest() {
  if (!otaUploadStarted || !otaUploadFinished || otaUploadBytes == 0) {
    const String noDataError = "UPLOAD_NO_DATA";
    Serial.printf("OTA_UPLOAD_FAILED %s\n", noDataError.c_str());
    renderStatusScreen("OTA failed", "No upload data");
    server.send(400, "application/json", "{\"ok\":false,\"error\":\"UPLOAD_NO_DATA\"}");
    return;
  }

  if (otaUploadHadError) {
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

void handleAutomationSwitchState() {
  String payload = "{\"enabled\":";
  bool enabled = false;
  if (getPrimarySwitchState(enabled)) {
    payload += enabled ? "true" : "false";
  } else {
    payload += "false";
  }
  payload += "}";
  server.send(200, "application/json", payload);
}

void handleAutomationSwitchSet() {
  bool currentEnabled = false;
  const bool hasSwitch = getPrimarySwitchState(currentEnabled);
  bool nextState = hasSwitch ? !currentEnabled : false;

  if (server.hasArg("enabled")) {
    String lowered = server.arg("enabled");
    lowered.toLowerCase();
    nextState = lowered == "1" || lowered == "true" || lowered == "on";
  }

  if (!hasSwitch) {
    server.send(404, "application/json", "{\"ok\":false,\"error\":\"NO_SWITCH_WIDGET\"}");
    return;
  }

  if (nextState != currentEnabled) {
    setPrimarySwitchState(nextState, true);
    Serial.printf("AUTOMATION_SWITCH=%d\n", nextState ? 1 : 0);
  }

  String payload = "{\"ok\":true,\"enabled\":";
  payload += nextState ? "true" : "false";
  payload += "}";
  server.send(200, "application/json", payload);
}

static WifiCredentials loadCredentials() {
  WifiCredentials credentials = {"", "", false};

  if (preferences.begin("wifi", false)) {
    if (preferences.isKey("ssid")) {
      credentials.ssid = preferences.getString("ssid", "");
    }
    if (preferences.isKey("password")) {
      credentials.password = preferences.getString("password", "");
    }
    preferences.end();
  } else {
    Serial.println("WIFI_PREFS_UNAVAILABLE");
  }

  if (credentials.ssid.length() > 0) {
    credentials.valid = true;
    Serial.println("WIFI_SOURCE=NVS");
    return credentials;
  }

  credentials.ssid = WIFI_SSID_BUILD;
  credentials.password = WIFI_PASSWORD_BUILD;
  credentials.valid = credentials.ssid.length() > 0;
  if (credentials.valid) {
    Serial.println("WIFI_SOURCE=WEB_BUILD");
    return credentials;
  }

  credentials.ssid = WIFI_SSID_PIO;
  credentials.password = WIFI_PASSWORD_PIO;
  credentials.valid = credentials.ssid.length() > 0;
  if (credentials.valid) {
    Serial.println("WIFI_SOURCE=PIO_ENV");
    return credentials;
  }

  credentials.ssid = WIFI_SSID;
  credentials.password = WIFI_PASSWORD;
  credentials.valid = credentials.ssid.length() > 0;
  if (credentials.valid) {
    Serial.println("WIFI_SOURCE=DEVICE_CONFIG");
  }
  return credentials;
}

static void saveCredentials(const String &ssid, const String &password) {
  if (!preferences.begin("wifi", false)) {
    Serial.println("WIFI_SAVE_FAILED");
    return;
  }
  preferences.putString("ssid", ssid);
  preferences.putString("password", password);
  preferences.end();
}

static void startServerIfNeeded() {
  if (!serverStarted && WiFi.status() == WL_CONNECTED) {
    server.begin();
    serverStarted = true;
    Serial.println("HTTP_SERVER_STARTED");
  }
}

static String getDeviceNextUrl() {
  if (WiFi.status() != WL_CONNECTED) {
    return "";
  }
  return String("http://") + WiFi.localIP().toString() + "/";
}

static uint8_t getImprovCurrentState() {
  if (improvProvisioningActive) {
    return IMPROV_STATE_PROVISIONING;
  }
  return WiFi.status() == WL_CONNECTED ? IMPROV_STATE_PROVISIONED : IMPROV_STATE_READY;
}

static void clearImprovPacketState() {
  improvPacketLength = 0;
  improvExpectedLength = 0;
}

static void writeImprovPacket(uint8_t type, const uint8_t *data, size_t dataLength) {
  const size_t totalLength = 7 + 1 + 1 + dataLength + 1;
  if (totalLength > sizeof(improvPacketBuffer)) {
    return;
  }

  size_t offset = 0;
  for (size_t i = 0; i < sizeof(IMPROV_HEADER_BYTES); i++) {
    improvPacketBuffer[offset++] = IMPROV_HEADER_BYTES[i];
  }
  improvPacketBuffer[offset++] = 0x01;
  improvPacketBuffer[offset++] = type;
  improvPacketBuffer[offset++] = static_cast<uint8_t>(dataLength);
  for (size_t i = 0; i < dataLength; i++) {
    improvPacketBuffer[offset++] = data[i];
  }

  uint8_t checksum = 0;
  for (size_t i = 0; i < offset; i++) {
    checksum = static_cast<uint8_t>(checksum + improvPacketBuffer[i]);
  }
  improvPacketBuffer[offset++] = checksum;

  Serial.write(improvPacketBuffer, offset);
  Serial.write('\n');
}

static void sendImprovCurrentStatePacket() {
  const uint8_t payload[1] = {getImprovCurrentState()};
  writeImprovPacket(IMPROV_CURRENT_STATE, payload, sizeof(payload));
}

static void sendImprovErrorPacket(uint8_t error) {
  const uint8_t payload[1] = {error};
  writeImprovPacket(IMPROV_ERROR_STATE, payload, sizeof(payload));
}

static size_t appendImprovStringField(uint8_t *buffer, size_t offset, size_t capacity, const String &value) {
  const size_t len = value.length();
  if (len > 255 || offset + 1 + len > capacity) {
    return offset;
  }
  buffer[offset++] = static_cast<uint8_t>(len);
  for (size_t i = 0; i < len; i++) {
    buffer[offset++] = static_cast<uint8_t>(value[i]);
  }
  return offset;
}

static void sendImprovRpcFields(uint8_t command, const String fields[], size_t fieldCount) {
  uint8_t payload[220];
  payload[0] = command;
  payload[1] = 0;
  size_t offset = 2;

  for (size_t i = 0; i < fieldCount; i++) {
    offset = appendImprovStringField(payload, offset, sizeof(payload), fields[i]);
  }

  payload[1] = static_cast<uint8_t>(offset - 2);
  writeImprovPacket(IMPROV_RPC_RESULT, payload, offset);
}

static void sendImprovInfoPacket() {
  const String fields[] = {
      String(FIRMWARE_DISPLAY_NAME),
      String(FIRMWARE_VERSION_NAME),
      String("ESP32-S3"),
      String(IMPROV_DEVICE_NAME),
  };
  sendImprovRpcFields(IMPROV_RPC_REQUEST_INFO, fields, 4);
}

static void sendImprovCurrentStateResponse() {
  sendImprovCurrentStatePacket();
  if (getImprovCurrentState() == IMPROV_STATE_PROVISIONED) {
    const String fields[] = {getDeviceNextUrl()};
    sendImprovRpcFields(IMPROV_RPC_REQUEST_CURRENT_STATE, fields, 1);
  }
}

static void sendImprovWifiScanResults() {
  const int networkCount = WiFi.scanNetworks(false, true);
  if (networkCount < 0) {
    sendImprovErrorPacket(IMPROV_ERROR_UNKNOWN_RPC_COMMAND);
    return;
  }

  for (int i = 0; i < networkCount; i++) {
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

static void connectWifi(const WifiCredentials &credentials) {
  if (!credentials.valid) {
    Serial.println("WIFI_MISSING_CREDENTIALS");
    return;
  }

  WiFi.disconnect();
  delay(50);
  WiFi.mode(WIFI_STA);
  WiFi.begin(credentials.ssid.c_str(), credentials.password.c_str());
  Serial.printf("WIFI_CONNECTING SSID=%s\n", credentials.ssid.c_str());
}

static bool waitForWifiOrTimeout(uint32_t timeoutMs) {
  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) {
    delay(250);
  }

  if (WiFi.status() == WL_CONNECTED) {
    const String ip = WiFi.localIP().toString();
    Serial.printf("WIFI_CONNECTED IP=%s\n", ip.c_str());
    startServerIfNeeded();
    return true;
  }
  Serial.println("WIFI_CONNECT_TIMEOUT");
  return false;
}

static bool applyProvisioningCredentials(const String &ssid, const String &password) {
  const WifiCredentials previousCredentials = currentCredentials;
  const WifiCredentials candidate = {ssid, password, true};

  improvProvisioningActive = true;
  sendImprovErrorPacket(IMPROV_ERROR_NONE);
  sendImprovCurrentStatePacket();
  renderStatusScreen("Wi-Fi setup", "Connecting...");

  connectWifi(candidate);
  const bool connected = waitForWifiOrTimeout(15000);
  improvProvisioningActive = false;

  if (connected) {
    currentCredentials = candidate;
    saveCredentials(ssid, password);
    sendImprovErrorPacket(IMPROV_ERROR_NONE);
    sendImprovCurrentStatePacket();
    const String fields[] = {getDeviceNextUrl()};
    sendImprovRpcFields(IMPROV_RPC_SEND_WIFI_SETTINGS, fields, 1);
    if (UI_PAGE_COUNT > 0) {
      renderActivePage();
    }
    return true;
  }

  currentCredentials = previousCredentials;
  sendImprovErrorPacket(IMPROV_ERROR_UNABLE_TO_CONNECT);
  sendImprovCurrentStatePacket();
  renderStatusScreen("Wi-Fi setup", "Connection failed");
  if (previousCredentials.valid) {
    connectWifi(previousCredentials);
    waitForWifiOrTimeout(8000);
  }
  return false;
}

static void handleProvisioningCommand(const String &line) {
  if (!line.startsWith("WIFI:")) {
    return;
  }

  const int separator = line.indexOf('|', 5);
  if (separator < 0) {
    Serial.println("WIFI_INVALID_FORMAT");
    return;
  }

  const String ssid = line.substring(5, separator);
  const String password = line.substring(separator + 1);
  if (ssid.length() == 0) {
    Serial.println("WIFI_INVALID_SSID");
    return;
  }

  if (applyProvisioningCredentials(ssid, password)) {
    Serial.println("WIFI_SAVED");
  } else {
    Serial.println("WIFI_CONNECT_FAILED");
  }
}

static void handleImprovRpcPacket(const uint8_t *data, size_t dataLength) {
  if (dataLength < 2) {
    sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
    return;
  }

  const uint8_t command = data[0];
  const uint8_t payloadLength = data[1];
  if (dataLength != static_cast<size_t>(payloadLength) + 2) {
    sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
    return;
  }

  if (command == IMPROV_RPC_REQUEST_CURRENT_STATE) {
    sendImprovCurrentStateResponse();
    return;
  }

  if (command == IMPROV_RPC_REQUEST_INFO) {
    sendImprovInfoPacket();
    return;
  }

  if (command == IMPROV_RPC_REQUEST_WIFI_NETWORKS) {
    sendImprovWifiScanResults();
    return;
  }

  if (command == IMPROV_RPC_SEND_WIFI_SETTINGS) {
    if (payloadLength < 2) {
      sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
      return;
    }
    size_t index = 2;
    const uint8_t ssidLength = data[index++];
    if (index + ssidLength > dataLength) {
      sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
      return;
    }
    String ssid;
    for (uint8_t i = 0; i < ssidLength; i++) {
      ssid += static_cast<char>(data[index++]);
    }
    if (index >= dataLength) {
      sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
      return;
    }
    const uint8_t passwordLength = data[index++];
    if (index + passwordLength > dataLength) {
      sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
      return;
    }
    String password;
    for (uint8_t i = 0; i < passwordLength; i++) {
      password += static_cast<char>(data[index++]);
    }
    if (ssid.length() == 0) {
      sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
      return;
    }
    applyProvisioningCredentials(ssid, password);
    return;
  }

  sendImprovErrorPacket(IMPROV_ERROR_UNKNOWN_RPC_COMMAND);
}

static void processSerialAsciiByte(uint8_t byteValue) {
  const char c = static_cast<char>(byteValue);
  if (c == '\n') {
    String line = serialBuffer;
    serialBuffer = "";
    line.trim();
    handleProvisioningCommand(line);
    return;
  }
  if (c == '\r') {
    return;
  }
  if (byteValue >= 32 && byteValue <= 126) {
    serialBuffer += c;
  }
}

static void flushImprovCandidateToAscii() {
  for (size_t i = 0; i < improvPacketLength; i++) {
    processSerialAsciiByte(improvPacketBuffer[i]);
  }
  clearImprovPacketState();
}

static void handleImprovPacketBuffer() {
  if (improvPacketLength < 10) {
    sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
    clearImprovPacketState();
    return;
  }

  uint8_t checksum = 0;
  for (size_t i = 0; i < improvPacketLength - 1; i++) {
    checksum = static_cast<uint8_t>(checksum + improvPacketBuffer[i]);
  }
  if (checksum != improvPacketBuffer[improvPacketLength - 1]) {
    sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
    clearImprovPacketState();
    return;
  }

  const uint8_t version = improvPacketBuffer[6];
  const uint8_t packetType = improvPacketBuffer[7];
  const uint8_t packetLength = improvPacketBuffer[8];
  if (version != 0x01 || packetType != IMPROV_RPC) {
    sendImprovErrorPacket(IMPROV_ERROR_INVALID_RPC_PACKET);
    clearImprovPacketState();
    return;
  }

  handleImprovRpcPacket(&improvPacketBuffer[9], packetLength);
  clearImprovPacketState();
}

static void handleSerialProvisioning() {
  while (Serial.available() > 0) {
    const uint8_t byteValue = static_cast<uint8_t>(Serial.read());

    if (improvPacketLength == 0) {
      if (byteValue == IMPROV_HEADER_BYTES[0]) {
        improvPacketBuffer[improvPacketLength++] = byteValue;
      } else {
        processSerialAsciiByte(byteValue);
      }
      continue;
    }

    if (improvPacketLength >= sizeof(improvPacketBuffer)) {
      clearImprovPacketState();
      processSerialAsciiByte(byteValue);
      continue;
    }

    improvPacketBuffer[improvPacketLength++] = byteValue;

    if (improvPacketLength <= sizeof(IMPROV_HEADER_BYTES)) {
      const size_t headerIndex = improvPacketLength - 1;
      if (improvPacketBuffer[headerIndex] != IMPROV_HEADER_BYTES[headerIndex]) {
        flushImprovCandidateToAscii();
      }
      continue;
    }

    if (improvPacketLength == 9) {
      improvExpectedLength = 9 + improvPacketBuffer[8] + 1;
      if (improvExpectedLength > sizeof(improvPacketBuffer) || improvExpectedLength < 10) {
        clearImprovPacketState();
      }
      continue;
    }

    if (improvExpectedLength > 0 && improvPacketLength == improvExpectedLength) {
      handleImprovPacketBuffer();
      continue;
    }

    if (byteValue == '\n' && improvExpectedLength == 0) {
      flushImprovCandidateToAscii();
    }
  }
}

void setup() {
  Serial.begin(115200);
  int totalWidgets = 0;
  for (int pageIndex = 0; pageIndex < UI_PAGE_COUNT; pageIndex++) {
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

void loop() {
  handleSerialProvisioning();

  if (WiFi.status() == WL_CONNECTED) {
    startServerIfNeeded();
  }

  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiRetry > 30000) {
    lastWifiRetry = millis();
    connectWifi(currentCredentials);
    waitForWifiOrTimeout(8000);
  }

  if (serverStarted && WiFi.status() == WL_CONNECTED) {
    server.handleClient();
  }
  runDisplayLoop();
}
