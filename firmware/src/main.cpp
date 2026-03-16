#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <Update.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <WebServer.h>
#include <WebSocketsClient.h>
#if __has_include(<esp_heap_caps.h>)
#include <esp_heap_caps.h>
#endif
#if __has_include(<esp_rom_tjpgd.h>)
#include <esp_rom_tjpgd.h>
#define UI_ROM_JPEG_DECODER_AVAILABLE 1
#else
#define UI_ROM_JPEG_DECODER_AVAILABLE 0
#endif
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
#if __has_include("Courier_Prime_10.h")
#include "Courier_Prime_10.h"
#define UI_COURIER_10_AVAILABLE 1
#else
#define UI_COURIER_10_AVAILABLE 0
#endif
#if __has_include("fonts/Lora_24.h")
#include "fonts/Lora_24.h"
#define UI_LORA_24_AVAILABLE 1
#else
#define UI_LORA_24_AVAILABLE 0
#endif
#if __has_include("Lora_10.h")
#include "Lora_10.h"
#define UI_LORA_10_AVAILABLE 1
#else
#define UI_LORA_10_AVAILABLE 0
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
#if __has_include("fonts/Inter_Regular_9.h")
#include "fonts/Inter_Regular_9.h"
#define UI_INTER_9_AVAILABLE 1
#else
#define UI_INTER_9_AVAILABLE 0
#endif
#if __has_include("fonts/Inter_Regular_10.h")
#include "fonts/Inter_Regular_10.h"
#define UI_INTER_10_AVAILABLE 1
#else
#define UI_INTER_10_AVAILABLE 0
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
#if __has_include("fonts/IBMPlexSerif_9.h")
#include "fonts/IBMPlexSerif_9.h"
#define UI_IBM_PLEX_SERIF_9_AVAILABLE 1
#else
#define UI_IBM_PLEX_SERIF_9_AVAILABLE 0
#endif
#if __has_include("fonts/IBMPlexSerif_10.h")
#include "fonts/IBMPlexSerif_10.h"
#define UI_IBM_PLEX_SERIF_10_AVAILABLE 1
#else
#define UI_IBM_PLEX_SERIF_10_AVAILABLE 0
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
#if __has_include("fonts/IBMPlexMono_9.h")
#include "fonts/IBMPlexMono_9.h"
#define UI_IBM_PLEX_MONO_9_AVAILABLE 1
#else
#define UI_IBM_PLEX_MONO_9_AVAILABLE 0
#endif
#if __has_include("fonts/IBMPlexMono_10.h")
#include "fonts/IBMPlexMono_10.h"
#define UI_IBM_PLEX_MONO_10_AVAILABLE 1
#else
#define UI_IBM_PLEX_MONO_10_AVAILABLE 0
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
#if __has_include("Roboto_Thin_10.h")
#include "Roboto_Thin_10.h"
#define UI_ROBOTO_THIN_10_AVAILABLE 1
#else
#define UI_ROBOTO_THIN_10_AVAILABLE 0
#endif
#else
#define FASTEPD_AVAILABLE 0
#define UI_COURIER_10_AVAILABLE 0
#define UI_COURIER_24_AVAILABLE 0
#define UI_LORA_10_AVAILABLE 0
#define UI_LORA_24_AVAILABLE 0
#define UI_INTER_9_AVAILABLE 0
#define UI_INTER_10_AVAILABLE 0
#define UI_INTER_16_AVAILABLE 0
#define UI_INTER_18_AVAILABLE 0
#define UI_INTER_22_AVAILABLE 0
#define UI_IBM_PLEX_SERIF_9_AVAILABLE 0
#define UI_IBM_PLEX_SERIF_10_AVAILABLE 0
#define UI_IBM_PLEX_SERIF_16_AVAILABLE 0
#define UI_IBM_PLEX_SERIF_18_AVAILABLE 0
#define UI_IBM_PLEX_SERIF_22_AVAILABLE 0
#define UI_IBM_PLEX_MONO_9_AVAILABLE 0
#define UI_IBM_PLEX_MONO_10_AVAILABLE 0
#define UI_IBM_PLEX_MONO_16_AVAILABLE 0
#define UI_IBM_PLEX_MONO_18_AVAILABLE 0
#define UI_IBM_PLEX_MONO_20_AVAILABLE 0
#define UI_ROBOTO_REGULAR_20_AVAILABLE 0
#define UI_ROBOTO_THIN_10_AVAILABLE 0
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

#ifndef HOME_ASSISTANT_URL_BUILD
#define HOME_ASSISTANT_URL_BUILD ""
#endif

#ifndef HOME_ASSISTANT_TOKEN_BUILD
#define HOME_ASSISTANT_TOKEN_BUILD ""
#endif

#ifndef HOME_ASSISTANT_ENABLED_BUILD
#define HOME_ASSISTANT_ENABLED_BUILD 0
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

struct ParsedUrl
{
  bool valid;
  bool secure;
  uint16_t port;
  String host;
  String basePath;
};

struct MqttConfig
{
  bool enabled;
  String host;
  uint16_t port;
  String username;
  String password;
  String topicPrefix;
  bool discoveryEnabled;
  String discoveryPrefix;
};

static constexpr uint16_t MQTT_DEFAULT_PORT = 1883;
static const char *MQTT_DEFAULT_DISCOVERY_PREFIX = "homeassistant";
static const char *MQTT_AVAILABILITY_ONLINE = "online";
static const char *MQTT_AVAILABILITY_OFFLINE = "offline";

static ParsedUrl homeAssistantUrl = {false, false, 0, "", ""};
static WebSocketsClient homeAssistantSocket;
static bool homeAssistantSocketStarted = false;
static bool homeAssistantSocketConnected = false;
static bool homeAssistantAuthenticated = false;
static bool homeAssistantSubscriptionActive = false;
static uint32_t lastHomeAssistantPollMs = 0;
static uint32_t lastHomeAssistantSocketSetupMs = 0;
static char lastHomeAssistantError[96] = "";
static WiFiClient mqttNetworkClient;
static PubSubClient mqttClient(mqttNetworkClient);
static MqttConfig mqttConfig = {false, "", MQTT_DEFAULT_PORT, "", "", "", true, MQTT_DEFAULT_DISCOVERY_PREFIX};
static bool mqttConnected = false;
static bool mqttDiscoveryPublished = false;
static uint32_t lastMqttReconnectAttemptMs = 0;
static uint32_t lastMqttTelemetryPublishMs = 0;
static char lastMqttError[96] = "";
static bool currentDarkModeEnabled = UI_THEME_DARK != 0;
static constexpr uint32_t MQTT_TELEMETRY_PUBLISH_INTERVAL_MS = 30000UL;
static constexpr int PAPERS3_BATTERY_ADC_PIN = 3;
static constexpr int PAPERS3_USB_DET_PIN = 5;
static constexpr int PAPERS3_USB_DET_THRESHOLD_MV = 200;
static constexpr float PAPERS3_BATTERY_DIVIDER_RATIO = 2.0f;
static const int WEATHER_FOCUS_FORECAST_DAY_COUNT = 3;
static const int WEATHER_FOCUS_HOURLY_POINT_COUNT = 6;

static void renderStatusScreen(const char *title, const char *line1 = "", const char *line2 = "");
static bool widgetHasHomeAssistantBinding(const UiWidgetConfig &widget);
static bool pageHasHomeAssistantBinding(int pageIndex);
static bool ensureMediaPageCoverLoaded(int pageIndex, bool forceReload = false);
static bool drawCachedMediaCover(int pageIndex, const BB_RECT &rect, int radius);
static bool setActivePageIndex(int nextIndex, bool pageTransition = true);
static bool cycleActivePage(int delta);
static const char *getCurrentPageName();
static bool applyDarkModeSetting(bool enabled);
static void publishMqttPageState();
static void publishMqttDarkModeState();
static void publishMqttTelemetryState();
static void handleMqttMessage(char *topic, uint8_t *payload, unsigned int length);

#if FASTEPD_AVAILABLE
static FASTEPD display;
static bool displayReady = false;
static bool pageReady = false;
// The panel can retain a previously rendered grayscale page across resets, so
// start in a "gray was shown" state and scrub the first mono page render.
static bool lastRenderedPageUsedGrayMode = true;
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
static BB_RECT weatherFocusStatsRect = {0, 0, 0, 0};
static BB_RECT weatherFocusTemperatureChartRect = {0, 0, 0, 0};
static BB_RECT weatherFocusRainChartRect = {0, 0, 0, 0};
static BB_RECT weatherFocusTimelineRect = {0, 0, 0, 0};
static BB_RECT weatherFocusForecastRects[WEATHER_FOCUS_FORECAST_DAY_COUNT];
static BB_RECT mediaPlayerContentRect = {0, 0, 0, 0};
static BB_RECT mediaPlayerBodyRect = {0, 0, 0, 0};
static BB_RECT mediaPlayerCoverRect = {0, 0, 0, 0};
static BB_RECT mediaPlayerProgressRect = {0, 0, 0, 0};
static BB_RECT mediaPlayerPrevButtonRect = {0, 0, 0, 0};
static BB_RECT mediaPlayerPlayPauseButtonRect = {0, 0, 0, 0};
static BB_RECT mediaPlayerNextButtonRect = {0, 0, 0, 0};
static constexpr int UI_MEDIA_COVER_SIZE = 384;
static constexpr size_t UI_MEDIA_COVER_BUFFER_BYTES = (UI_MEDIA_COVER_SIZE * UI_MEDIA_COVER_SIZE) / 2;
static constexpr int UI_MEDIA_PLAYBACK_REFRESH_INTERVAL_SECONDS = 5;

static inline bool uiThemeDark()
{
  return currentDarkModeEnabled;
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
  int currentValue;
  int maxValue;
  bool enabled;
  int direction;
  int phase;
  bool homeAssistantBound;
  bool homeAssistantAvailable;
  uint32_t lastHomeAssistantUpdateMs;
  char lastClockText[16];
  char detailText[48];
} WidgetRuntimeState;

typedef struct
{
  char label[12];
  int temperature;
  int lowTemperature;
  bool lowTemperatureAvailable;
  int precipitationProbability;
  bool precipitationProbabilityAvailable;
  char condition[32];
} WeatherForecastRuntime;

typedef struct
{
  char label[8];
  int temperature;
  bool temperatureAvailable;
  int precipitationProbability;
  bool precipitationProbabilityAvailable;
} WeatherHourlyForecastRuntime;

typedef struct
{
  bool available;
  int temperature;
  char temperatureUnit[8];
  char feelsLikeText[20];
  char humidityText[20];
  char windText[24];
  char pressureText[24];
  bool hasFeelsLike;
  bool hasHumidity;
  bool hasWind;
  bool hasPressure;
  char condition[32];
  uint8_t forecastCount;
  WeatherForecastRuntime forecast[WEATHER_FOCUS_FORECAST_DAY_COUNT];
  uint8_t hourlyForecastCount;
  WeatherHourlyForecastRuntime hourlyForecast[WEATHER_FOCUS_HOURLY_POINT_COUNT];
} WeatherPageRuntimeState;

typedef struct
{
  bool available;
  bool playing;
  bool coverAvailable;
  int elapsedSeconds;
  int durationSeconds;
  int progress;
  uint32_t lastCoverFetchMs;
  uint32_t lastPlaybackTickMs;
  uint8_t *coverPixels;
  char title[80];
  char artist[48];
  char stateLabel[24];
  char coverUrl[256];
} MediaPageRuntimeState;

static WidgetRuntimeState widgetStates[UI_PAGE_COUNT][UI_MAX_WIDGETS_PER_PAGE];
static int weatherPagePhases[UI_PAGE_COUNT];
static WeatherPageRuntimeState weatherPageStates[UI_PAGE_COUNT];
static MediaPageRuntimeState mediaPageStates[UI_PAGE_COUNT];

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
static bool activeMediaPageUsesHomeAssistant();
static bool advanceMediaPagePlaybackClock(int pageIndex, uint32_t nowMs);
static void fillForecastFallbackLabel(char *labelOut, size_t labelOutLen, int fallbackIndex);
static void fillHourlyForecastFallbackLabel(char *labelOut, size_t labelOutLen, int fallbackIndex);

static bool isPointInRectExpanded(int x, int y, const BB_RECT &rect, int pad)
{
  BB_RECT expanded = rect;
  expanded.x -= pad;
  expanded.y -= pad;
  expanded.w += pad * 2;
  expanded.h += pad * 2;
  return isPointInRect(x, y, expanded);
}

static String normalizeDisplayText(const char *text)
{
  return text == nullptr ? "" : String(text);
}

static void getDisplayStringBox(const char *text, BB_RECT *bounds)
{
  const String normalized = normalizeDisplayText(text);
  display.getStringBox(normalized.c_str(), bounds);
}

static size_t utf8CodepointLength(const char *text)
{
  if (text == nullptr || text[0] == '\0')
  {
    return 0;
  }

  const uint8_t lead = static_cast<uint8_t>(text[0]);
  if (lead < 0x80)
  {
    return 1;
  }
  if ((lead & 0xE0) == 0xC0 && text[1] != '\0' && (static_cast<uint8_t>(text[1]) & 0xC0) == 0x80)
  {
    return 2;
  }
  if ((lead & 0xF0) == 0xE0 &&
      text[1] != '\0' &&
      text[2] != '\0' &&
      (static_cast<uint8_t>(text[1]) & 0xC0) == 0x80 &&
      (static_cast<uint8_t>(text[2]) & 0xC0) == 0x80)
  {
    return 3;
  }
  if ((lead & 0xF8) == 0xF0 &&
      text[1] != '\0' &&
      text[2] != '\0' &&
      text[3] != '\0' &&
      (static_cast<uint8_t>(text[1]) & 0xC0) == 0x80 &&
      (static_cast<uint8_t>(text[2]) & 0xC0) == 0x80 &&
      (static_cast<uint8_t>(text[3]) & 0xC0) == 0x80)
  {
    return 4;
  }
  return 1;
}

static size_t utf8CharacterCount(const char *text)
{
  if (text == nullptr)
  {
    return 0;
  }

  size_t count = 0;
  for (size_t offset = 0; text[offset] != '\0';)
  {
    const size_t charLen = utf8CodepointLength(text + offset);
    offset += charLen > 0 ? charLen : 1;
    count++;
  }
  return count;
}

static size_t copyUtf8Prefix(const char *input, size_t maxChars, char *output, size_t outputLen)
{
  if (outputLen == 0)
  {
    return 0;
  }

  output[0] = '\0';
  if (input == nullptr || maxChars == 0)
  {
    return 0;
  }

  const size_t maxBytes = outputLen - 1;
  size_t bytesWritten = 0;
  size_t charsWritten = 0;
  while (input[bytesWritten] != '\0' && charsWritten < maxChars)
  {
    const size_t charLen = utf8CodepointLength(input + bytesWritten);
    if (charLen == 0 || bytesWritten + charLen > maxBytes)
    {
      break;
    }
    memcpy(output + bytesWritten, input + bytesWritten, charLen);
    bytesWritten += charLen;
    charsWritten++;
  }
  output[bytesWritten] = '\0';
  return charsWritten;
}

static int centeredX(const char *text)
{
  BB_RECT bounds;
  getDisplayStringBox(text, &bounds);
  const int x = (display.width() - bounds.w) / 2;
  return x < 0 ? 0 : x;
}

static void printTextAt(const char *text, int x, int y)
{
  display.setCursor(x, y);
  const String normalized = normalizeDisplayText(text);
  display.print(normalized.c_str());
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

static const void *getUiTextFont(UiTextRole role)
{
  if (role == UI_TEXT_TITLE || role == UI_TEXT_HERO)
  {
    return getUiMediaTitleFont();
  }

  switch (getUiFontProfile())
  {
  case UI_FONT_PROFILE_SERIF:
    if (role == UI_TEXT_META)
    {
#if UI_IBM_PLEX_SERIF_9_AVAILABLE
      return IBMPlexSerif_9;
#elif UI_LORA_10_AVAILABLE
      return Lora_10;
#elif UI_IBM_PLEX_SERIF_16_AVAILABLE
      return IBMPlexSerif_16;
#endif
    }
#if UI_IBM_PLEX_SERIF_16_AVAILABLE
    return IBMPlexSerif_16;
#elif UI_IBM_PLEX_SERIF_18_AVAILABLE
    return IBMPlexSerif_18;
#endif
    break;
  case UI_FONT_PROFILE_MONO:
    if (role == UI_TEXT_META)
    {
#if UI_IBM_PLEX_MONO_9_AVAILABLE
      return IBMPlexMono_9;
#elif UI_COURIER_10_AVAILABLE
      return Courier_Prime_10;
#elif UI_IBM_PLEX_MONO_16_AVAILABLE
      return IBMPlexMono_16;
#endif
    }
#if UI_IBM_PLEX_MONO_16_AVAILABLE
    return IBMPlexMono_16;
#elif UI_IBM_PLEX_MONO_18_AVAILABLE
    return IBMPlexMono_18;
#endif
    break;
  case UI_FONT_PROFILE_SYSTEM:
  default:
    if (role == UI_TEXT_META)
    {
#if UI_INTER_9_AVAILABLE
      return Inter_Regular_9;
#elif UI_ROBOTO_THIN_10_AVAILABLE
      return Roboto_Thin_10;
#elif UI_INTER_16_AVAILABLE
      return Inter_Regular_16;
#endif
    }
#if UI_INTER_16_AVAILABLE
    return Inter_Regular_16;
#elif UI_INTER_18_AVAILABLE
    return Inter_Regular_18;
#elif UI_ROBOTO_REGULAR_20_AVAILABLE
    return Roboto_Regular_20;
#endif
    break;
  }

  return nullptr;
}

static const void *getUiWidgetMetaFont()
{
  switch (getUiFontProfile())
  {
  case UI_FONT_PROFILE_SERIF:
#if UI_IBM_PLEX_SERIF_10_AVAILABLE
    return IBMPlexSerif_10;
#elif UI_IBM_PLEX_SERIF_9_AVAILABLE
    return IBMPlexSerif_9;
#elif UI_LORA_10_AVAILABLE
    return Lora_10;
#endif
    break;
  case UI_FONT_PROFILE_MONO:
#if UI_IBM_PLEX_MONO_10_AVAILABLE
    return IBMPlexMono_10;
#elif UI_IBM_PLEX_MONO_9_AVAILABLE
    return IBMPlexMono_9;
#elif UI_COURIER_10_AVAILABLE
    return Courier_Prime_10;
#endif
    break;
  case UI_FONT_PROFILE_SYSTEM:
  default:
#if UI_INTER_10_AVAILABLE
    return Inter_Regular_10;
#elif UI_INTER_9_AVAILABLE
    return Inter_Regular_9;
#elif UI_ROBOTO_THIN_10_AVAILABLE
    return Roboto_Thin_10;
#endif
    break;
  }

  return getUiTextFont(UI_TEXT_META);
}

static int textWidthForCurrentSelection(const char *text)
{
  BB_RECT bounds;
  display.setCursor(0, 0);
  const String normalized = normalizeDisplayText(text);
  display.getStringBox(normalized.c_str(), &bounds);
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

  const size_t inputBytes = strlen(input);
  size_t candidateChars = utf8CharacterCount(input);
  if (hardCharacterLimit > 0 && candidateChars > (size_t)hardCharacterLimit)
  {
    candidateChars = (size_t)hardCharacterLimit;
  }

  candidateChars = copyUtf8Prefix(input, candidateChars, output, outputLen);

  if (customFont != nullptr)
  {
    display.setItalic(false);
    display.setFont(customFont);
  }
  else
  {
    selectTextFont(role);
  }

  if (textWidthForCurrentSelection(output) <= maxWidth &&
      candidateChars == utf8CharacterCount(input) &&
      strlen(output) == inputBytes)
  {
    return;
  }

  for (int chars = (int)candidateChars; chars >= 1; chars--)
  {
    size_t copiedChars = copyUtf8Prefix(input, (size_t)chars, output, outputLen);
    if (copiedChars == 0)
    {
      continue;
    }
    if (strlen(output) + 3 >= outputLen)
    {
      continue;
    }
    strcat(output, "...");
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
  getDisplayStringBox(text, &bounds);
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
  printTextAt(text, x, topY - bounds.y);
  display.setItalic(false);
}

static void selectTextFont(UiTextRole role)
{
  display.setItalic(false);
  const void *customFont = getUiTextFont(role);
  if (customFont != nullptr)
  {
    display.setFont(customFont);
    return;
  }
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

static void selectWidgetMetaFont()
{
  display.setItalic(false);
  const void *customFont = getUiWidgetMetaFont();
  if (customFont != nullptr)
  {
    display.setFont(customFont);
    return;
  }
  selectTextFont(UI_TEXT_META);
}

static int textWidthForRole(const char *text, UiTextRole role)
{
  display.setCursor(0, 0);
  selectTextFont(role);
  BB_RECT bounds;
  getDisplayStringBox(text, &bounds);
  display.setItalic(false);
  return bounds.w;
}

static int widgetMetaTextWidth(const char *text)
{
  display.setCursor(0, 0);
  selectWidgetMetaFont();
  BB_RECT bounds;
  getDisplayStringBox(text, &bounds);
  display.setItalic(false);
  return bounds.w;
}

static int baselineForTopAlignedText(const char *text, UiTextRole role, int topY)
{
  display.setCursor(0, 0);
  selectTextFont(role);
  BB_RECT bounds;
  getDisplayStringBox(text, &bounds);
  display.setItalic(false);
  return topY - bounds.y;
}

static int widgetMetaBaselineForTop(const char *text, int topY)
{
  display.setCursor(0, 0);
  selectWidgetMetaFont();
  BB_RECT bounds;
  getDisplayStringBox(text, &bounds);
  display.setItalic(false);
  return topY - bounds.y;
}

static int customFontTextWidth(const void *font, const char *text)
{
  display.setItalic(false);
  display.setFont(font);
  display.setCursor(0, 0);
  BB_RECT bounds;
  getDisplayStringBox(text, &bounds);
  return bounds.w;
}

static int customFontBaselineForTop(const void *font, const char *text, int topY)
{
  display.setItalic(false);
  display.setFont(font);
  display.setCursor(0, 0);
  BB_RECT bounds;
  getDisplayStringBox(text, &bounds);
  return topY - bounds.y;
}

static void drawCustomTextAtTop(const void *font, const char *text, int x, int topY)
{
  display.setItalic(false);
  display.setFont(font);
  setThemeMonoText();
  display.setCursor(x, customFontBaselineForTop(font, text, topY));
  const String normalized = normalizeDisplayText(text);
  display.print(normalized.c_str());
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
  const String normalized = normalizeDisplayText(text);
  for (int pass = 0; pass < passes; pass++)
  {
    display.setCursor(x + pass, baseline);
    display.print(normalized.c_str());
  }
}

static void drawCustomTextAtTopAA(const void *font, const char *text, int x, int topY)
{
  display.setItalic(false);
  display.setFont(font, true);
  setThemeGrayText();
  display.setCursor(x, customFontBaselineForTop(font, text, topY));
  const String normalized = normalizeDisplayText(text);
  display.print(normalized.c_str());
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

static void drawWidgetMetaText(const char *text, int x, int y)
{
  const void *font = getUiWidgetMetaFont();
  if (font != nullptr)
  {
    display.setItalic(false);
    display.setFont(font);
    setThemeMonoText();
    display.setCursor(x, y);
    const String normalized = normalizeDisplayText(text);
    display.print(normalized.c_str());
    return;
  }

  selectTextFont(UI_TEXT_META);
  setThemeMonoText();
  drawReadableLine(text, x, y);
  display.setItalic(false);
}

static void drawWidgetMetaTextAtTop(const char *text, int x, int topY)
{
  drawWidgetMetaText(text, x, widgetMetaBaselineForTop(text, topY));
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

static BB_RECT grayUpdateBandRect(const BB_RECT &rect)
{
  BB_RECT band = rect;
  band.x = 0;
  band.w = display.width();
  if (band.y < 0)
  {
    band.h += band.y;
    band.y = 0;
  }
  if (band.y + band.h > display.height())
  {
    band.h = display.height() - band.y;
  }
  return band;
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
      BB_RECT updateRect = grayUpdateBandRect(debugIpRect);
#ifdef CLEAR_FAST
      display.fullUpdate(CLEAR_FAST, false, &updateRect);
#else
      display.fullUpdate(1, false, &updateRect);
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
  return activePageIsMediaPlayer() || activePageIsWeatherFocus();
}

static bool showPageChrome()
{
  return UI_PAGE_COUNT > 1;
}

static bool activePageShowsTitle()
{
  return !activePageIsMediaPlayer() && !activePageIsWeatherFocus();
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
  const bool targetUsesGrayMode = activePageUsesGrayMode();
  const bool needsMonoGhostScrub =
      !targetUsesGrayMode &&
      ((pageTransition && lastRenderedPageUsedGrayMode) ||
       (!pageReady && lastRenderedPageUsedGrayMode));
  if (needsMonoGhostScrub)
  {
    display.setMode(BB_MODE_1BPP);
    setThemeMonoText();
    display.clearBlack(true);
    display.clearWhite(true);
  }
  else if (pageTransition)
  {
    display.clearWhite(true);
  }

  if (targetUsesGrayMode)
  {
    if (activePageIsMediaPlayer())
    {
      advanceMediaPagePlaybackClock(currentPageIndex, millis());
      if (activeMediaPageUsesHomeAssistant())
      {
        ensureMediaPageCoverLoaded(currentPageIndex);
      }
    }

    display.setMode(BB_MODE_4BPP);
    setThemeGrayText();
    display.fillScreen(uiGrayPaper());

    if (showPageChrome() && activePageShowsTitle())
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

    if (activePageIsMediaPlayer())
    {
      drawMediaPlayerBody();
    }
    else if (activePageIsWeatherFocus())
    {
      drawWeatherFocusBody();
    }
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

    if (showPageChrome() && activePageShowsTitle())
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

#ifdef CLEAR_FAST
  display.fullUpdate(CLEAR_FAST, false);
#else
  display.fullUpdate(1, false);
#endif

  // FastEPD's backup plane is only used for 1-bpp diffing; calling it after a
  // grayscale render can corrupt adjacent memory because the 4-bpp frame is larger.
  if (!activePageUsesGrayMode())
  {
    display.backupPlane();
  }
  lastRenderedPageUsedGrayMode = targetUsesGrayMode;
  partialCounter = 0;
  lastPartialRefresh = millis();
  pageReady = true;
  lastFullRefreshMs = millis();
}

static const char *getCurrentPageName()
{
  if (UI_PAGE_COUNT <= 0)
  {
    return "";
  }
  if (currentPageIndex < 0 || currentPageIndex >= UI_PAGE_COUNT)
  {
    return UI_PAGES[0].name;
  }
  return UI_PAGES[currentPageIndex].name;
}

static bool setActivePageIndex(int nextIndex, bool pageTransition)
{
  if (UI_PAGE_COUNT <= 0)
  {
    return false;
  }

  const int normalizedIndex = clampInt(nextIndex, 0, UI_PAGE_COUNT - 1);
  if (normalizedIndex == currentPageIndex && pageReady)
  {
    return false;
  }

  currentPageIndex = normalizedIndex;
  if (displayReady)
  {
    renderActivePage(pageTransition && pageReady);
  }
  return true;
}

static bool cycleActivePage(int delta)
{
  if (UI_PAGE_COUNT <= 0)
  {
    return false;
  }

  int nextIndex = currentPageIndex + delta;
  while (nextIndex < 0)
  {
    nextIndex += UI_PAGE_COUNT;
  }
  nextIndex %= UI_PAGE_COUNT;
  return setActivePageIndex(nextIndex, true);
}

static bool applyDarkModeSetting(bool enabled)
{
  if (currentDarkModeEnabled == enabled)
  {
    return false;
  }

  currentDarkModeEnabled = enabled;
  if (displayReady)
  {
    renderActivePage(pageReady);
  }
  return true;
}

static bool homeAssistantConfigured()
{
  return HOME_ASSISTANT_ENABLED_BUILD != 0 &&
         HOME_ASSISTANT_URL_BUILD[0] != '\0' &&
         HOME_ASSISTANT_TOKEN_BUILD[0] != '\0';
}

static bool widgetHasHomeAssistantBinding(const UiWidgetConfig &widget)
{
  return widget.entityId != nullptr && widget.entityId[0] != '\0';
}

static bool pageHasHomeAssistantBinding(int pageIndex)
{
  return pageIndex >= 0 &&
         pageIndex < UI_PAGE_COUNT &&
         UI_PAGES[pageIndex].entityId != nullptr &&
         UI_PAGES[pageIndex].entityId[0] != '\0';
}

static bool activeWeatherPageUsesHomeAssistant()
{
  return activePageIsWeatherFocus() && pageHasHomeAssistantBinding(currentPageIndex);
}

static bool activeMediaPageUsesHomeAssistant()
{
  return activePageIsMediaPlayer() && pageHasHomeAssistantBinding(currentPageIndex);
}

static int mediaPlaybackRefreshBucket(int elapsedSeconds)
{
  const int clamped = elapsedSeconds < 0 ? 0 : elapsedSeconds;
  return clamped / UI_MEDIA_PLAYBACK_REFRESH_INTERVAL_SECONDS;
}

static bool advanceMediaPagePlaybackClock(int pageIndex, uint32_t nowMs)
{
  if (pageIndex < 0 || pageIndex >= UI_PAGE_COUNT)
  {
    return false;
  }

  MediaPageRuntimeState &state = mediaPageStates[pageIndex];
  if (!state.available || !state.playing)
  {
    state.lastPlaybackTickMs = nowMs;
    return false;
  }
  if (state.lastPlaybackTickMs == 0)
  {
    state.lastPlaybackTickMs = nowMs;
    return false;
  }

  const uint32_t elapsedMs = nowMs - state.lastPlaybackTickMs;
  if (elapsedMs < 1000UL)
  {
    return false;
  }

  const int advanceSeconds = static_cast<int>(elapsedMs / 1000UL);
  if (advanceSeconds <= 0)
  {
    return false;
  }

  const int previousElapsed = state.elapsedSeconds;
  int nextElapsed = state.elapsedSeconds + advanceSeconds;
  if (state.durationSeconds > 0)
  {
    nextElapsed = clampInt(nextElapsed, 0, state.durationSeconds);
  }
  else if (nextElapsed < 0)
  {
    nextElapsed = 0;
  }

  state.lastPlaybackTickMs += static_cast<uint32_t>(advanceSeconds) * 1000UL;
  state.elapsedSeconds = nextElapsed;
  state.progress = state.durationSeconds > 0
                       ? clampInt((state.elapsedSeconds * 100) / state.durationSeconds, 0, 100)
                       : 0;
  const bool reachedEnd = state.durationSeconds > 0 &&
                          state.elapsedSeconds >= state.durationSeconds &&
                          previousElapsed < state.durationSeconds;
  return mediaPlaybackRefreshBucket(previousElapsed) != mediaPlaybackRefreshBucket(state.elapsedSeconds) ||
         reachedEnd;
}

static String getEntityDomainString(const char *entityId)
{
  if (entityId == nullptr || entityId[0] == '\0')
  {
    return "";
  }
  String domain = entityId;
  const int separator = domain.indexOf('.');
  return separator > 0 ? domain.substring(0, separator) : "";
}

static bool parseHomeAssistantUrl(const char *rawUrl, ParsedUrl &parsed)
{
  parsed = {false, false, 0, "", ""};
  if (rawUrl == nullptr || rawUrl[0] == '\0')
  {
    return false;
  }

  String url = rawUrl;
  url.trim();
  if (url.length() == 0)
  {
    return false;
  }

  if (url.endsWith("/"))
  {
    url.remove(url.length() - 1);
  }

  if (url.startsWith("https://"))
  {
    parsed.secure = true;
    parsed.port = 443;
    url.remove(0, 8);
  }
  else if (url.startsWith("http://"))
  {
    parsed.secure = false;
    parsed.port = 80;
    url.remove(0, 7);
  }
  else
  {
    return false;
  }

  const int slashIndex = url.indexOf('/');
  String hostPort = slashIndex >= 0 ? url.substring(0, slashIndex) : url;
  parsed.basePath = slashIndex >= 0 ? url.substring(slashIndex) : "";
  if (parsed.basePath.endsWith("/"))
  {
    parsed.basePath.remove(parsed.basePath.length() - 1);
  }

  const int colonIndex = hostPort.indexOf(':');
  if (colonIndex >= 0)
  {
    parsed.host = hostPort.substring(0, colonIndex);
    const int parsedPort = hostPort.substring(colonIndex + 1).toInt();
    if (parsedPort > 0 && parsedPort <= 65535)
    {
      parsed.port = static_cast<uint16_t>(parsedPort);
    }
  }
  else
  {
    parsed.host = hostPort;
  }

  parsed.valid = parsed.host.length() > 0;
  return parsed.valid;
}

static String joinBasePathAndSuffix(const String &basePath, const String &suffix)
{
  if (basePath.length() == 0)
  {
    return suffix;
  }
  if (suffix.startsWith("/"))
  {
    return basePath + suffix;
  }
  return basePath + "/" + suffix;
}

static String getHomeAssistantBaseUrl()
{
  const char *scheme = homeAssistantUrl.secure ? "https://" : "http://";
  String url = String(scheme) + homeAssistantUrl.host;
  const bool usingDefaultPort =
      (homeAssistantUrl.secure && homeAssistantUrl.port == 443) ||
      (!homeAssistantUrl.secure && homeAssistantUrl.port == 80);
  if (!usingDefaultPort)
  {
    url += ":";
    url += homeAssistantUrl.port;
  }
  return url;
}

static String getHomeAssistantApiUrl(const String &suffix)
{
  return getHomeAssistantBaseUrl() + joinBasePathAndSuffix(homeAssistantUrl.basePath, suffix);
}

static String getHomeAssistantWebSocketPath()
{
  return joinBasePathAndSuffix(homeAssistantUrl.basePath, "/api/websocket");
}

static uint8_t *allocateMediaCoverBuffer(size_t size)
{
#if __has_include(<esp_heap_caps.h>)
  void *buffer = heap_caps_malloc(size, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
  if (buffer == nullptr)
  {
    buffer = heap_caps_malloc(size, MALLOC_CAP_8BIT);
  }
  return static_cast<uint8_t *>(buffer);
#else
  return static_cast<uint8_t *>(malloc(size));
#endif
}

static void fillPackedGrayBuffer(uint8_t *buffer, size_t byteCount, uint8_t gray)
{
  if (buffer == nullptr || byteCount == 0)
  {
    return;
  }

  const uint8_t packed = static_cast<uint8_t>(((gray & 0x0F) << 4) | (gray & 0x0F));
  memset(buffer, packed, byteCount);
}

static uint8_t quantizeGrayTo4bppOrdered(uint8_t gray8, int x, int y)
{
  static const uint8_t bayer4x4[4][4] = {
      {0, 8, 2, 10},
      {12, 4, 14, 6},
      {3, 11, 1, 9},
      {15, 7, 13, 5},
  };

  int adjusted = static_cast<int>(gray8) + static_cast<int>(bayer4x4[y & 0x03][x & 0x03]) - 8;
  adjusted = clampInt(adjusted, 0, 255);
  return static_cast<uint8_t>(adjusted >> 4);
}

static void setPackedGrayPixel(uint8_t *buffer, int width, int x, int y, uint8_t gray)
{
  if (buffer == nullptr || width <= 0 || x < 0 || y < 0 || x >= width)
  {
    return;
  }

  const int pitch = (width + 1) / 2;
  const int offset = (y * pitch) + (x / 2);
  if ((x & 1) == 0)
  {
    buffer[offset] = static_cast<uint8_t>((buffer[offset] & 0x0F) | ((gray & 0x0F) << 4));
  }
  else
  {
    buffer[offset] = static_cast<uint8_t>((buffer[offset] & 0xF0) | (gray & 0x0F));
  }
}

static bool resolveMediaCoverUrl(const char *rawCoverUrl, String &resolvedUrl, bool &useHomeAssistantAuth)
{
  resolvedUrl = "";
  useHomeAssistantAuth = false;
  if (rawCoverUrl == nullptr || rawCoverUrl[0] == '\0')
  {
    return false;
  }

  String coverUrl = rawCoverUrl;
  coverUrl.trim();
  if (coverUrl.length() == 0)
  {
    return false;
  }

  const String homeAssistantBaseUrl = getHomeAssistantBaseUrl();
  if (coverUrl.startsWith("http://") || coverUrl.startsWith("https://"))
  {
    resolvedUrl = coverUrl;
    useHomeAssistantAuth = coverUrl.startsWith(homeAssistantBaseUrl);
    return true;
  }

  resolvedUrl = coverUrl.startsWith("/") ? homeAssistantBaseUrl + coverUrl : homeAssistantBaseUrl + "/" + coverUrl;
  useHomeAssistantAuth = true;
  return true;
}

static bool readHttpBinaryBody(HTTPClient &http, uint8_t *&dataOut, size_t &lengthOut)
{
  constexpr size_t maxDownloadBytes = 2 * 1024 * 1024;
  constexpr uint32_t bodyTimeoutMs = 15000;

  dataOut = nullptr;
  lengthOut = 0;

  const int contentLength = http.getSize();
  if (contentLength > static_cast<int>(maxDownloadBytes))
  {
    return false;
  }

  size_t capacity = contentLength > 0 ? static_cast<size_t>(contentLength) : 32768;
  if (capacity == 0)
  {
    capacity = 32768;
  }

  uint8_t *buffer = static_cast<uint8_t *>(malloc(capacity));
  if (buffer == nullptr)
  {
    return false;
  }

  Stream *stream = http.getStreamPtr();
  size_t bytesReadTotal = 0;
  uint32_t lastDataMs = millis();
  while (http.connected() && (contentLength <= 0 || bytesReadTotal < static_cast<size_t>(contentLength)))
  {
    const size_t available = stream->available();
    if (available == 0)
    {
      if (millis() - lastDataMs >= bodyTimeoutMs)
      {
        break;
      }
      delay(1);
      continue;
    }

    size_t toRead = available;
    if (contentLength > 0 && bytesReadTotal + toRead > static_cast<size_t>(contentLength))
    {
      toRead = static_cast<size_t>(contentLength) - bytesReadTotal;
    }
    if (bytesReadTotal + toRead > maxDownloadBytes)
    {
      free(buffer);
      return false;
    }
    if (bytesReadTotal + toRead > capacity)
    {
      size_t newCapacity = capacity;
      while (newCapacity < bytesReadTotal + toRead)
      {
        newCapacity *= 2;
      }
      if (newCapacity > maxDownloadBytes)
      {
        newCapacity = maxDownloadBytes;
      }
      if (newCapacity < bytesReadTotal + toRead)
      {
        free(buffer);
        return false;
      }

      uint8_t *grownBuffer = static_cast<uint8_t *>(realloc(buffer, newCapacity));
      if (grownBuffer == nullptr)
      {
        free(buffer);
        return false;
      }
      buffer = grownBuffer;
      capacity = newCapacity;
    }

    const size_t bytesRead = stream->readBytes(buffer + bytesReadTotal, toRead);
    if (bytesRead == 0)
    {
      if (millis() - lastDataMs >= bodyTimeoutMs)
      {
        break;
      }
      delay(1);
      continue;
    }

    bytesReadTotal += bytesRead;
    lastDataMs = millis();
  }

  if (contentLength > 0 && bytesReadTotal != static_cast<size_t>(contentLength))
  {
    free(buffer);
    return false;
  }
  if (bytesReadTotal < 4)
  {
    free(buffer);
    return false;
  }

  dataOut = buffer;
  lengthOut = bytesReadTotal;
  return true;
}

static bool downloadBinaryUrl(const String &url, bool useHomeAssistantAuth, uint8_t *&dataOut, size_t &lengthOut)
{
  dataOut = nullptr;
  lengthOut = 0;

  if (url.length() == 0 || WiFi.status() != WL_CONNECTED)
  {
    return false;
  }

  HTTPClient http;
  http.setTimeout(15000);

  const String authHeader = String("Bearer ") + HOME_ASSISTANT_TOKEN_BUILD;
  const bool secureUrl = url.startsWith("https://");
  if (secureUrl)
  {
    WiFiClientSecure client;
    client.setInsecure();
    if (!http.begin(client, url))
    {
      return false;
    }
    if (useHomeAssistantAuth)
    {
      http.addHeader("Authorization", authHeader);
    }
    const int statusCode = http.GET();
    if (statusCode != HTTP_CODE_OK)
    {
      http.end();
      return false;
    }
    const bool bodyOk = readHttpBinaryBody(http, dataOut, lengthOut);
    http.end();
    return bodyOk;
  }

  WiFiClient client;
  if (!http.begin(client, url))
  {
    return false;
  }
  if (useHomeAssistantAuth)
  {
    http.addHeader("Authorization", authHeader);
  }
  const int statusCode = http.GET();
  if (statusCode != HTTP_CODE_OK)
  {
    http.end();
    return false;
  }
  const bool bodyOk = readHttpBinaryBody(http, dataOut, lengthOut);
  http.end();
  return bodyOk;
}

static bool isJpegImageData(const uint8_t *data, size_t length)
{
  return data != nullptr &&
         length >= 3 &&
         data[0] == 0xFF &&
         data[1] == 0xD8 &&
         data[2] == 0xFF;
}

#if UI_ROM_JPEG_DECODER_AVAILABLE
typedef struct
{
  const uint8_t *jpegData;
  size_t jpegLength;
  size_t jpegOffset;
  uint8_t *targetPixels;
  uint16_t sourceWidth;
  uint16_t sourceHeight;
  uint16_t cropLeft;
  uint16_t cropTop;
  uint16_t cropSize;
} MediaCoverDecodeContext;

static uint32_t readMediaCoverJpeg(esp_rom_tjpgd_dec_t *decoder, uint8_t *buffer, uint32_t bytesRequested)
{
  MediaCoverDecodeContext *context = static_cast<MediaCoverDecodeContext *>(decoder->device);
  if (context == nullptr || context->jpegOffset >= context->jpegLength)
  {
    return 0;
  }

  size_t available = context->jpegLength - context->jpegOffset;
  if (bytesRequested > available)
  {
    bytesRequested = static_cast<uint32_t>(available);
  }
  if (buffer != nullptr && bytesRequested > 0)
  {
    memcpy(buffer, context->jpegData + context->jpegOffset, bytesRequested);
  }
  context->jpegOffset += bytesRequested;
  return bytesRequested;
}

static void writeMediaCoverPixelRange(MediaCoverDecodeContext &context, int sourceX, int sourceY, uint8_t gray8)
{
  if (sourceX < context.cropLeft ||
      sourceY < context.cropTop ||
      sourceX >= context.cropLeft + context.cropSize ||
      sourceY >= context.cropTop + context.cropSize)
  {
    return;
  }

  const int croppedX = sourceX - context.cropLeft;
  const int croppedY = sourceY - context.cropTop;
  int targetX0 = (croppedX * UI_MEDIA_COVER_SIZE) / context.cropSize;
  int targetX1 = ((croppedX + 1) * UI_MEDIA_COVER_SIZE + context.cropSize - 1) / context.cropSize;
  int targetY0 = (croppedY * UI_MEDIA_COVER_SIZE) / context.cropSize;
  int targetY1 = ((croppedY + 1) * UI_MEDIA_COVER_SIZE + context.cropSize - 1) / context.cropSize;

  if (targetX0 < 0)
  {
    targetX0 = 0;
  }
  if (targetY0 < 0)
  {
    targetY0 = 0;
  }
  if (targetX1 <= targetX0)
  {
    targetX1 = targetX0 + 1;
  }
  if (targetY1 <= targetY0)
  {
    targetY1 = targetY0 + 1;
  }
  if (targetX1 > UI_MEDIA_COVER_SIZE)
  {
    targetX1 = UI_MEDIA_COVER_SIZE;
  }
  if (targetY1 > UI_MEDIA_COVER_SIZE)
  {
    targetY1 = UI_MEDIA_COVER_SIZE;
  }

  for (int yy = targetY0; yy < targetY1; yy++)
  {
    for (int xx = targetX0; xx < targetX1; xx++)
    {
      setPackedGrayPixel(
          context.targetPixels,
          UI_MEDIA_COVER_SIZE,
          xx,
          yy,
          quantizeGrayTo4bppOrdered(gray8, xx, yy));
    }
  }
}

static uint32_t drawMediaCoverJpegBlock(esp_rom_tjpgd_dec_t *decoder, void *bitmap, esp_rom_tjpgd_rect_t *rect)
{
  MediaCoverDecodeContext *context = static_cast<MediaCoverDecodeContext *>(decoder->device);
  if (context == nullptr || bitmap == nullptr || rect == nullptr)
  {
    return 0;
  }

  const int blockWidth = rect->right - rect->left + 1;
  const int blockHeight = rect->bottom - rect->top + 1;
  uint8_t *rgbPixels = static_cast<uint8_t *>(bitmap);
  for (int yy = 0; yy < blockHeight; yy++)
  {
    const int sourceY = rect->top + yy;
    for (int xx = 0; xx < blockWidth; xx++)
    {
      const int sourceX = rect->left + xx;
      const size_t pixelIndex = static_cast<size_t>((yy * blockWidth) + xx) * 3;
      const uint8_t red = rgbPixels[pixelIndex + 0];
      const uint8_t green = rgbPixels[pixelIndex + 1];
      const uint8_t blue = rgbPixels[pixelIndex + 2];
      const uint8_t gray8 = static_cast<uint8_t>(((red * 54) + (green * 183) + (blue * 19) + 128) >> 8);
      writeMediaCoverPixelRange(*context, sourceX, sourceY, gray8);
    }
  }

  return 1;
}

static bool decodeJpegToMediaCover(const uint8_t *jpegData, size_t jpegLength, uint8_t *targetPixels)
{
  if (jpegData == nullptr || jpegLength == 0 || targetPixels == nullptr)
  {
    return false;
  }

  uint8_t *workBuffer = static_cast<uint8_t *>(malloc(6144));
  if (workBuffer == nullptr)
  {
    return false;
  }

  fillPackedGrayBuffer(targetPixels, UI_MEDIA_COVER_BUFFER_BYTES, 15);

  MediaCoverDecodeContext context = {};
  context.jpegData = jpegData;
  context.jpegLength = jpegLength;
  context.targetPixels = targetPixels;

  esp_rom_tjpgd_dec_t decoder = {};
  esp_rom_tjpgd_result_t result = esp_rom_tjpgd_prepare(&decoder, readMediaCoverJpeg, workBuffer, 6144, &context);
  if (result != JDR_OK)
  {
    free(workBuffer);
    return false;
  }

  const uint32_t sourceWidth = decoder.width;
  const uint32_t sourceHeight = decoder.height;
  const uint32_t cropSize = sourceWidth < sourceHeight ? sourceWidth : sourceHeight;
  if (sourceWidth == 0 || sourceHeight == 0 || cropSize == 0)
  {
    free(workBuffer);
    return false;
  }

  uint8_t scale = 0;
  while (scale < 3 && (cropSize >> (scale + 1)) >= UI_MEDIA_COVER_SIZE)
  {
    scale++;
  }

  context.sourceWidth = static_cast<uint16_t>((sourceWidth + ((1U << scale) - 1U)) >> scale);
  context.sourceHeight = static_cast<uint16_t>((sourceHeight + ((1U << scale) - 1U)) >> scale);
  context.cropSize = static_cast<uint16_t>((cropSize + ((1U << scale) - 1U)) >> scale);
  if (context.cropSize == 0)
  {
    context.cropSize = 1;
  }
  context.cropLeft = context.sourceWidth > context.cropSize ? static_cast<uint16_t>((context.sourceWidth - context.cropSize) / 2U) : 0;
  context.cropTop = context.sourceHeight > context.cropSize ? static_cast<uint16_t>((context.sourceHeight - context.cropSize) / 2U) : 0;

  result = esp_rom_tjpgd_decomp(&decoder, drawMediaCoverJpegBlock, scale);
  free(workBuffer);
  return result == JDR_OK;
}
#endif

static bool ensureMediaPageCoverLoaded(int pageIndex, bool forceReload)
{
  if (pageIndex < 0 || pageIndex >= UI_PAGE_COUNT)
  {
    return false;
  }

  MediaPageRuntimeState &state = mediaPageStates[pageIndex];
  if (state.coverUrl[0] == '\0')
  {
    state.coverAvailable = false;
    return false;
  }
  if (!forceReload && state.coverAvailable && state.coverPixels != nullptr)
  {
    return true;
  }

  const uint32_t now = millis();
  if (!forceReload && state.lastCoverFetchMs != 0 && now - state.lastCoverFetchMs < 60000UL)
  {
    return state.coverAvailable;
  }
  state.lastCoverFetchMs = now;

  if (state.coverPixels == nullptr)
  {
    state.coverPixels = allocateMediaCoverBuffer(UI_MEDIA_COVER_BUFFER_BYTES);
    if (state.coverPixels == nullptr)
    {
      state.coverAvailable = false;
      return false;
    }
  }

  fillPackedGrayBuffer(state.coverPixels, UI_MEDIA_COVER_BUFFER_BYTES, 15);

  String coverUrl;
  bool useHomeAssistantAuth = false;
  if (!resolveMediaCoverUrl(state.coverUrl, coverUrl, useHomeAssistantAuth))
  {
    state.coverAvailable = false;
    return false;
  }

  uint8_t *imageData = nullptr;
  size_t imageLength = 0;
  if (!downloadBinaryUrl(coverUrl, useHomeAssistantAuth, imageData, imageLength))
  {
    state.coverAvailable = false;
    return false;
  }

  bool decoded = false;
#if UI_ROM_JPEG_DECODER_AVAILABLE
  if (isJpegImageData(imageData, imageLength))
  {
    decoded = decodeJpegToMediaCover(imageData, imageLength, state.coverPixels);
  }
#endif
  free(imageData);

  state.coverAvailable = decoded;
  return decoded;
}

static bool drawCachedMediaCover(int pageIndex, const BB_RECT &rect, int radius)
{
  if (pageIndex < 0 || pageIndex >= UI_PAGE_COUNT)
  {
    return false;
  }

  const MediaPageRuntimeState &state = mediaPageStates[pageIndex];
  if (!state.coverAvailable || state.coverPixels == nullptr)
  {
    return false;
  }

  const int pitch = UI_MEDIA_COVER_SIZE / 2;
  for (int yy = 0; yy < rect.h; yy++)
  {
    const int destY = rect.y + yy;
    if (destY < 0 || destY >= display.height())
    {
      continue;
    }

    const int sourceY = (yy * UI_MEDIA_COVER_SIZE) / rect.h;
    for (int xx = 0; xx < rect.w; xx++)
    {
      if (!pointInsideRoundedRect(xx, yy, rect.w, rect.h, radius))
      {
        continue;
      }

      const int destX = rect.x + xx;
      if (destX < 0 || destX >= display.width())
      {
        continue;
      }

      const int sourceX = (xx * UI_MEDIA_COVER_SIZE) / rect.w;
      const uint8_t packed = state.coverPixels[(sourceY * pitch) + (sourceX / 2)];
      const uint8_t gray = (sourceX & 1) == 0 ? ((packed >> 4) & 0x0F) : (packed & 0x0F);
      display.drawPixelFast(destX, destY, uiGrayValue(gray));
    }
  }

  return true;
}

static bool homeAssistantRequest(const char *method, const String &url, const String &payload, String &responseOut, int &statusOut)
{
  responseOut = "";
  statusOut = 0;

  if (!homeAssistantConfigured() || !homeAssistantUrl.valid || WiFi.status() != WL_CONNECTED)
  {
    return false;
  }

  HTTPClient http;
  http.setTimeout(15000);
  const String authHeader = String("Bearer ") + HOME_ASSISTANT_TOKEN_BUILD;
  if (homeAssistantUrl.secure)
  {
    WiFiClientSecure client;
    client.setInsecure();
    if (!http.begin(client, url))
    {
      return false;
    }
    http.addHeader("Authorization", authHeader);
    http.addHeader("Content-Type", "application/json");
    statusOut = strcmp(method, "POST") == 0 ? http.POST(payload) : http.GET();
    responseOut = http.getString();
    http.end();
    return true;
  }

  WiFiClient client;
  if (!http.begin(client, url))
  {
    return false;
  }
  http.addHeader("Authorization", authHeader);
  http.addHeader("Content-Type", "application/json");
  statusOut = strcmp(method, "POST") == 0 ? http.POST(payload) : http.GET();
  responseOut = http.getString();
  http.end();
  return true;
}

static bool jsonVariantToFloat(JsonVariantConst variant, float &valueOut)
{
  if (variant.is<float>() || variant.is<double>())
  {
    valueOut = variant.as<float>();
    return true;
  }
  if (variant.is<int>() || variant.is<long>() || variant.is<unsigned int>())
  {
    valueOut = static_cast<float>(variant.as<int>());
    return true;
  }
  if (variant.is<const char *>())
  {
    const char *raw = variant.as<const char *>();
    if (raw == nullptr || raw[0] == '\0')
    {
      return false;
    }
    char *end = nullptr;
    const float parsed = strtof(raw, &end);
    if (end != raw)
    {
      valueOut = parsed;
      return true;
    }
  }
  return false;
}

static int clampPercentFromFloat(float value)
{
  return clampInt(static_cast<int>(roundf(value)), 0, 100);
}

static int climateTemperatureToTenths(float value, int fallbackTenths)
{
  if (!isfinite(value))
  {
    return fallbackTenths;
  }
  const int tenths = static_cast<int>(roundf(value * 10.0f));
  return clampInt(tenths, 120, 300);
}

static void normalizeTemperatureUnitLabel(const char *rawUnit, char *unitOut, size_t unitOutLen)
{
  if (unitOutLen == 0)
  {
    return;
  }

  if (rawUnit == nullptr || rawUnit[0] == '\0')
  {
    snprintf(unitOut, unitOutLen, "\xC2\xB0"
                                 "C");
    return;
  }

  if (rawUnit[0] == '\xC2' && rawUnit[1] == '\xB0')
  {
    snprintf(unitOut, unitOutLen, "%s", rawUnit);
    return;
  }

  if (rawUnit[1] == '\0' &&
      ((rawUnit[0] >= 'a' && rawUnit[0] <= 'z') || (rawUnit[0] >= 'A' && rawUnit[0] <= 'Z')))
  {
    const char normalizedUnit = rawUnit[0] >= 'a' && rawUnit[0] <= 'z'
                                    ? static_cast<char>(rawUnit[0] - ('a' - 'A'))
                                    : rawUnit[0];
    snprintf(unitOut, unitOutLen, "\xC2\xB0"
                                  "%c",
             normalizedUnit);
    return;
  }

  snprintf(unitOut, unitOutLen, "%s", rawUnit);
}

static void formatRoundedMetricText(float value, const char *suffix, char *textOut, size_t textOutLen)
{
  if (textOutLen == 0)
  {
    return;
  }

  const int roundedValue = static_cast<int>(roundf(value));
  if (suffix != nullptr && suffix[0] != '\0')
  {
    if ((suffix[0] == '\xC2' && suffix[1] == '\xB0') ||
        (suffix[0] == '%' && suffix[1] == '\0'))
    {
      snprintf(textOut, textOutLen, "%d%s", roundedValue, suffix);
      return;
    }
    snprintf(textOut, textOutLen, "%d %s", roundedValue, suffix);
    return;
  }
  snprintf(textOut, textOutLen, "%d", roundedValue);
}

static bool tryFormatRoundedMetricText(JsonVariantConst variant, const char *suffix, char *textOut, size_t textOutLen)
{
  float numericValue = 0.0f;
  if (!jsonVariantToFloat(variant, numericValue))
  {
    return false;
  }
  formatRoundedMetricText(numericValue, suffix, textOut, textOutLen);
  return true;
}

static void drawHomeAssistantBackedWidget(int pageIndex, int widgetIndex)
{
  if (!displayReady || !pageReady || pageIndex != currentPageIndex)
  {
    return;
  }

  const UiWidgetConfig widget = getWidgetConfig(pageIndex, widgetIndex);
  switch (widget.type)
  {
  case UI_WIDGET_WEATHER:
    drawWeatherWidget(widgetIndex, true);
    break;
  case UI_WIDGET_PROGRESS:
    drawProgressWidget(widgetIndex, true);
    break;
  case UI_WIDGET_SWITCH:
    drawSwitchWidget(widgetIndex, true);
    break;
  case UI_WIDGET_SLIDER:
    drawSliderWidget(widgetIndex, true);
    break;
  case UI_WIDGET_THERMOSTAT:
    drawThermostatWidget(widgetIndex, true);
    break;
  default:
    break;
  }
}

static bool applyHomeAssistantStateToWidget(int pageIndex, int widgetIndex, JsonObjectConst stateObject, bool redraw)
{
  const UiWidgetConfig widget = getWidgetConfig(pageIndex, widgetIndex);
  if (!widgetHasHomeAssistantBinding(widget))
  {
    return false;
  }

  WidgetRuntimeState &state = getWidgetState(pageIndex, widgetIndex);
  JsonObjectConst attributes = stateObject["attributes"].as<JsonObjectConst>();
  const char *rawState = stateObject["state"] | "";
  const bool entityAvailable =
      rawState[0] == '\0' ||
      (strcmp(rawState, "unavailable") != 0 &&
       strcmp(rawState, "unknown") != 0 &&
       strcmp(rawState, "none") != 0);
  const bool previousHomeAssistantAvailable = state.homeAssistantAvailable;
  bool changed = false;

  if (widget.type == UI_WIDGET_SWITCH)
  {
    const bool nextEnabled =
        strcmp(rawState, "on") == 0 ||
        strcmp(rawState, "open") == 0 ||
        strcmp(rawState, "playing") == 0;
    changed = state.enabled != nextEnabled;
    state.enabled = nextEnabled;
  }
  else if (widget.type == UI_WIDGET_PROGRESS)
  {
    float numericValue = 0.0f;
    int nextValue = entityAvailable ? state.value : 0;
    if (entityAvailable && jsonVariantToFloat(stateObject["state"], numericValue))
    {
      nextValue = clampPercentFromFloat(numericValue);
    }
    else if (entityAvailable &&
             (jsonVariantToFloat(attributes["percentage"], numericValue) ||
              jsonVariantToFloat(attributes["humidity"], numericValue)))
    {
      nextValue = clampPercentFromFloat(numericValue);
    }
    changed = state.value != nextValue;
    state.value = nextValue;
  }
  else if (widget.type == UI_WIDGET_SLIDER)
  {
    float numericValue = 0.0f;
    int nextValue = state.value;
    const String domain = getEntityDomainString(widget.entityId);
    if (domain == "light")
    {
      if (jsonVariantToFloat(attributes["brightness"], numericValue))
      {
        nextValue = clampPercentFromFloat((numericValue / 255.0f) * 100.0f);
      }
      else
      {
        nextValue = strcmp(rawState, "on") == 0 ? 100 : 0;
      }
    }
    else if (domain == "cover" && jsonVariantToFloat(attributes["current_position"], numericValue))
    {
      nextValue = clampPercentFromFloat(numericValue);
    }
    else if (domain == "media_player" && jsonVariantToFloat(attributes["volume_level"], numericValue))
    {
      nextValue = clampPercentFromFloat(numericValue * 100.0f);
    }
    else if ((domain == "fan" && jsonVariantToFloat(attributes["percentage"], numericValue)) ||
             (domain == "humidifier" && jsonVariantToFloat(attributes["humidity"], numericValue)) ||
             jsonVariantToFloat(attributes["percentage"], numericValue) ||
             jsonVariantToFloat(stateObject["state"], numericValue))
    {
      nextValue = clampPercentFromFloat(numericValue);
    }
    changed = state.value != nextValue;
    state.value = nextValue;
  }
  else if (widget.type == UI_WIDGET_THERMOSTAT)
  {
    float numericValue = 0.0f;
    const int maxTemp = widget.maxValue > 0 ? widget.maxValue : 300;
    int nextCurrent = state.currentValue > 0 ? state.currentValue : widget.currentValue;
    int nextTarget = state.value > 0 ? state.value : widget.value;

    if (jsonVariantToFloat(attributes["current_temperature"], numericValue))
    {
      nextCurrent = climateTemperatureToTenths(numericValue, nextCurrent);
    }
    if (jsonVariantToFloat(attributes["temperature"], numericValue))
    {
      nextTarget = climateTemperatureToTenths(numericValue, nextTarget);
    }
    else if (jsonVariantToFloat(stateObject["state"], numericValue))
    {
      nextTarget = climateTemperatureToTenths(numericValue, nextTarget);
    }

    nextTarget = clampInt(nextTarget, 120, maxTemp);
    changed = state.currentValue != nextCurrent || state.value != nextTarget;
    state.currentValue = nextCurrent;
    state.value = nextTarget;
  }
  else if (widget.type == UI_WIDGET_WEATHER)
  {
    float numericValue = 0.0f;
    int nextTemp = state.value;
    if (jsonVariantToFloat(attributes["temperature"], numericValue) ||
        jsonVariantToFloat(attributes["native_temperature"], numericValue))
    {
      nextTemp = static_cast<int>(roundf(numericValue));
    }

    char nextCondition[sizeof(state.detailText)];
    snprintf(nextCondition, sizeof(nextCondition), "%s", rawState);
    changed = state.value != nextTemp || strcmp(state.detailText, nextCondition) != 0;
    state.value = nextTemp;
    snprintf(state.detailText, sizeof(state.detailText), "%s", nextCondition);
  }

  state.homeAssistantAvailable = entityAvailable;
  state.lastHomeAssistantUpdateMs = millis();
  changed = changed || previousHomeAssistantAvailable != entityAvailable;

  if (changed && redraw)
  {
    drawHomeAssistantBackedWidget(pageIndex, widgetIndex);
  }
  return changed;
}

static bool fillWeekdayLabelForDate(int year, int month, int day, char *labelOut, size_t labelOutLen)
{
  if (labelOutLen == 0)
  {
    return false;
  }

  struct tm timeInfo;
  memset(&timeInfo, 0, sizeof(timeInfo));
  timeInfo.tm_year = year - 1900;
  timeInfo.tm_mon = month - 1;
  timeInfo.tm_mday = day;
  timeInfo.tm_hour = 12;
  timeInfo.tm_isdst = -1;
  if (mktime(&timeInfo) == (time_t)-1)
  {
    return false;
  }

  return strftime(labelOut, labelOutLen, "%a", &timeInfo) > 0;
}

static void fillForecastFallbackLabel(char *labelOut, size_t labelOutLen, int fallbackIndex)
{
  if (labelOutLen == 0)
  {
    return;
  }

  struct tm timeInfo;
  if (readClockTime(timeInfo))
  {
    timeInfo.tm_hour = 12;
    timeInfo.tm_min = 0;
    timeInfo.tm_sec = 0;
    timeInfo.tm_mday += fallbackIndex + 1;
    timeInfo.tm_isdst = -1;
    if (mktime(&timeInfo) != (time_t)-1 &&
        strftime(labelOut, labelOutLen, "%a", &timeInfo) > 0)
    {
      return;
    }
  }

  snprintf(labelOut, labelOutLen, "Day %d", fallbackIndex + 1);
}

static int getLocalUtcOffsetSeconds(time_t epoch)
{
  struct tm localTimeInfo;
  struct tm utcTimeInfo;
  localtime_r(&epoch, &localTimeInfo);
  gmtime_r(&epoch, &utcTimeInfo);
  return static_cast<int>(difftime(mktime(&localTimeInfo), mktime(&utcTimeInfo)));
}

static bool parseForecastTimeInfo(const char *rawDatetime, struct tm &timeInfo, int defaultHour)
{
  if (rawDatetime == nullptr || rawDatetime[0] == '\0')
  {
    return false;
  }

  memset(&timeInfo, 0, sizeof(timeInfo));
  const size_t length = strlen(rawDatetime);
  int year = 0;
  int month = 0;
  int day = 0;
  int hour = defaultHour;
  int minute = 0;
  int second = 0;
  bool hasTimeZone = false;
  int parsedOffsetSeconds = 0;

  if (length >= 16 && rawDatetime[10] == 'T')
  {
    const int scanned = sscanf(rawDatetime, "%d-%d-%dT%d:%d:%d", &year, &month, &day, &hour, &minute, &second);
    if (scanned < 5)
    {
      return false;
    }

    const char *timeZoneCursor = strchr(rawDatetime + 16, 'Z');
    if (timeZoneCursor != nullptr)
    {
      hasTimeZone = true;
      parsedOffsetSeconds = 0;
    }
    else
    {
      timeZoneCursor = strpbrk(rawDatetime + 16, "+-");
      if (timeZoneCursor != nullptr)
      {
        int offsetHours = 0;
        int offsetMinutes = 0;
        if (sscanf(timeZoneCursor + 1, "%d:%d", &offsetHours, &offsetMinutes) >= 1)
        {
          hasTimeZone = true;
          parsedOffsetSeconds = (offsetHours * 3600) + (offsetMinutes * 60);
          if (*timeZoneCursor == '-')
          {
            parsedOffsetSeconds *= -1;
          }
        }
      }
    }
  }
  else if (length >= 10)
  {
    if (sscanf(rawDatetime, "%d-%d-%d", &year, &month, &day) != 3)
    {
      return false;
    }
  }
  else
  {
    return false;
  }

  timeInfo.tm_year = year - 1900;
  timeInfo.tm_mon = month - 1;
  timeInfo.tm_mday = day;
  timeInfo.tm_hour = hour;
  timeInfo.tm_min = minute;
  timeInfo.tm_sec = second;
  timeInfo.tm_isdst = -1;

  time_t epoch = mktime(&timeInfo);
  if (epoch == (time_t)-1)
  {
    return false;
  }

  if (hasTimeZone)
  {
    epoch += getLocalUtcOffsetSeconds(epoch) - parsedOffsetSeconds;
    localtime_r(&epoch, &timeInfo);
  }
  return true;
}

static void fillForecastLabelFromDatetime(const char *rawDatetime, char *labelOut, size_t labelOutLen, int fallbackIndex)
{
  if (labelOutLen == 0)
  {
    return;
  }

  struct tm timeInfo;
  if (parseForecastTimeInfo(rawDatetime, timeInfo, 12) &&
      strftime(labelOut, labelOutLen, "%a", &timeInfo) > 0)
  {
    return;
  }

  fillForecastFallbackLabel(labelOut, labelOutLen, fallbackIndex);
}

static void fillHourlyForecastFallbackLabel(char *labelOut, size_t labelOutLen, int fallbackIndex)
{
  if (labelOutLen == 0)
  {
    return;
  }

  struct tm timeInfo;
  if (readClockTime(timeInfo))
  {
    timeInfo.tm_min = 0;
    timeInfo.tm_sec = 0;
    timeInfo.tm_hour += fallbackIndex + 1;
    timeInfo.tm_isdst = -1;
    if (mktime(&timeInfo) != (time_t)-1 &&
        strftime(labelOut, labelOutLen, "%H:%M", &timeInfo) > 0)
    {
      return;
    }
  }

  snprintf(labelOut, labelOutLen, "%02d:00", (fallbackIndex + 1) % 24);
}

static void fillHourlyForecastLabelFromDatetime(const char *rawDatetime, char *labelOut, size_t labelOutLen, int fallbackIndex)
{
  if (labelOutLen == 0)
  {
    return;
  }

  struct tm timeInfo;
  if (parseForecastTimeInfo(rawDatetime, timeInfo, 0) &&
      strftime(labelOut, labelOutLen, "%H:%M", &timeInfo) > 0)
  {
    return;
  }

  fillHourlyForecastFallbackLabel(labelOut, labelOutLen, fallbackIndex);
}

static int compareForecastDateToToday(const char *rawDatetime)
{
  struct tm forecastTimeInfo;
  struct tm currentTimeInfo;
  if (!parseForecastTimeInfo(rawDatetime, forecastTimeInfo, 12) ||
      !readClockTime(currentTimeInfo))
  {
    return 0;
  }

  if (forecastTimeInfo.tm_year != currentTimeInfo.tm_year)
  {
    return forecastTimeInfo.tm_year < currentTimeInfo.tm_year ? -1 : 1;
  }
  if (forecastTimeInfo.tm_mon != currentTimeInfo.tm_mon)
  {
    return forecastTimeInfo.tm_mon < currentTimeInfo.tm_mon ? -1 : 1;
  }
  if (forecastTimeInfo.tm_mday != currentTimeInfo.tm_mday)
  {
    return forecastTimeInfo.tm_mday < currentTimeInfo.tm_mday ? -1 : 1;
  }
  return 0;
}

static bool readForecastPrecipitationProbability(JsonObjectConst entry, int &probabilityOut)
{
  float probabilityValue = 0.0f;
  if (!jsonVariantToFloat(entry["precipitation_probability"], probabilityValue))
  {
    return false;
  }

  probabilityOut = clampInt(static_cast<int>(roundf(probabilityValue)), 0, 100);
  return true;
}

static bool applyHomeAssistantDailyForecastToWeatherPage(int pageIndex, JsonArrayConst forecastArray)
{
  if (pageIndex < 0 || pageIndex >= UI_PAGE_COUNT)
  {
    return false;
  }

  WeatherPageRuntimeState &state = weatherPageStates[pageIndex];
  bool changed = false;
  uint8_t forecastCount = 0;
  int seenDayKeys[WEATHER_FOCUS_FORECAST_DAY_COUNT + 8];
  int seenDayCount = 0;

  if (!forecastArray.isNull())
  {
    for (JsonObjectConst entry : forecastArray)
    {
      if (forecastCount >= WEATHER_FOCUS_FORECAST_DAY_COUNT)
      {
        break;
      }

      const char *entryDatetime = entry["datetime"] | "";
      if (entryDatetime[0] == '\0')
      {
        entryDatetime = entry["time"] | "";
      }

      struct tm forecastTimeInfo;
      const bool hasForecastDate = parseForecastTimeInfo(entryDatetime, forecastTimeInfo, 12);
      if (hasForecastDate)
      {
        if (compareForecastDateToToday(entryDatetime) <= 0)
        {
          continue;
        }

        const int dayKey = ((forecastTimeInfo.tm_year + 1900) * 10000) +
                           ((forecastTimeInfo.tm_mon + 1) * 100) +
                           forecastTimeInfo.tm_mday;
        bool alreadySeen = false;
        for (int seenIndex = 0; seenIndex < seenDayCount; seenIndex++)
        {
          if (seenDayKeys[seenIndex] == dayKey)
          {
            alreadySeen = true;
            break;
          }
        }
        if (alreadySeen)
        {
          continue;
        }
        seenDayKeys[seenDayCount++] = dayKey;
      }

      WeatherForecastRuntime &forecastItem = state.forecast[forecastCount];
      const char *entryCondition = entry["condition"] | state.condition;

      float forecastTempValue = 0.0f;
      int forecastTemp = forecastItem.temperature;
      if (jsonVariantToFloat(entry["temperature"], forecastTempValue) ||
          jsonVariantToFloat(entry["native_temperature"], forecastTempValue))
      {
        forecastTemp = static_cast<int>(roundf(forecastTempValue));
      }

      int nextLowTemp = forecastItem.lowTemperature;
      bool nextLowTempAvailable = false;
      if (jsonVariantToFloat(entry["templow"], forecastTempValue) ||
          jsonVariantToFloat(entry["native_templow"], forecastTempValue))
      {
        nextLowTemp = static_cast<int>(roundf(forecastTempValue));
        nextLowTempAvailable = true;
      }

      int nextPrecipitationProbability = forecastItem.precipitationProbability;
      const bool nextPrecipitationProbabilityAvailable =
          readForecastPrecipitationProbability(entry, nextPrecipitationProbability);

      char nextLabel[sizeof(forecastItem.label)];
      fillForecastLabelFromDatetime(entryDatetime, nextLabel, sizeof(nextLabel), forecastCount);

      changed = changed ||
                forecastItem.temperature != forecastTemp ||
                forecastItem.lowTemperature != nextLowTemp ||
                forecastItem.lowTemperatureAvailable != nextLowTempAvailable ||
                forecastItem.precipitationProbability != nextPrecipitationProbability ||
                forecastItem.precipitationProbabilityAvailable != nextPrecipitationProbabilityAvailable ||
                strcmp(forecastItem.condition, entryCondition) != 0 ||
                strcmp(forecastItem.label, nextLabel) != 0;

      forecastItem.temperature = forecastTemp;
      forecastItem.lowTemperature = nextLowTemp;
      forecastItem.lowTemperatureAvailable = nextLowTempAvailable;
      forecastItem.precipitationProbability = nextPrecipitationProbability;
      forecastItem.precipitationProbabilityAvailable = nextPrecipitationProbabilityAvailable;
      snprintf(forecastItem.condition, sizeof(forecastItem.condition), "%s", entryCondition);
      snprintf(forecastItem.label, sizeof(forecastItem.label), "%s", nextLabel);
      forecastCount++;
    }
  }

  changed = changed || state.forecastCount != forecastCount;
  state.forecastCount = forecastCount;
  return changed;
}

static bool applyHomeAssistantHourlyForecastToWeatherPage(int pageIndex, JsonArrayConst forecastArray)
{
  if (pageIndex < 0 || pageIndex >= UI_PAGE_COUNT)
  {
    return false;
  }

  WeatherPageRuntimeState &state = weatherPageStates[pageIndex];
  bool changed = false;
  uint8_t forecastCount = 0;

  if (!forecastArray.isNull())
  {
    for (JsonObjectConst entry : forecastArray)
    {
      if (forecastCount >= WEATHER_FOCUS_HOURLY_POINT_COUNT)
      {
        break;
      }

      WeatherHourlyForecastRuntime &forecastItem = state.hourlyForecast[forecastCount];
      const char *entryDatetime = entry["datetime"] | "";
      if (entryDatetime[0] == '\0')
      {
        entryDatetime = entry["time"] | "";
      }

      float forecastTempValue = 0.0f;
      int forecastTemp = forecastItem.temperature;
      bool forecastTempAvailable = false;
      if (jsonVariantToFloat(entry["temperature"], forecastTempValue) ||
          jsonVariantToFloat(entry["native_temperature"], forecastTempValue))
      {
        forecastTemp = static_cast<int>(roundf(forecastTempValue));
        forecastTempAvailable = true;
      }

      int nextPrecipitationProbability = forecastItem.precipitationProbability;
      const bool nextPrecipitationProbabilityAvailable =
          readForecastPrecipitationProbability(entry, nextPrecipitationProbability);

      char nextLabel[sizeof(forecastItem.label)];
      fillHourlyForecastLabelFromDatetime(entryDatetime, nextLabel, sizeof(nextLabel), forecastCount);

      changed = changed ||
                forecastItem.temperature != forecastTemp ||
                forecastItem.temperatureAvailable != forecastTempAvailable ||
                forecastItem.precipitationProbability != nextPrecipitationProbability ||
                forecastItem.precipitationProbabilityAvailable != nextPrecipitationProbabilityAvailable ||
                strcmp(forecastItem.label, nextLabel) != 0;

      forecastItem.temperature = forecastTemp;
      forecastItem.temperatureAvailable = forecastTempAvailable;
      forecastItem.precipitationProbability = nextPrecipitationProbability;
      forecastItem.precipitationProbabilityAvailable = nextPrecipitationProbabilityAvailable;
      snprintf(forecastItem.label, sizeof(forecastItem.label), "%s", nextLabel);
      forecastCount++;
    }
  }

  changed = changed || state.hourlyForecastCount != forecastCount;
  state.hourlyForecastCount = forecastCount;
  return changed;
}

static bool applyHomeAssistantStateToPage(int pageIndex, JsonObjectConst stateObject, bool redraw)
{
  if (!pageHasHomeAssistantBinding(pageIndex))
  {
    return false;
  }

  const UiPageConfig &page = UI_PAGES[pageIndex];
  JsonObjectConst attributes = stateObject["attributes"].as<JsonObjectConst>();
  const char *rawState = stateObject["state"] | "";

  if (page.pageType == UI_PAGE_WEATHER_FOCUS)
  {
    WeatherPageRuntimeState &state = weatherPageStates[pageIndex];
    bool changed = false;
    float numericValue = 0.0f;
    int nextTemp = state.temperature;
    if (jsonVariantToFloat(attributes["temperature"], numericValue) ||
        jsonVariantToFloat(attributes["native_temperature"], numericValue))
    {
      nextTemp = static_cast<int>(roundf(numericValue));
    }

    const char *rawTempUnit = attributes["temperature_unit"] | "";
    if (rawTempUnit[0] == '\0')
    {
      rawTempUnit = attributes["native_temperature_unit"] | "";
    }
    char nextTempUnit[sizeof(state.temperatureUnit)];
    normalizeTemperatureUnitLabel(rawTempUnit, nextTempUnit, sizeof(nextTempUnit));

    char nextCondition[sizeof(state.condition)];
    snprintf(nextCondition, sizeof(nextCondition), "%s", rawState);
    changed = state.temperature != nextTemp ||
              strcmp(state.temperatureUnit, nextTempUnit) != 0 ||
              strcmp(state.condition, nextCondition) != 0;

    char nextFeelsLikeText[sizeof(state.feelsLikeText)];
    bool nextHasFeelsLike =
        tryFormatRoundedMetricText(attributes["apparent_temperature"], nextTempUnit, nextFeelsLikeText, sizeof(nextFeelsLikeText)) ||
        tryFormatRoundedMetricText(attributes["native_apparent_temperature"], nextTempUnit, nextFeelsLikeText, sizeof(nextFeelsLikeText));
    changed = changed ||
              state.hasFeelsLike != nextHasFeelsLike ||
              strcmp(state.feelsLikeText, nextHasFeelsLike ? nextFeelsLikeText : "") != 0;

    char nextHumidityText[sizeof(state.humidityText)];
    bool nextHasHumidity = tryFormatRoundedMetricText(
        attributes["humidity"],
        "%",
        nextHumidityText,
        sizeof(nextHumidityText));
    changed = changed ||
              state.hasHumidity != nextHasHumidity ||
              strcmp(state.humidityText, nextHasHumidity ? nextHumidityText : "") != 0;

    const char *windUnit = attributes["wind_speed_unit"] | "";
    if (windUnit[0] == '\0')
    {
      windUnit = attributes["native_wind_speed_unit"] | "";
    }
    char nextWindText[sizeof(state.windText)];
    bool nextHasWind =
        tryFormatRoundedMetricText(attributes["wind_speed"], windUnit, nextWindText, sizeof(nextWindText)) ||
        tryFormatRoundedMetricText(attributes["native_wind_speed"], windUnit, nextWindText, sizeof(nextWindText));
    changed = changed ||
              state.hasWind != nextHasWind ||
              strcmp(state.windText, nextHasWind ? nextWindText : "") != 0;

    const char *pressureUnit = attributes["pressure_unit"] | "";
    if (pressureUnit[0] == '\0')
    {
      pressureUnit = attributes["native_pressure_unit"] | "";
    }
    char nextPressureText[sizeof(state.pressureText)];
    bool nextHasPressure =
        tryFormatRoundedMetricText(attributes["pressure"], pressureUnit, nextPressureText, sizeof(nextPressureText)) ||
        tryFormatRoundedMetricText(attributes["native_pressure"], pressureUnit, nextPressureText, sizeof(nextPressureText));
    changed = changed ||
              state.hasPressure != nextHasPressure ||
              strcmp(state.pressureText, nextHasPressure ? nextPressureText : "") != 0;

    state.available = true;
    state.temperature = nextTemp;
    snprintf(state.temperatureUnit, sizeof(state.temperatureUnit), "%s", nextTempUnit);
    snprintf(state.condition, sizeof(state.condition), "%s", nextCondition);
    state.hasFeelsLike = nextHasFeelsLike;
    snprintf(state.feelsLikeText, sizeof(state.feelsLikeText), "%s", nextHasFeelsLike ? nextFeelsLikeText : "");
    state.hasHumidity = nextHasHumidity;
    snprintf(state.humidityText, sizeof(state.humidityText), "%s", nextHasHumidity ? nextHumidityText : "");
    state.hasWind = nextHasWind;
    snprintf(state.windText, sizeof(state.windText), "%s", nextHasWind ? nextWindText : "");
    state.hasPressure = nextHasPressure;
    snprintf(state.pressureText, sizeof(state.pressureText), "%s", nextHasPressure ? nextPressureText : "");

    changed = applyHomeAssistantDailyForecastToWeatherPage(pageIndex, attributes["forecast"].as<JsonArrayConst>()) || changed;
    changed = applyHomeAssistantHourlyForecastToWeatherPage(pageIndex, attributes["hourly_forecast"].as<JsonArrayConst>()) || changed;

    if (changed && redraw && pageIndex == currentPageIndex)
    {
      renderActivePage();
    }
    return changed;
  }

  if (page.pageType == UI_PAGE_MEDIA_PLAYER)
  {
    MediaPageRuntimeState &state = mediaPageStates[pageIndex];
    const bool previousAvailable = state.available;
    const bool previousCoverAvailable = state.coverAvailable;
    const bool previousHasRenderableMedia = mediaPageHasRenderableMedia(pageIndex);
    float numericValue = 0.0f;
    int nextElapsed = state.elapsedSeconds;
    int nextDuration = state.durationSeconds;
    if (jsonVariantToFloat(attributes["media_position"], numericValue))
    {
      nextElapsed = static_cast<int>(roundf(numericValue));
    }
    if (jsonVariantToFloat(attributes["media_duration"], numericValue))
    {
      nextDuration = static_cast<int>(roundf(numericValue));
    }
    const int nextProgress =
        nextDuration > 0 ? clampInt((nextElapsed * 100) / nextDuration, 0, 100) : 0;
    const bool nextPlaying = strcmp(rawState, "playing") == 0;

    const char *title = attributes["media_title"] | "";
    const char *artist = attributes["media_artist"] | "";
    if (artist[0] == '\0')
    {
      artist = attributes["source"] | "";
    }
    const char *rawCoverUrl = attributes["entity_picture"] | "";
    const bool coverChanged = strcmp(state.coverUrl, rawCoverUrl) != 0;
    const bool availabilityChanged = !previousAvailable;
    const bool playbackMetricsChanged =
        state.elapsedSeconds != nextElapsed ||
        state.durationSeconds != nextDuration ||
        state.progress != nextProgress;
    const bool playingChanged = state.playing != nextPlaying;
    const bool playbackRefreshDue =
        state.durationSeconds != nextDuration ||
        !nextPlaying ||
        abs(nextElapsed - state.elapsedSeconds) >= UI_MEDIA_PLAYBACK_REFRESH_INTERVAL_SECONDS ||
        mediaPlaybackRefreshBucket(state.elapsedSeconds) != mediaPlaybackRefreshBucket(nextElapsed);
    const bool titleChanged = strcmp(state.title, title) != 0;
    const bool artistChanged = strcmp(state.artist, artist) != 0;
    const bool stateLabelChanged = strcmp(state.stateLabel, rawState) != 0;
    bool changed = availabilityChanged ||
                   playbackMetricsChanged ||
                   playingChanged ||
                   titleChanged ||
                   artistChanged ||
                   stateLabelChanged ||
                   coverChanged;

    state.available = true;
    state.elapsedSeconds = nextElapsed;
    state.durationSeconds = nextDuration;
    state.progress = nextProgress;
    state.playing = nextPlaying;
    state.lastPlaybackTickMs = millis();
    snprintf(state.title, sizeof(state.title), "%s", title);
    snprintf(state.artist, sizeof(state.artist), "%s", artist);
    snprintf(state.stateLabel, sizeof(state.stateLabel), "%s", rawState);
    if (coverChanged)
    {
      snprintf(state.coverUrl, sizeof(state.coverUrl), "%s", rawCoverUrl);
      state.coverAvailable = false;
    }
    if (pageIndex == currentPageIndex && state.coverUrl[0] != '\0')
    {
      ensureMediaPageCoverLoaded(pageIndex, coverChanged);
    }
    const bool coverAvailabilityChanged = previousCoverAvailable != state.coverAvailable;
    const bool hasRenderableMediaChanged = previousHasRenderableMedia != mediaPageHasRenderableMedia(pageIndex);
    changed = changed || coverAvailabilityChanged;
    changed = changed || hasRenderableMediaChanged;

    if (changed && redraw && pageIndex == currentPageIndex)
    {
      const bool needsFullRender =
          availabilityChanged ||
          titleChanged ||
          artistChanged ||
          coverChanged ||
          coverAvailabilityChanged ||
          hasRenderableMediaChanged;
      if (needsFullRender)
      {
        renderActivePage();
      }
      else
      {
        if (playbackMetricsChanged && playbackRefreshDue)
        {
          refreshMediaPlayerPlaybackRegion();
        }
        if (playingChanged)
        {
          refreshMediaPlayerControlsRegion();
        }
      }
    }
    return changed;
  }

  return false;
}

static bool applyHomeAssistantStateToMatchingBindings(const char *entityId, JsonObjectConst stateObject, bool redraw)
{
  if (entityId == nullptr || entityId[0] == '\0')
  {
    return false;
  }

  bool changed = false;
  for (int pageIndex = 0; pageIndex < UI_PAGE_COUNT; pageIndex++)
  {
    if (pageHasHomeAssistantBinding(pageIndex) && strcmp(UI_PAGES[pageIndex].entityId, entityId) == 0)
    {
      changed = applyHomeAssistantStateToPage(pageIndex, stateObject, redraw) || changed;
    }

    for (int widgetIndex = 0; widgetIndex < UI_PAGES[pageIndex].widgetCount; widgetIndex++)
    {
      const UiWidgetConfig widget = getWidgetConfig(pageIndex, widgetIndex);
      if (!widgetHasHomeAssistantBinding(widget) || strcmp(widget.entityId, entityId) != 0)
      {
        continue;
      }
      changed = applyHomeAssistantStateToWidget(pageIndex, widgetIndex, stateObject, redraw) || changed;
    }
  }
  return changed;
}

static bool fetchHomeAssistantEntityState(const char *entityId, bool redraw)
{
  if (entityId == nullptr || entityId[0] == '\0')
  {
    return false;
  }

  String responseBody;
  int statusCode = 0;
  const String requestUrl = getHomeAssistantApiUrl(String("/api/states/") + entityId);
  if (!homeAssistantRequest("GET", requestUrl, "", responseBody, statusCode))
  {
    snprintf(lastHomeAssistantError, sizeof(lastHomeAssistantError), "HA_HTTP_BEGIN_FAILED");
    return false;
  }
  if (statusCode != HTTP_CODE_OK)
  {
    snprintf(lastHomeAssistantError, sizeof(lastHomeAssistantError), "HA_HTTP_%d", statusCode);
    return false;
  }

  DynamicJsonDocument document(4096);
  const DeserializationError error = deserializeJson(document, responseBody);
  if (error)
  {
    snprintf(lastHomeAssistantError, sizeof(lastHomeAssistantError), "HA_JSON_%d", static_cast<int>(error.code()));
    return false;
  }

  const JsonObjectConst stateObject = document.as<JsonObjectConst>();
  return applyHomeAssistantStateToMatchingBindings(entityId, stateObject, redraw);
}

static bool applyHomeAssistantForecastToMatchingWeatherPages(const char *entityId, JsonArrayConst forecastArray, bool redraw, bool hourlyForecast)
{
  if (entityId == nullptr || entityId[0] == '\0')
  {
    return false;
  }

  bool changed = false;
  for (int pageIndex = 0; pageIndex < UI_PAGE_COUNT; pageIndex++)
  {
    const UiPageConfig &page = UI_PAGES[pageIndex];
    if (page.pageType != UI_PAGE_WEATHER_FOCUS ||
        !pageHasHomeAssistantBinding(pageIndex) ||
        strcmp(page.entityId, entityId) != 0)
    {
      continue;
    }

    const bool pageChanged = hourlyForecast
                                 ? applyHomeAssistantHourlyForecastToWeatherPage(pageIndex, forecastArray)
                                 : applyHomeAssistantDailyForecastToWeatherPage(pageIndex, forecastArray);
    changed = pageChanged || changed;
    if (pageChanged && redraw && pageIndex == currentPageIndex)
    {
      renderActivePage();
    }
  }

  return changed;
}

static bool fetchHomeAssistantWeatherForecast(const char *entityId, const char *forecastType, bool redraw)
{
  if (entityId == nullptr || entityId[0] == '\0')
  {
    return false;
  }

  String responseBody;
  int statusCode = 0;
  const String requestUrl = getHomeAssistantApiUrl("/api/services/weather/get_forecasts?return_response");
  const String payload = String("{\"entity_id\":\"") + entityId + "\",\"type\":\"" + (forecastType != nullptr ? forecastType : "daily") + "\"}";
  if (!homeAssistantRequest("POST", requestUrl, payload, responseBody, statusCode))
  {
    return false;
  }
  if (statusCode != HTTP_CODE_OK)
  {
    return false;
  }

  DynamicJsonDocument document(16384);
  const DeserializationError error = deserializeJson(document, responseBody);
  if (error)
  {
    return false;
  }

  JsonObjectConst serviceResponse = document["service_response"].as<JsonObjectConst>();
  if (serviceResponse.isNull())
  {
    return false;
  }

  JsonObjectConst entityResponse = serviceResponse[entityId].as<JsonObjectConst>();
  if (entityResponse.isNull())
  {
    return false;
  }

  return applyHomeAssistantForecastToMatchingWeatherPages(
      entityId,
      entityResponse["forecast"].as<JsonArrayConst>(),
      redraw,
      forecastType != nullptr && strcmp(forecastType, "hourly") == 0);
}

static void syncAllHomeAssistantEntityStates(bool redraw)
{
  if (!homeAssistantConfigured() || !homeAssistantUrl.valid || WiFi.status() != WL_CONNECTED)
  {
    return;
  }

  String entityIds[UI_PAGE_COUNT * (UI_MAX_WIDGETS_PER_PAGE + 1)];
  int entityCount = 0;
  String weatherPageEntityIds[UI_PAGE_COUNT];
  int weatherPageEntityCount = 0;

  for (int pageIndex = 0; pageIndex < UI_PAGE_COUNT; pageIndex++)
  {
    if (pageHasHomeAssistantBinding(pageIndex))
    {
      bool alreadyAdded = false;
      for (int index = 0; index < entityCount; index++)
      {
        if (entityIds[index] == UI_PAGES[pageIndex].entityId)
        {
          alreadyAdded = true;
          break;
        }
      }
      if (!alreadyAdded)
      {
        entityIds[entityCount++] = UI_PAGES[pageIndex].entityId;
      }

      if (UI_PAGES[pageIndex].pageType == UI_PAGE_WEATHER_FOCUS)
      {
        bool forecastAlreadyAdded = false;
        for (int index = 0; index < weatherPageEntityCount; index++)
        {
          if (weatherPageEntityIds[index] == UI_PAGES[pageIndex].entityId)
          {
            forecastAlreadyAdded = true;
            break;
          }
        }
        if (!forecastAlreadyAdded)
        {
          weatherPageEntityIds[weatherPageEntityCount++] = UI_PAGES[pageIndex].entityId;
        }
      }
    }

    for (int widgetIndex = 0; widgetIndex < UI_PAGES[pageIndex].widgetCount; widgetIndex++)
    {
      const UiWidgetConfig widget = getWidgetConfig(pageIndex, widgetIndex);
      if (!widgetHasHomeAssistantBinding(widget))
      {
        continue;
      }

      bool alreadyAdded = false;
      for (int index = 0; index < entityCount; index++)
      {
        if (entityIds[index] == widget.entityId)
        {
          alreadyAdded = true;
          break;
        }
      }
      if (!alreadyAdded)
      {
        entityIds[entityCount++] = widget.entityId;
      }
    }
  }

  for (int index = 0; index < entityCount; index++)
  {
    fetchHomeAssistantEntityState(entityIds[index].c_str(), redraw);
  }
  for (int index = 0; index < weatherPageEntityCount; index++)
  {
    fetchHomeAssistantWeatherForecast(weatherPageEntityIds[index].c_str(), "daily", redraw);
    fetchHomeAssistantWeatherForecast(weatherPageEntityIds[index].c_str(), "hourly", redraw);
  }
  lastHomeAssistantPollMs = millis();
}

static bool callHomeAssistantServiceForWidget(int pageIndex, int widgetIndex)
{
  const UiWidgetConfig widget = getWidgetConfig(pageIndex, widgetIndex);
  if (!widgetHasHomeAssistantBinding(widget))
  {
    return false;
  }

  const WidgetRuntimeState &state = getWidgetState(pageIndex, widgetIndex);
  const String domain = getEntityDomainString(widget.entityId);
  String service;
  String payload = String("{\"entity_id\":\"") + widget.entityId + "\"";

  if (widget.type == UI_WIDGET_SWITCH)
  {
    service = state.enabled ? "turn_on" : "turn_off";
  }
  else if (widget.type == UI_WIDGET_SLIDER)
  {
    if (domain == "light")
    {
      if (state.value <= 0)
      {
        service = "turn_off";
      }
      else
      {
        service = "turn_on";
        payload += ",\"brightness_pct\":";
        payload += state.value;
      }
    }
    else if (domain == "cover")
    {
      service = "set_cover_position";
      payload += ",\"position\":";
      payload += state.value;
    }
    else if (domain == "media_player")
    {
      service = "volume_set";
      payload += ",\"volume_level\":";
      payload += String(state.value / 100.0f, 2);
    }
    else if (domain == "fan")
    {
      service = "set_percentage";
      payload += ",\"percentage\":";
      payload += state.value;
    }
    else if (domain == "input_number" || domain == "number")
    {
      service = "set_value";
      payload += ",\"value\":";
      payload += state.value;
    }
    else if (domain == "humidifier")
    {
      service = "set_humidity";
      payload += ",\"humidity\":";
      payload += state.value;
    }
  }
  else if (widget.type == UI_WIDGET_THERMOSTAT && domain == "climate")
  {
    service = "set_temperature";
    payload += ",\"temperature\":";
    payload += String(state.value / 10.0f, 1);
  }

  if (service.length() == 0)
  {
    return false;
  }

  payload += "}";

  String responseBody;
  int statusCode = 0;
  const String requestUrl = getHomeAssistantApiUrl(String("/api/services/") + domain + "/" + service);
  const bool requestOk = homeAssistantRequest("POST", requestUrl, payload, responseBody, statusCode);
  if (!requestOk || statusCode < 200 || statusCode >= 300)
  {
    snprintf(lastHomeAssistantError, sizeof(lastHomeAssistantError), "HA_SERVICE_%d", statusCode);
    return false;
  }

  return true;
}

static bool callHomeAssistantToggleForSliderWidget(int pageIndex, int widgetIndex)
{
  const UiWidgetConfig widget = getWidgetConfig(pageIndex, widgetIndex);
  if (widget.type != UI_WIDGET_SLIDER || !widgetHasHomeAssistantBinding(widget))
  {
    return false;
  }

  const String domain = getEntityDomainString(widget.entityId);
  String serviceDomain;
  String service;

  if (domain == "light" || domain == "fan" || domain == "humidifier")
  {
    serviceDomain = "homeassistant";
    service = "toggle";
  }
  else if (domain == "cover")
  {
    serviceDomain = "cover";
    service = getWidgetState(pageIndex, widgetIndex).value > 0 ? "close_cover" : "open_cover";
  }
  else
  {
    return false;
  }

  const String payload = String("{\"entity_id\":\"") + widget.entityId + "\"}";
  String responseBody;
  int statusCode = 0;
  const String requestUrl = getHomeAssistantApiUrl(String("/api/services/") + serviceDomain + "/" + service);
  const bool requestOk = homeAssistantRequest("POST", requestUrl, payload, responseBody, statusCode);
  if (!requestOk || statusCode < 200 || statusCode >= 300)
  {
    snprintf(lastHomeAssistantError, sizeof(lastHomeAssistantError), "HA_SERVICE_%d", statusCode);
    return false;
  }

  return true;
}

static bool callHomeAssistantServiceForPage(int pageIndex, const char *service)
{
  if (service == nullptr || service[0] == '\0' || !pageHasHomeAssistantBinding(pageIndex))
  {
    return false;
  }

  const UiPageConfig &page = UI_PAGES[pageIndex];
  if (page.pageType != UI_PAGE_MEDIA_PLAYER)
  {
    return false;
  }

  const String domain = getEntityDomainString(page.entityId);
  if (domain != "media_player")
  {
    return false;
  }

  const String payload = String("{\"entity_id\":\"") + page.entityId + "\"}";
  String responseBody;
  int statusCode = 0;
  const String requestUrl = getHomeAssistantApiUrl(String("/api/services/") + domain + "/" + service);
  const bool requestOk = homeAssistantRequest("POST", requestUrl, payload, responseBody, statusCode);
  if (!requestOk || statusCode < 200 || statusCode >= 300)
  {
    snprintf(lastHomeAssistantError, sizeof(lastHomeAssistantError), "HA_SERVICE_%d", statusCode);
    return false;
  }

  return true;
}

static void sendHomeAssistantSocketAuth()
{
  DynamicJsonDocument document(512);
  document["type"] = "auth";
  document["access_token"] = HOME_ASSISTANT_TOKEN_BUILD;
  String payload;
  serializeJson(document, payload);
  homeAssistantSocket.sendTXT(payload);
}

static void sendHomeAssistantSocketSubscribe()
{
  DynamicJsonDocument document(256);
  document["id"] = 1;
  document["type"] = "subscribe_events";
  document["event_type"] = "state_changed";
  String payload;
  serializeJson(document, payload);
  homeAssistantSocket.sendTXT(payload);
}

static void handleHomeAssistantSocketText(const char *payload, size_t length)
{
  DynamicJsonDocument document(6144);
  const DeserializationError error = deserializeJson(document, payload, length);
  if (error)
  {
    return;
  }

  const char *messageType = document["type"] | "";
  if (strcmp(messageType, "auth_required") == 0)
  {
    sendHomeAssistantSocketAuth();
    return;
  }
  if (strcmp(messageType, "auth_ok") == 0)
  {
    homeAssistantAuthenticated = true;
    snprintf(lastHomeAssistantError, sizeof(lastHomeAssistantError), "%s", "");
    sendHomeAssistantSocketSubscribe();
    syncAllHomeAssistantEntityStates(false);
    if (pageReady)
    {
      renderActivePage();
    }
    publishMqttTelemetryState();
    return;
  }
  if (strcmp(messageType, "auth_invalid") == 0)
  {
    homeAssistantAuthenticated = false;
    homeAssistantSubscriptionActive = false;
    snprintf(lastHomeAssistantError, sizeof(lastHomeAssistantError), "HA_AUTH_INVALID");
    publishMqttTelemetryState();
    return;
  }
  if (strcmp(messageType, "result") == 0)
  {
    const int id = document["id"] | 0;
    const bool success = document["success"] | false;
    if (id == 1 && success)
    {
      homeAssistantSubscriptionActive = true;
    }
    return;
  }
  if (strcmp(messageType, "event") != 0)
  {
    return;
  }

  const char *entityId = document["event"]["data"]["entity_id"] | "";
  JsonObjectConst newState = document["event"]["data"]["new_state"].as<JsonObjectConst>();
  if (entityId[0] == '\0' || newState.isNull())
  {
    return;
  }

  applyHomeAssistantStateToMatchingBindings(entityId, newState, true);
}

static void handleHomeAssistantSocketEvent(WStype_t type, uint8_t *payload, size_t length)
{
  switch (type)
  {
  case WStype_CONNECTED:
    homeAssistantSocketConnected = true;
    homeAssistantAuthenticated = false;
    homeAssistantSubscriptionActive = false;
    Serial.println("HA_SOCKET_CONNECTED");
    publishMqttTelemetryState();
    break;
  case WStype_DISCONNECTED:
    homeAssistantSocketConnected = false;
    homeAssistantAuthenticated = false;
    homeAssistantSubscriptionActive = false;
    Serial.println("HA_SOCKET_DISCONNECTED");
    publishMqttTelemetryState();
    break;
  case WStype_TEXT:
    handleHomeAssistantSocketText(reinterpret_cast<const char *>(payload), length);
    break;
  default:
    break;
  }
}

static void ensureHomeAssistantSocket()
{
  if (!homeAssistantConfigured() || !homeAssistantUrl.valid || WiFi.status() != WL_CONNECTED)
  {
    return;
  }
  if (homeAssistantSocketStarted && (homeAssistantSocketConnected || millis() - lastHomeAssistantSocketSetupMs < 5000))
  {
    return;
  }

  const String wsPath = getHomeAssistantWebSocketPath();
  homeAssistantSocket.disconnect();
  homeAssistantSocket.onEvent(handleHomeAssistantSocketEvent);
  if (homeAssistantUrl.secure)
  {
    homeAssistantSocket.beginSSL(homeAssistantUrl.host.c_str(), homeAssistantUrl.port, wsPath.c_str());
  }
  else
  {
    homeAssistantSocket.begin(homeAssistantUrl.host.c_str(), homeAssistantUrl.port, wsPath.c_str());
  }
  homeAssistantSocket.setReconnectInterval(5000);
  homeAssistantSocket.enableHeartbeat(15000, 3000, 2);
  homeAssistantSocketStarted = true;
  lastHomeAssistantSocketSetupMs = millis();
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
  callHomeAssistantServiceForWidget(pageIndex, widgetIndex);
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

      if (isPointInRectExpanded(tx, ty, navLeftRect, 18))
      {
        lastTouchActionMs = now;
        if (cycleActivePage(-1))
        {
          publishMqttPageState();
        }
        Serial.printf("PAGE_SWITCH DIR=LEFT MAP=%s RAW=%d,%d XY=%d,%d\n", mappedNames[i], rawX, rawY, tx, ty);
        return;
      }

      if (isPointInRectExpanded(tx, ty, navRightRect, 18))
      {
        lastTouchActionMs = now;
        if (cycleActivePage(1))
        {
          publishMqttPageState();
        }
        Serial.printf("PAGE_SWITCH DIR=RIGHT MAP=%s RAW=%d,%d XY=%d,%d\n", mappedNames[i], rawX, rawY, tx, ty);
        return;
      }

      if (activePageIsMediaPlayer() && activeMediaPageUsesHomeAssistant() && mediaPageHasRenderableMedia(currentPageIndex))
      {
        if (isPointInRectExpanded(tx, ty, mediaPlayerPrevButtonRect, 10))
        {
          lastTouchActionMs = now;
          callHomeAssistantServiceForPage(currentPageIndex, "media_previous_track");
          Serial.printf("MEDIA_TOUCH ACTION=PREVIOUS MAP=%s RAW=%d,%d XY=%d,%d\n", mappedNames[i], rawX, rawY, tx, ty);
          return;
        }

        if (isPointInRectExpanded(tx, ty, mediaPlayerPlayPauseButtonRect, 10))
        {
          lastTouchActionMs = now;
          MediaPageRuntimeState &mediaState = mediaPageStates[currentPageIndex];
          mediaState.playing = !mediaState.playing;
          mediaState.lastPlaybackTickMs = now;
          refreshMediaPlayerControlsRegion();
          callHomeAssistantServiceForPage(currentPageIndex, "media_play_pause");
          Serial.printf("MEDIA_TOUCH ACTION=PLAY_PAUSE MAP=%s RAW=%d,%d XY=%d,%d\n", mappedNames[i], rawX, rawY, tx, ty);
          return;
        }

        if (isPointInRectExpanded(tx, ty, mediaPlayerNextButtonRect, 10))
        {
          lastTouchActionMs = now;
          callHomeAssistantServiceForPage(currentPageIndex, "media_next_track");
          Serial.printf("MEDIA_TOUCH ACTION=NEXT MAP=%s RAW=%d,%d XY=%d,%d\n", mappedNames[i], rawX, rawY, tx, ty);
          return;
        }
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
          callHomeAssistantServiceForWidget(currentPageIndex, widgetIndex);
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

        if (widget.type == UI_WIDGET_SLIDER && isPointInRectExpanded(tx, ty, state.secondaryRect, 10))
        {
          lastTouchActionMs = now;
          const int safeMax = state.maxValue > 0 ? state.maxValue : 100;
          const int nextValue = state.value > 0 ? 0 : safeMax;
          bool handled = false;
          if (!widgetHasHomeAssistantBinding(widget))
          {
            state.value = nextValue;
            drawSliderWidget(widgetIndex, true);
            handled = true;
          }
          else if (callHomeAssistantToggleForSliderWidget(currentPageIndex, widgetIndex))
          {
            state.value = nextValue;
            drawSliderWidget(widgetIndex, true);
            handled = true;
          }

          Serial.printf(
              "SLIDER_ICON_TOUCH VALUE=%d HANDLED=%d MAP=%s RAW=%d,%d XY=%d,%d\n",
              nextValue,
              handled ? 1 : 0,
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
          callHomeAssistantServiceForWidget(currentPageIndex, widgetIndex);
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
            callHomeAssistantServiceForWidget(currentPageIndex, widgetIndex);
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
            callHomeAssistantServiceForWidget(currentPageIndex, widgetIndex);
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

  const uint32_t nowMs = millis();
  if (activePageIsWeatherFocus())
  {
    bool rerenderWeatherPage = false;
    if (!activeWeatherPageUsesHomeAssistant() && nowMs - lastWeatherUpdateMs >= 15000)
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
    if (activeMediaPageUsesHomeAssistant() && advanceMediaPagePlaybackClock(currentPageIndex, nowMs))
    {
      refreshMediaPlayerPlaybackRegion();
    }
    return;
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
      if (state.homeAssistantBound)
      {
        continue;
      }

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
      if (state.homeAssistantBound)
      {
        continue;
      }
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

  const int lineHeight = 24;
  const int startY = (display.height() - (visibleLines * lineHeight)) / 2;
  int lineIndex = 0;
  for (int i = 0; i < 3; i++)
  {
    if (lines[i][0] == '\0')
    {
      continue;
    }
    selectTextFont(UI_TEXT_BODY);
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

static String htmlEscape(const String &value)
{
  String escaped;
  escaped.reserve(value.length() + 16);
  for (size_t index = 0; index < value.length(); index++)
  {
    const char ch = value[index];
    switch (ch)
    {
    case '&':
      escaped += "&amp;";
      break;
    case '<':
      escaped += "&lt;";
      break;
    case '>':
      escaped += "&gt;";
      break;
    case '"':
      escaped += "&quot;";
      break;
    case '\'':
      escaped += "&#39;";
      break;
    default:
      escaped += ch;
      break;
    }
  }
  return escaped;
}

static void setLastMqttError(const String &message)
{
  snprintf(lastMqttError, sizeof(lastMqttError), "%s", message.c_str());
}

static void clearLastMqttError()
{
  lastMqttError[0] = '\0';
}

static String normalizeTopicPath(const String &rawValue)
{
  String value = rawValue;
  value.trim();
  while (value.startsWith("/"))
  {
    value.remove(0, 1);
  }
  while (value.endsWith("/"))
  {
    value.remove(value.length() - 1);
  }
  return value;
}

static uint16_t parsePortOrDefault(const String &rawValue, uint16_t fallback)
{
  const String value = rawValue;
  if (value.length() == 0)
  {
    return fallback;
  }

  char *endPtr = nullptr;
  const long parsed = strtol(value.c_str(), &endPtr, 10);
  if (endPtr == value.c_str() || *endPtr != '\0' || parsed <= 0 || parsed > 65535)
  {
    return fallback;
  }
  return static_cast<uint16_t>(parsed);
}

static String normalizeMqttHost(const String &rawValue, uint16_t &portInOut)
{
  String host = rawValue;
  host.trim();
  if (host.startsWith("mqtt://"))
  {
    host.remove(0, 7);
  }
  else if (host.startsWith("tcp://"))
  {
    host.remove(0, 6);
  }
  else if (host.startsWith("ws://"))
  {
    host.remove(0, 5);
  }

  const int slashIndex = host.indexOf('/');
  if (slashIndex >= 0)
  {
    host.remove(slashIndex);
  }

  if (host.indexOf(':') >= 0 && host.indexOf(':') == host.lastIndexOf(':'))
  {
    const int colonIndex = host.lastIndexOf(':');
    const String portPart = host.substring(colonIndex + 1);
    const uint16_t parsedPort = parsePortOrDefault(portPart, portInOut);
    if (parsedPort != portInOut || portPart == String(parsedPort))
    {
      portInOut = parsedPort;
      host.remove(colonIndex);
    }
  }

  host.trim();
  return host;
}

static bool parseBooleanPayload(const String &rawPayload, bool currentValue, bool &parsedValue)
{
  String payload = rawPayload;
  payload.trim();
  payload.toLowerCase();
  if (payload == "1" || payload == "true" || payload == "on" || payload == "enable" || payload == "enabled")
  {
    parsedValue = true;
    return true;
  }
  if (payload == "0" || payload == "false" || payload == "off" || payload == "disable" || payload == "disabled")
  {
    parsedValue = false;
    return true;
  }
  if (payload == "toggle")
  {
    parsedValue = !currentValue;
    return true;
  }
  return false;
}

static String getDeviceSlug()
{
  static String slug;
  if (slug.length() == 0)
  {
    char buffer[24];
    const uint64_t chipId = ESP.getEfuseMac();
    snprintf(buffer, sizeof(buffer), "m5papers3-%06llx", static_cast<unsigned long long>(chipId & 0xFFFFFFULL));
    slug = buffer;
  }
  return slug;
}

static String getDeviceDisplayName()
{
  const String slug = getDeviceSlug();
  const int separator = slug.lastIndexOf('-');
  const String suffix = separator >= 0 ? slug.substring(separator + 1) : slug;
  return String(IMPROV_DEVICE_NAME) + " " + suffix;
}

static void loadUiPreferences()
{
  currentDarkModeEnabled = UI_THEME_DARK != 0;
  if (!preferences.begin("ui", false))
  {
    Serial.println("UI_PREFS_UNAVAILABLE");
    return;
  }

  if (preferences.isKey("dark"))
  {
    currentDarkModeEnabled = preferences.getBool("dark", UI_THEME_DARK != 0);
  }
  preferences.end();
  Serial.printf("UI_DARK_MODE=%d\n", currentDarkModeEnabled ? 1 : 0);
}

static void saveUiPreferences()
{
  if (!preferences.begin("ui", false))
  {
    Serial.println("UI_SAVE_FAILED");
    return;
  }
  preferences.putBool("dark", currentDarkModeEnabled);
  preferences.end();
}

static uint32_t getFreePsramBytes()
{
#if __has_include(<esp_heap_caps.h>)
  return heap_caps_get_free_size(MALLOC_CAP_SPIRAM);
#else
  return 0;
#endif
}

static uint32_t getUptimeSeconds()
{
  return millis() / 1000UL;
}

static void setupPowerMonitoring()
{
  pinMode(PAPERS3_BATTERY_ADC_PIN, INPUT);
  pinMode(PAPERS3_USB_DET_PIN, INPUT);
#if defined(ADC_11db)
  analogSetPinAttenuation(PAPERS3_BATTERY_ADC_PIN, ADC_11db);
  analogSetPinAttenuation(PAPERS3_USB_DET_PIN, ADC_11db);
#endif
}

static int readMilliVoltsAverage(int pin, uint8_t samples = 4)
{
  int total = 0;
  int validSamples = 0;
  for (uint8_t sampleIndex = 0; sampleIndex < samples; sampleIndex++)
  {
    const int sample = analogReadMilliVolts(pin);
    if (sample > 0)
    {
      total += sample;
      validSamples++;
    }
  }
  return validSamples > 0 ? (total / validSamples) : 0;
}

static bool isUsbPowerConnected()
{
  return readMilliVoltsAverage(PAPERS3_USB_DET_PIN) >= PAPERS3_USB_DET_THRESHOLD_MV;
}

static int getBatteryVoltageMv()
{
  const int sensedMillivolts = readMilliVoltsAverage(PAPERS3_BATTERY_ADC_PIN);
  if (sensedMillivolts <= 0)
  {
    return 0;
  }
  return static_cast<int>(roundf(sensedMillivolts * PAPERS3_BATTERY_DIVIDER_RATIO));
}

static int estimateBatteryLevelPercent(int batteryVoltageMv)
{
  struct BatteryCurvePoint
  {
    int millivolts;
    int percent;
  };

  static const BatteryCurvePoint curve[] = {
      {3300, 0},
      {3450, 5},
      {3600, 10},
      {3700, 20},
      {3750, 30},
      {3800, 40},
      {3850, 50},
      {3900, 60},
      {3950, 70},
      {4000, 80},
      {4100, 90},
      {4200, 100},
  };

  if (batteryVoltageMv <= curve[0].millivolts)
  {
    return curve[0].percent;
  }

  for (size_t index = 1; index < sizeof(curve) / sizeof(curve[0]); index++)
  {
    if (batteryVoltageMv <= curve[index].millivolts)
    {
      const BatteryCurvePoint &lower = curve[index - 1];
      const BatteryCurvePoint &upper = curve[index];
      const int voltageSpan = upper.millivolts - lower.millivolts;
      if (voltageSpan <= 0)
      {
        return upper.percent;
      }
      const float ratio = static_cast<float>(batteryVoltageMv - lower.millivolts) / static_cast<float>(voltageSpan);
      return clampInt(
          static_cast<int>(roundf(lower.percent + ratio * (upper.percent - lower.percent))),
          0,
          100);
    }
  }

  return 100;
}

static int getBatteryLevelPercent()
{
  return estimateBatteryLevelPercent(getBatteryVoltageMv());
}

static String normalizeDiagnosticText(const char *value)
{
  return (value != nullptr && value[0] != '\0') ? String(value) : String("ok");
}

static bool mqttConfigured()
{
  return mqttConfig.enabled && mqttConfig.host.length() > 0;
}

static bool mqttDiscoveryConfigured()
{
  return mqttConfigured() && mqttConfig.discoveryEnabled;
}

static String getEffectiveMqttTopicPrefix()
{
  const String configuredPrefix = normalizeTopicPath(mqttConfig.topicPrefix);
  if (configuredPrefix.length() > 0)
  {
    return configuredPrefix;
  }
  return String("m5papers3/") + getDeviceSlug();
}

static String getEffectiveMqttDiscoveryPrefix()
{
  const String configuredPrefix = normalizeTopicPath(mqttConfig.discoveryPrefix);
  return configuredPrefix.length() > 0 ? configuredPrefix : String(MQTT_DEFAULT_DISCOVERY_PREFIX);
}

static String getMqttTopic(const char *suffix)
{
  const String topicPrefix = getEffectiveMqttTopicPrefix();
  if (suffix == nullptr || suffix[0] == '\0')
  {
    return topicPrefix;
  }
  return topicPrefix + "/" + suffix;
}

static String getMqttDiscoveryTopic(const char *component, const char *objectId)
{
  return getEffectiveMqttDiscoveryPrefix() + "/" + component + "/" + getDeviceSlug() + "_" + objectId + "/config";
}

static void loadMqttConfig()
{
  mqttConfig = {false, "", MQTT_DEFAULT_PORT, "", "", "", true, MQTT_DEFAULT_DISCOVERY_PREFIX};
  if (!preferences.begin("mqtt", false))
  {
    Serial.println("MQTT_PREFS_UNAVAILABLE");
    return;
  }

  mqttConfig.enabled = preferences.getBool("enabled", false);
  mqttConfig.host = preferences.getString("host", "");
  mqttConfig.port = preferences.getUShort("port", MQTT_DEFAULT_PORT);
  mqttConfig.username = preferences.getString("user", "");
  mqttConfig.password = preferences.getString("pass", "");
  mqttConfig.topicPrefix = preferences.getString("topic", "");
  mqttConfig.discoveryEnabled = preferences.getBool("disc_en", true);
  mqttConfig.discoveryPrefix = preferences.getString("disc_pref", MQTT_DEFAULT_DISCOVERY_PREFIX);
  preferences.end();

  mqttConfig.port = mqttConfig.port > 0 ? mqttConfig.port : MQTT_DEFAULT_PORT;
  mqttConfig.host = normalizeMqttHost(mqttConfig.host, mqttConfig.port);
  mqttConfig.topicPrefix = normalizeTopicPath(mqttConfig.topicPrefix);
  mqttConfig.discoveryPrefix = normalizeTopicPath(mqttConfig.discoveryPrefix);
  if (mqttConfig.discoveryPrefix.length() == 0)
  {
    mqttConfig.discoveryPrefix = MQTT_DEFAULT_DISCOVERY_PREFIX;
  }
}

static void saveMqttConfig(const MqttConfig &config)
{
  if (!preferences.begin("mqtt", false))
  {
    Serial.println("MQTT_SAVE_FAILED");
    return;
  }

  preferences.putBool("enabled", config.enabled);
  preferences.putString("host", config.host);
  preferences.putUShort("port", config.port);
  preferences.putString("user", config.username);
  preferences.putString("pass", config.password);
  preferences.putString("topic", config.topicPrefix);
  preferences.putBool("disc_en", config.discoveryEnabled);
  preferences.putString("disc_pref", config.discoveryPrefix);
  preferences.end();
}

static const char *mqttStateName(int state)
{
  switch (state)
  {
  case MQTT_CONNECTION_TIMEOUT:
    return "timeout";
  case MQTT_CONNECTION_LOST:
    return "connection_lost";
  case MQTT_CONNECT_FAILED:
    return "connect_failed";
  case MQTT_DISCONNECTED:
    return "disconnected";
  case MQTT_CONNECTED:
    return "connected";
  case MQTT_CONNECT_BAD_PROTOCOL:
    return "bad_protocol";
  case MQTT_CONNECT_BAD_CLIENT_ID:
    return "bad_client_id";
  case MQTT_CONNECT_UNAVAILABLE:
    return "broker_unavailable";
  case MQTT_CONNECT_BAD_CREDENTIALS:
    return "bad_credentials";
  case MQTT_CONNECT_UNAUTHORIZED:
    return "unauthorized";
  default:
    return "unknown";
  }
}

static void configureMqttClient()
{
  mqttClient.setServer(mqttConfig.host.c_str(), mqttConfig.port > 0 ? mqttConfig.port : MQTT_DEFAULT_PORT);
  mqttClient.setCallback(handleMqttMessage);
  mqttClient.setKeepAlive(30);
  mqttClient.setSocketTimeout(10);
  mqttClient.setBufferSize(2048);
}

static bool publishMqttMessage(const String &topic, const String &payload, bool retained)
{
  if (!mqttClient.connected())
  {
    return false;
  }

  const bool published = mqttClient.publish(topic.c_str(), payload.c_str(), retained);
  if (!published)
  {
    setLastMqttError("publish_failed");
  }
  return published;
}

static void populateMqttDiscoveryDevice(JsonObject device)
{
  JsonArray identifiers = device.createNestedArray("identifiers");
  identifiers.add(getDeviceSlug());
  device["name"] = getDeviceDisplayName();
  device["model"] = FIRMWARE_DISPLAY_NAME;
  device["sw_version"] = FIRMWARE_VERSION_NAME;
  device["manufacturer"] = "M5Stack";
}

static bool publishMqttDiscoveryDocument(const String &topic, JsonDocument &document)
{
  String payload;
  serializeJson(document, payload);
  return publishMqttMessage(topic, payload, true);
}

static bool clearMqttDiscoveryTopic(const String &topic)
{
  return mqttClient.connected() ? mqttClient.publish(topic.c_str(), "", true) : false;
}

static void populateMqttDiscoveryDocument(
    JsonDocument &document,
    const char *objectSuffix,
    const char *name,
    const String &stateTopic,
    bool includeAvailability = true)
{
  const String objectId = String(getDeviceSlug()) + "_" + objectSuffix;
  document["name"] = name;
  document["object_id"] = objectId;
  document["unique_id"] = objectId;
  document["state_topic"] = stateTopic;
  if (includeAvailability)
  {
    document["availability_topic"] = getMqttTopic("availability");
    document["payload_available"] = MQTT_AVAILABILITY_ONLINE;
    document["payload_not_available"] = MQTT_AVAILABILITY_OFFLINE;
  }
  populateMqttDiscoveryDevice(document.createNestedObject("device"));
}

static bool publishMqttBinarySensorDiscovery(
    const char *objectSuffix,
    const char *name,
    const String &stateTopic,
    const char *payloadOn,
    const char *payloadOff,
    const char *deviceClass,
    const char *icon,
    bool diagnostic,
    bool includeAvailability = true)
{
  StaticJsonDocument<768> document;
  populateMqttDiscoveryDocument(document, objectSuffix, name, stateTopic, includeAvailability);
  document["payload_on"] = payloadOn;
  document["payload_off"] = payloadOff;
  if (deviceClass != nullptr && deviceClass[0] != '\0')
  {
    document["device_class"] = deviceClass;
  }
  if (icon != nullptr && icon[0] != '\0')
  {
    document["icon"] = icon;
  }
  if (diagnostic)
  {
    document["entity_category"] = "diagnostic";
  }
  return publishMqttDiscoveryDocument(getMqttDiscoveryTopic("binary_sensor", objectSuffix), document);
}

static bool publishMqttSensorDiscovery(
    const char *objectSuffix,
    const char *name,
    const String &stateTopic,
    const char *unit,
    const char *deviceClass,
    const char *icon,
    bool diagnostic,
    bool includeAvailability = true)
{
  StaticJsonDocument<768> document;
  populateMqttDiscoveryDocument(document, objectSuffix, name, stateTopic, includeAvailability);
  if (unit != nullptr && unit[0] != '\0')
  {
    document["unit_of_measurement"] = unit;
  }
  if (deviceClass != nullptr && deviceClass[0] != '\0')
  {
    document["device_class"] = deviceClass;
  }
  if (icon != nullptr && icon[0] != '\0')
  {
    document["icon"] = icon;
  }
  if (diagnostic)
  {
    document["entity_category"] = "diagnostic";
  }
  return publishMqttDiscoveryDocument(getMqttDiscoveryTopic("sensor", objectSuffix), document);
}

static bool publishMqttDiscoveryConfig()
{
  if (!mqttDiscoveryConfigured() || !mqttClient.connected())
  {
    return false;
  }

  bool success = true;

  StaticJsonDocument<1024> pageDoc;
  populateMqttDiscoveryDocument(pageDoc, "page", "Page", getMqttTopic("page/state"));
  pageDoc["command_topic"] = getMqttTopic("page/set");
  pageDoc["icon"] = "mdi:file-document-multiple-outline";
  JsonArray pageOptions = pageDoc.createNestedArray("options");
  for (int pageIndex = 0; pageIndex < UI_PAGE_COUNT; pageIndex++)
  {
    pageOptions.add(UI_PAGES[pageIndex].name);
  }
  if (!publishMqttDiscoveryDocument(getMqttDiscoveryTopic("select", "page"), pageDoc))
  {
    setLastMqttError("discovery_page_failed");
    success = false;
  }

  StaticJsonDocument<768> darkModeDoc;
  populateMqttDiscoveryDocument(darkModeDoc, "dark_mode", "Dark Mode", getMqttTopic("dark_mode/state"));
  darkModeDoc["command_topic"] = getMqttTopic("dark_mode/set");
  darkModeDoc["payload_on"] = "ON";
  darkModeDoc["payload_off"] = "OFF";
  darkModeDoc["state_on"] = "ON";
  darkModeDoc["state_off"] = "OFF";
  darkModeDoc["icon"] = "mdi:theme-light-dark";
  if (!publishMqttDiscoveryDocument(getMqttDiscoveryTopic("switch", "dark_mode"), darkModeDoc))
  {
    setLastMqttError("discovery_dark_mode_failed");
    success = false;
  }

  success = clearMqttDiscoveryTopic(getMqttDiscoveryTopic("sensor", "partial_refresh_count")) && success;
  success = clearMqttDiscoveryTopic(getMqttDiscoveryTopic("sensor", "full_refresh_count")) && success;
  success = clearMqttDiscoveryTopic(getMqttDiscoveryTopic("sensor", "last_refresh_age_seconds")) && success;

  success = publishMqttBinarySensorDiscovery(
                "usb_power_connected",
                "Plugged In",
                getMqttTopic("power/usb_power_connected"),
                "ON",
                "OFF",
                "",
                "mdi:power-plug",
                false) &&
            success;
  success = publishMqttBinarySensorDiscovery(
                "wifi_connected",
                "Wi-Fi Connected",
                getMqttTopic("status/wifi_connected"),
                "ON",
                "OFF",
                "connectivity",
                "mdi:wifi-check",
                true) &&
            success;
  success = publishMqttBinarySensorDiscovery(
                "mqtt_connected",
                "MQTT Connected",
                getMqttTopic("availability"),
                MQTT_AVAILABILITY_ONLINE,
                MQTT_AVAILABILITY_OFFLINE,
                "connectivity",
                "mdi:lan-connect",
                true,
                false) &&
            success;
  success = publishMqttBinarySensorDiscovery(
                "home_assistant_connected",
                "Home Assistant Connected",
                getMqttTopic("status/home_assistant_connected"),
                "ON",
                "OFF",
                "connectivity",
                "mdi:home-assistant",
                true) &&
            success;
  success = publishMqttSensorDiscovery(
                "wifi_rssi",
                "Wi-Fi RSSI",
                getMqttTopic("diagnostics/wifi_rssi"),
                "dBm",
                "signal_strength",
                "mdi:wifi",
                true) &&
            success;
  success = publishMqttSensorDiscovery(
                "uptime_seconds",
                "Uptime",
                getMqttTopic("diagnostics/uptime_seconds"),
                "s",
                "duration",
                "mdi:timer-outline",
                true) &&
            success;
  success = publishMqttSensorDiscovery(
                "free_heap_bytes",
                "Free Heap",
                getMqttTopic("diagnostics/free_heap_bytes"),
                "B",
                "data_size",
                "mdi:memory",
                true) &&
            success;
  success = publishMqttSensorDiscovery(
                "free_psram_bytes",
                "Free PSRAM",
                getMqttTopic("diagnostics/free_psram_bytes"),
                "B",
                "data_size",
                "mdi:memory",
                true) &&
            success;
  success = publishMqttSensorDiscovery(
                "ip_address",
                "IP Address",
                getMqttTopic("diagnostics/ip_address"),
                "",
                "",
                "mdi:ip-network-outline",
                true) &&
            success;
  success = publishMqttSensorDiscovery(
                "firmware_version",
                "Firmware Version",
                getMqttTopic("diagnostics/firmware_version"),
                "",
                "",
                "mdi:chip",
                true) &&
            success;
  success = publishMqttSensorDiscovery(
                "build_id",
                "Build ID",
                getMqttTopic("diagnostics/build_id"),
                "",
                "",
                "mdi:identifier",
                true) &&
            success;
  success = publishMqttSensorDiscovery(
                "battery_level",
                "Battery Level",
                getMqttTopic("power/battery_level"),
                "%",
                "battery",
                "mdi:battery",
                false) &&
            success;
  success = publishMqttSensorDiscovery(
                "page_index",
                "Page Index",
                getMqttTopic("page/index"),
                "",
                "",
                "mdi:file-document-multiple-outline",
                false) &&
            success;
  success = publishMqttSensorDiscovery(
                "last_mqtt_error",
                "Last MQTT Error",
                getMqttTopic("diagnostics/last_mqtt_error"),
                "",
                "",
                "mdi:alert-circle-outline",
                true) &&
            success;
  success = publishMqttSensorDiscovery(
                "last_home_assistant_error",
                "Last Home Assistant Error",
                getMqttTopic("diagnostics/last_home_assistant_error"),
                "",
                "",
                "mdi:home-alert-outline",
                true) &&
            success;

  mqttDiscoveryPublished = success;
  return success;
}

static void publishMqttPageState()
{
  if (!mqttClient.connected() || UI_PAGE_COUNT <= 0)
  {
    return;
  }

  publishMqttMessage(getMqttTopic("page/state"), getCurrentPageName(), true);
  publishMqttMessage(getMqttTopic("page/index"), String(currentPageIndex), true);
}

static void publishMqttDarkModeState()
{
  if (!mqttClient.connected())
  {
    return;
  }

  publishMqttMessage(getMqttTopic("dark_mode/state"), currentDarkModeEnabled ? "ON" : "OFF", true);
}

static void publishMqttTelemetryState()
{
  if (!mqttClient.connected())
  {
    return;
  }

  publishMqttMessage(getMqttTopic("power/usb_power_connected"), isUsbPowerConnected() ? "ON" : "OFF", true);
  publishMqttMessage(getMqttTopic("power/battery_level"), String(getBatteryLevelPercent()), true);
  publishMqttMessage(getMqttTopic("status/wifi_connected"), WiFi.status() == WL_CONNECTED ? "ON" : "OFF", true);
  publishMqttMessage(getMqttTopic("status/home_assistant_connected"), homeAssistantAuthenticated ? "ON" : "OFF", true);
  publishMqttMessage(getMqttTopic("diagnostics/wifi_rssi"), String(WiFi.RSSI()), true);
  publishMqttMessage(getMqttTopic("diagnostics/uptime_seconds"), String(getUptimeSeconds()), true);
  publishMqttMessage(getMqttTopic("diagnostics/free_heap_bytes"), String(ESP.getFreeHeap()), true);
  publishMqttMessage(getMqttTopic("diagnostics/free_psram_bytes"), String(getFreePsramBytes()), true);
  publishMqttMessage(getMqttTopic("diagnostics/ip_address"), WiFi.localIP().toString(), true);
  publishMqttMessage(getMqttTopic("diagnostics/firmware_version"), FIRMWARE_VERSION_NAME, true);
  publishMqttMessage(getMqttTopic("diagnostics/build_id"), UI_BUILD_ID, true);
  publishMqttMessage(getMqttTopic("diagnostics/last_mqtt_error"), normalizeDiagnosticText(lastMqttError), true);
  publishMqttMessage(getMqttTopic("diagnostics/last_home_assistant_error"), normalizeDiagnosticText(lastHomeAssistantError), true);
  lastMqttTelemetryPublishMs = millis();
}

static void publishMqttStateSnapshot(bool includeDiscovery = true)
{
  if (!mqttClient.connected())
  {
    return;
  }

  publishMqttMessage(getMqttTopic("availability"), MQTT_AVAILABILITY_ONLINE, true);
  if (includeDiscovery && mqttDiscoveryConfigured())
  {
    publishMqttDiscoveryConfig();
  }
  publishMqttPageState();
  publishMqttDarkModeState();
  publishMqttTelemetryState();
}

static int findPageIndexByName(const String &pageName)
{
  for (int pageIndex = 0; pageIndex < UI_PAGE_COUNT; pageIndex++)
  {
    if (pageName.equalsIgnoreCase(UI_PAGES[pageIndex].name))
    {
      return pageIndex;
    }
  }
  return -1;
}

static bool handleMqttPageCommand(const String &rawPayload)
{
  String payload = rawPayload;
  payload.trim();
  if (payload.length() == 0)
  {
    return false;
  }

  if (payload.startsWith("{"))
  {
    StaticJsonDocument<192> doc;
    if (deserializeJson(doc, payload) == DeserializationError::Ok)
    {
      if (doc["index"].is<int>())
      {
        const int pageIndex = doc["index"].as<int>();
        setActivePageIndex(pageIndex, true);
        publishMqttPageState();
        return true;
      }
      if (doc["name"].is<const char *>())
      {
        payload = doc["name"].as<String>();
      }
      else if (doc["page"].is<const char *>())
      {
        payload = doc["page"].as<String>();
      }
    }
  }

  String normalized = payload;
  normalized.trim();
  normalized.toLowerCase();
  if (normalized == "next")
  {
    cycleActivePage(1);
    publishMqttPageState();
    return true;
  }
  if (normalized == "prev" || normalized == "previous")
  {
    cycleActivePage(-1);
    publishMqttPageState();
    return true;
  }
  if (normalized == "current" || normalized == "state")
  {
    publishMqttPageState();
    return true;
  }

  char *endPtr = nullptr;
  const long parsedNumber = strtol(payload.c_str(), &endPtr, 10);
  if (endPtr != payload.c_str() && *endPtr == '\0')
  {
    if (parsedNumber == 0)
    {
      setActivePageIndex(0, true);
      publishMqttPageState();
      return true;
    }
    if (parsedNumber > 0 && parsedNumber <= UI_PAGE_COUNT)
    {
      setActivePageIndex(static_cast<int>(parsedNumber - 1), true);
      publishMqttPageState();
      return true;
    }
    return false;
  }

  const int pageIndex = findPageIndexByName(payload);
  if (pageIndex < 0)
  {
    return false;
  }

  setActivePageIndex(pageIndex, true);
  publishMqttPageState();
  return true;
}

static bool handleMqttDarkModeCommand(const String &rawPayload)
{
  String payload = rawPayload;
  payload.trim();
  if (payload.length() == 0)
  {
    return false;
  }

  if (payload.startsWith("{"))
  {
    StaticJsonDocument<192> doc;
    if (deserializeJson(doc, payload) == DeserializationError::Ok)
    {
      if (doc["enabled"].is<bool>())
      {
        const bool nextValue = doc["enabled"].as<bool>();
        if (applyDarkModeSetting(nextValue))
        {
          saveUiPreferences();
        }
        publishMqttDarkModeState();
        return true;
      }
      if (doc["dark_mode"].is<bool>())
      {
        const bool nextValue = doc["dark_mode"].as<bool>();
        if (applyDarkModeSetting(nextValue))
        {
          saveUiPreferences();
        }
        publishMqttDarkModeState();
        return true;
      }
    }
  }

  bool nextValue = currentDarkModeEnabled;
  if (!parseBooleanPayload(payload, currentDarkModeEnabled, nextValue))
  {
    return false;
  }

  if (applyDarkModeSetting(nextValue))
  {
    saveUiPreferences();
  }
  publishMqttDarkModeState();
  return true;
}

static void handleMqttMessage(char *topic, uint8_t *payload, unsigned int length)
{
  String topicValue = topic == nullptr ? "" : String(topic);
  String payloadValue;
  payloadValue.reserve(length);
  for (unsigned int index = 0; index < length; index++)
  {
    payloadValue += static_cast<char>(payload[index]);
  }
  payloadValue.trim();

  bool handled = false;
  if (topicValue == getMqttTopic("page/set"))
  {
    handled = handleMqttPageCommand(payloadValue);
  }
  else if (topicValue == getMqttTopic("dark_mode/set"))
  {
    handled = handleMqttDarkModeCommand(payloadValue);
  }

  Serial.printf("MQTT_MESSAGE TOPIC=%s PAYLOAD=%s HANDLED=%d\n", topicValue.c_str(), payloadValue.c_str(), handled ? 1 : 0);
  if (handled)
  {
    clearLastMqttError();
  }
}

static void disconnectMqtt(bool publishOffline = false)
{
  if (mqttClient.connected() && publishOffline)
  {
    publishMqttMessage(getMqttTopic("availability"), MQTT_AVAILABILITY_OFFLINE, true);
  }
  mqttClient.disconnect();
  mqttConnected = false;
  mqttDiscoveryPublished = false;
  lastMqttTelemetryPublishMs = 0;
}

static bool ensureMqttConnected()
{
  if (!mqttConfigured() || WiFi.status() != WL_CONNECTED)
  {
    if (mqttClient.connected())
    {
      disconnectMqtt(false);
    }
    return false;
  }

  if (mqttClient.connected())
  {
    mqttConnected = true;
    return true;
  }

  if (millis() - lastMqttReconnectAttemptMs < 5000UL)
  {
    return false;
  }

  lastMqttReconnectAttemptMs = millis();
  const String clientId = getDeviceSlug();
  const String willTopic = getMqttTopic("availability");
  bool connected = false;
  if (mqttConfig.username.length() > 0)
  {
    connected = mqttClient.connect(
        clientId.c_str(),
        mqttConfig.username.c_str(),
        mqttConfig.password.c_str(),
        willTopic.c_str(),
        0,
        true,
        MQTT_AVAILABILITY_OFFLINE);
  }
  else
  {
    connected = mqttClient.connect(
        clientId.c_str(),
        willTopic.c_str(),
        0,
        true,
        MQTT_AVAILABILITY_OFFLINE);
  }

  if (!connected)
  {
    mqttConnected = false;
    mqttDiscoveryPublished = false;
    setLastMqttError(String("connect_") + mqttStateName(mqttClient.state()));
    Serial.printf(
        "MQTT_CONNECT_FAILED HOST=%s PORT=%u STATE=%d\n",
        mqttConfig.host.c_str(),
        mqttConfig.port,
        mqttClient.state());
    return false;
  }

  mqttConnected = true;
  clearLastMqttError();

  const bool pageSubscribed = mqttClient.subscribe(getMqttTopic("page/set").c_str());
  const bool darkModeSubscribed = mqttClient.subscribe(getMqttTopic("dark_mode/set").c_str());
  if (!pageSubscribed || !darkModeSubscribed)
  {
    setLastMqttError("subscribe_failed");
  }

  publishMqttStateSnapshot(true);
  Serial.printf(
      "MQTT_CONNECTED HOST=%s PORT=%u TOPIC=%s\n",
      mqttConfig.host.c_str(),
      mqttConfig.port,
      getEffectiveMqttTopicPrefix().c_str());
  return true;
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
  StaticJsonDocument<384> doc;
  doc["ok"] = true;
  doc["wifiConnected"] = WiFi.status() == WL_CONNECTED;
  doc["homeAssistantConfigured"] = homeAssistantConfigured();
  doc["homeAssistantConnected"] = homeAssistantAuthenticated;
  doc["mqttConfigured"] = mqttConfigured();
  doc["mqttConnected"] = mqttClient.connected();
  doc["currentPageIndex"] = currentPageIndex;
  doc["currentPageName"] = getCurrentPageName();
  doc["darkMode"] = currentDarkModeEnabled;
  doc["ip"] = WiFi.localIP().toString();
  String payload;
  serializeJson(doc, payload);
  server.send(200, "application/json", payload);
}

void handleRoot()
{
  const bool mqttIsConfigured = mqttConfigured();
  const bool mqttIsConnected = mqttClient.connected();
  const String currentNotice =
      server.hasArg("saved") ? String("MQTT settings saved.") : (server.hasArg("applied") ? String("Display settings updated.") : "");
  const String currentError =
      server.hasArg("error") ? server.arg("error") : "";
  const String ipAddress = WiFi.localIP().toString();
  const String mqttTopicPrefix = getEffectiveMqttTopicPrefix();
  const String discoveryPrefix = getEffectiveMqttDiscoveryPrefix();

  String pageOptions;
  for (int pageIndex = 0; pageIndex < UI_PAGE_COUNT; pageIndex++)
  {
    pageOptions += "<option value=\"";
    pageOptions += htmlEscape(UI_PAGES[pageIndex].name);
    pageOptions += "\"";
    if (pageIndex == currentPageIndex)
    {
      pageOptions += " selected";
    }
    pageOptions += ">";
    pageOptions += htmlEscape(UI_PAGES[pageIndex].name);
    pageOptions += "</option>";
  }

  String html = "<!doctype html><html><head><meta charset=\"utf-8\">";
  html += "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">";
  html += "<title>M5PaperS3</title>";
  html += "<style>";
  html += "body{font-family:system-ui,sans-serif;background:#f5f5f4;color:#18181b;margin:0;padding:24px;}";
  html += ".wrap{max-width:860px;margin:0 auto;display:grid;gap:18px;}";
  html += ".card{background:#fff;border:1px solid #d4d4d8;border-radius:18px;padding:24px;box-shadow:0 8px 24px rgba(0,0,0,.04);}";
  html += ".grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));}";
  html += ".stack{display:grid;gap:12px;}";
  html += "h1,h2,h3{margin:0 0 10px;}p{line-height:1.5;margin:0 0 10px;}small,.muted{color:#52525b;}";
  html += "code{background:#f4f4f5;padding:2px 6px;border-radius:6px;word-break:break-all;}";
  html += "label{display:grid;gap:6px;font-size:14px;color:#27272a;}";
  html += "input,select{width:100%;padding:10px 12px;border:1px solid #d4d4d8;border-radius:10px;font:inherit;box-sizing:border-box;}";
  html += "button{padding:10px 14px;border-radius:10px;border:0;background:#18181b;color:#fff;font:inherit;cursor:pointer;}";
  html += ".secondary{background:#e4e4e7;color:#18181b;}";
  html += ".row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;}";
  html += ".badge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;background:#e4e4e7;color:#18181b;}";
  html += ".ok{background:#dcfce7;color:#166534;}.warn{background:#fef3c7;color:#92400e;}.err{background:#fee2e2;color:#991b1b;}";
  html += ".notice{padding:12px 14px;border-radius:12px;background:#dcfce7;color:#166534;}";
  html += ".error{padding:12px 14px;border-radius:12px;background:#fee2e2;color:#991b1b;}";
  html += "ul{margin:10px 0 0;padding-left:20px;}hr{border:0;border-top:1px solid #e4e4e7;margin:18px 0;}";
  html += "@media (max-width:640px){body{padding:16px;}.card{padding:18px;}}";
  html += "</style></head><body><div class=\"wrap\">";

  if (currentNotice.length() > 0)
  {
    html += "<div class=\"notice\">";
    html += htmlEscape(currentNotice);
    html += "</div>";
  }

  if (currentError.length() > 0)
  {
    html += "<div class=\"error\">";
    html += htmlEscape(currentError);
    html += "</div>";
  }

  html += "<section class=\"card stack\"><div class=\"row\" style=\"justify-content:space-between;align-items:flex-start;\">";
  html += "<div><h1>M5PaperS3 is online</h1><p class=\"muted\">Configure MQTT directly on the device and use the topics below from Home Assistant.</p></div>";
  html += "<span class=\"badge ";
  html += WiFi.status() == WL_CONNECTED ? "ok" : "err";
  html += "\">Wi-Fi ";
  html += WiFi.status() == WL_CONNECTED ? "connected" : "offline";
  html += "</span></div><div class=\"grid\">";
  html += "<div><strong>IP</strong><p><code>";
  html += htmlEscape(ipAddress);
  html += "</code></p></div>";
  html += "<div><strong>Firmware</strong><p>";
  html += htmlEscape(FIRMWARE_DISPLAY_NAME);
  html += "</p></div>";
  html += "<div><strong>Version</strong><p>";
  html += htmlEscape(FIRMWARE_VERSION_NAME);
  html += "</p></div>";
  html += "<div><strong>MQTT</strong><p><span class=\"badge ";
  if (!mqttIsConfigured)
  {
    html += "warn\">disabled";
  }
  else if (mqttIsConnected)
  {
    html += "ok\">connected";
  }
  else
  {
    html += "err\">disconnected";
  }
  html += "</span></p></div></div></section>";

  html += "<section class=\"card stack\"><h2>Display</h2><div class=\"grid\">";
  html += "<div><strong>Current page</strong><p>";
  html += htmlEscape(getCurrentPageName());
  html += " <span class=\"muted\">(index ";
  html += currentPageIndex;
  html += ")</span></p></div>";
  html += "<div><strong>Dark mode</strong><p>";
  html += currentDarkModeEnabled ? "Enabled" : "Disabled";
  html += "</p></div></div>";
  html += "<div class=\"row\"><form method=\"post\" action=\"/api/page\"><button class=\"secondary\" type=\"submit\" name=\"action\" value=\"previous\">Previous Page</button></form>";
  html += "<form method=\"post\" action=\"/api/page\"><button class=\"secondary\" type=\"submit\" name=\"action\" value=\"next\">Next Page</button></form>";
  html += "<form method=\"post\" action=\"/api/dark-mode\"><button type=\"submit\" name=\"action\" value=\"toggle\">Toggle Dark Mode</button></form></div>";
  html += "<form method=\"post\" action=\"/api/page\" class=\"stack\"><label>Open page<select name=\"page\">";
  html += pageOptions;
  html += "</select></label><div class=\"row\"><button type=\"submit\">Show Page</button></div></form></section>";

  html += "<section class=\"card stack\"><h2>MQTT Settings</h2>";
  html += "<p class=\"muted\">Home Assistant discovery creates an MQTT select for page changes and an MQTT switch for dark mode.</p>";
  html += "<form method=\"post\" action=\"/api/mqtt\" class=\"stack\">";
  html += "<label><span>Enable MQTT</span><input type=\"checkbox\" name=\"enabled\" value=\"1\"";
  if (mqttConfig.enabled)
  {
    html += " checked";
  }
  html += "></label>";
  html += "<div class=\"grid\">";
  html += "<label><span>Broker host</span><input name=\"host\" placeholder=\"192.168.1.10\" value=\"";
  html += htmlEscape(mqttConfig.host);
  html += "\"></label>";
  html += "<label><span>Port</span><input name=\"port\" type=\"number\" min=\"1\" max=\"65535\" value=\"";
  html += mqttConfig.port;
  html += "\"></label></div>";
  html += "<div class=\"grid\">";
  html += "<label><span>Username</span><input name=\"username\" autocomplete=\"username\" value=\"";
  html += htmlEscape(mqttConfig.username);
  html += "\"></label>";
  html += "<label><span>Password</span><input name=\"password\" type=\"password\" autocomplete=\"current-password\" value=\"";
  html += htmlEscape(mqttConfig.password);
  html += "\"></label></div>";
  html += "<div class=\"grid\">";
  html += "<label><span>Topic prefix</span><input name=\"topic_prefix\" placeholder=\"m5papers3/my-frame\" value=\"";
  html += htmlEscape(mqttConfig.topicPrefix);
  html += "\"></label>";
  html += "<label><span>Discovery prefix</span><input name=\"discovery_prefix\" placeholder=\"homeassistant\" value=\"";
  html += htmlEscape(mqttConfig.discoveryPrefix);
  html += "\"></label></div>";
  html += "<label><span>Enable Home Assistant discovery</span><input type=\"checkbox\" name=\"discovery_enabled\" value=\"1\"";
  if (mqttConfig.discoveryEnabled)
  {
    html += " checked";
  }
  html += "></label>";
  html += "<div class=\"row\"><button type=\"submit\">Save MQTT Settings</button></div></form>";
  if (lastMqttError[0] != '\0')
  {
    html += "<p class=\"muted\">Last MQTT status: <code>";
    html += htmlEscape(lastMqttError);
    html += "</code></p>";
  }
  html += "</section>";

  html += "<section class=\"card stack\"><h2>Topics</h2>";
  html += "<p><strong>Base topic:</strong> <code>";
  html += htmlEscape(mqttTopicPrefix);
  html += "</code></p><ul>";
  html += "<li><code>";
  html += htmlEscape(getMqttTopic("page/set"));
  html += "</code> accepts page name, page number, <code>next</code>, or <code>previous</code>.</li>";
  html += "<li><code>";
  html += htmlEscape(getMqttTopic("page/state"));
  html += "</code> publishes the current page name.</li>";
  html += "<li><code>";
  html += htmlEscape(getMqttTopic("page/index"));
  html += "</code> publishes the zero-based current page index.</li>";
  html += "<li><code>";
  html += htmlEscape(getMqttTopic("dark_mode/set"));
  html += "</code> accepts <code>ON</code>, <code>OFF</code>, or <code>TOGGLE</code>.</li>";
  html += "<li><code>";
  html += htmlEscape(getMqttTopic("dark_mode/state"));
  html += "</code> publishes <code>ON</code> or <code>OFF</code>.</li>";
  html += "<li><code>";
  html += htmlEscape(getMqttTopic("availability"));
  html += "</code> publishes device availability.</li></ul>";
  html += "<p><strong>Discovery prefix:</strong> <code>";
  html += htmlEscape(discoveryPrefix);
  html += "</code></p></section>";

  html += "<section class=\"card stack\"><h2>OTA</h2><p>Use this IP in the web app to save the device for OTA updates.</p>";
  html += "<p class=\"muted\">Firmware uploads are still available at <code>/api/ota</code> and <code>/api/ota/upload</code>.</p></section>";
  html += "</div></body></html>";
  server.send(200, "text/html", html);
}

void handleMqttConfigSave()
{
  MqttConfig nextConfig = mqttConfig;
  nextConfig.enabled = server.hasArg("enabled");
  nextConfig.host = server.hasArg("host") ? server.arg("host") : "";
  nextConfig.port = parsePortOrDefault(server.hasArg("port") ? server.arg("port") : "", MQTT_DEFAULT_PORT);
  nextConfig.username = server.hasArg("username") ? server.arg("username") : "";
  nextConfig.password = server.hasArg("password") ? server.arg("password") : "";
  nextConfig.topicPrefix = normalizeTopicPath(server.hasArg("topic_prefix") ? server.arg("topic_prefix") : "");
  nextConfig.discoveryEnabled = server.hasArg("discovery_enabled");
  nextConfig.discoveryPrefix = normalizeTopicPath(server.hasArg("discovery_prefix") ? server.arg("discovery_prefix") : "");
  nextConfig.host = normalizeMqttHost(nextConfig.host, nextConfig.port);
  if (nextConfig.discoveryPrefix.length() == 0)
  {
    nextConfig.discoveryPrefix = MQTT_DEFAULT_DISCOVERY_PREFIX;
  }

  if (nextConfig.enabled && nextConfig.host.length() == 0)
  {
    server.sendHeader("Location", "/?error=Broker%20host%20is%20required%20when%20MQTT%20is%20enabled.", true);
    server.send(303, "text/plain", "");
    return;
  }

  disconnectMqtt(true);
  mqttConfig = nextConfig;
  saveMqttConfig(mqttConfig);
  configureMqttClient();
  lastMqttReconnectAttemptMs = 0;
  if (mqttConfigured())
  {
    ensureMqttConnected();
  }
  else
  {
    clearLastMqttError();
  }

  server.sendHeader("Location", "/?saved=1", true);
  server.send(303, "text/plain", "");
}

void handlePageControl()
{
  String command = server.hasArg("page") ? server.arg("page") : "";
  if (command.length() == 0 && server.hasArg("action"))
  {
    command = server.arg("action");
  }

  if (!handleMqttPageCommand(command))
  {
    server.sendHeader("Location", "/?error=Invalid%20page%20command.", true);
    server.send(303, "text/plain", "");
    return;
  }

  server.sendHeader("Location", "/?applied=page", true);
  server.send(303, "text/plain", "");
}

void handleDarkModeControl()
{
  String command = server.hasArg("action") ? server.arg("action") : "";
  if (command.length() == 0 && server.hasArg("enabled"))
  {
    command = server.arg("enabled");
  }
  if (command.length() == 0)
  {
    command = "toggle";
  }

  if (!handleMqttDarkModeCommand(command))
  {
    server.sendHeader("Location", "/?error=Invalid%20dark%20mode%20command.", true);
    server.send(303, "text/plain", "");
    return;
  }

  server.sendHeader("Location", "/?applied=dark-mode", true);
  server.send(303, "text/plain", "");
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
  setupPowerMonitoring();
  int totalWidgets = 0;
  for (int pageIndex = 0; pageIndex < UI_PAGE_COUNT; pageIndex++)
  {
    totalWidgets += UI_PAGES[pageIndex].widgetCount;
  }
  loadUiPreferences();
  loadMqttConfig();
  configureMqttClient();
  Serial.printf("FW_BUILD_ID %s\n", UI_BUILD_ID);
  Serial.printf(
      "UI_CONFIG PAGES=%d FONT=%s THEME_DARK=%d RUNTIME_DARK=%d\n",
      UI_PAGE_COUNT,
      UI_FONT_NAME,
      UI_THEME_DARK,
      currentDarkModeEnabled ? 1 : 0);
  Serial.printf(
      "UI_WIDGETS TOTAL=%d PARTIAL_MS=%d FULL_EVERY=%d\n",
      totalWidgets,
      PARTIAL_REFRESH_MS_OVERRIDE,
      FULL_REFRESH_EVERY_N_PARTIALS_OVERRIDE);
  Serial.printf(
      "MQTT_CONFIG ENABLED=%d HOST=%s PORT=%u TOPIC=%s DISCOVERY=%d\n",
      mqttConfig.enabled ? 1 : 0,
      mqttConfig.host.c_str(),
      mqttConfig.port,
      getEffectiveMqttTopicPrefix().c_str(),
      mqttConfig.discoveryEnabled ? 1 : 0);

  setupDisplay();

  currentCredentials = loadCredentials();
  if (homeAssistantConfigured())
  {
    parseHomeAssistantUrl(HOME_ASSISTANT_URL_BUILD, homeAssistantUrl);
  }
  connectWifi(currentCredentials);
  waitForWifiOrTimeout(15000);

  server.on("/", HTTP_GET, handleRoot);
  server.on("/api/health", HTTP_GET, handleHealth);
  server.on("/api/mqtt", HTTP_POST, handleMqttConfigSave);
  server.on("/api/page", HTTP_POST, handlePageControl);
  server.on("/api/dark-mode", HTTP_POST, handleDarkModeControl);
  server.on("/api/ota", HTTP_POST, handleOtaRequest);
  server.on("/api/ota/upload", HTTP_POST, handleOtaUploadRequest, handleOtaUploadData);
  server.on("/api/automation-switch", HTTP_GET, handleAutomationSwitchState);
  server.on("/api/automation-switch", HTTP_POST, handleAutomationSwitchSet);
  startServerIfNeeded();
  if (mqttConfigured())
  {
    ensureMqttConnected();
  }
  if (homeAssistantConfigured() && homeAssistantUrl.valid)
  {
    syncAllHomeAssistantEntityStates(false);
    if (pageReady)
    {
      renderActivePage();
    }
    ensureHomeAssistantSocket();
  }
}

void loop()
{
  handleSerialProvisioning();

  if (WiFi.status() == WL_CONNECTED)
  {
    startServerIfNeeded();
    ensureMqttConnected();
    if (mqttClient.connected())
    {
      if (!mqttClient.loop())
      {
        mqttConnected = false;
        mqttDiscoveryPublished = false;
        setLastMqttError(String("loop_") + mqttStateName(mqttClient.state()));
      }
      else if (millis() - lastMqttTelemetryPublishMs >= MQTT_TELEMETRY_PUBLISH_INTERVAL_MS)
      {
        publishMqttTelemetryState();
      }
    }
    if (homeAssistantConfigured() && homeAssistantUrl.valid)
    {
      ensureHomeAssistantSocket();
      if (homeAssistantSocketStarted)
      {
        homeAssistantSocket.loop();
      }

      const uint32_t pollIntervalMs = homeAssistantAuthenticated ? 60000UL : 15000UL;
      if (millis() - lastHomeAssistantPollMs >= pollIntervalMs)
      {
        syncAllHomeAssistantEntityStates(false);
      }
    }
  }

  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiRetry > 30000)
  {
    if (mqttClient.connected())
    {
      disconnectMqtt(false);
    }
    lastWifiRetry = millis();
    connectWifi(currentCredentials);
    waitForWifiOrTimeout(8000);
    if (WiFi.status() == WL_CONNECTED && homeAssistantConfigured() && homeAssistantUrl.valid)
    {
      syncAllHomeAssistantEntityStates(false);
      if (pageReady)
      {
        renderActivePage();
      }
      ensureHomeAssistantSocket();
    }
  }

  if (serverStarted && WiFi.status() == WL_CONNECTED)
  {
    server.handleClient();
  }
  runDisplayLoop();
}
