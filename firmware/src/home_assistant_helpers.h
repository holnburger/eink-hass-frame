#pragma once

#include <Arduino.h>

struct ParsedUrl
{
  bool valid;
  bool secure;
  uint16_t port;
  String host;
  String basePath;
};

String getEntityDomainString(const char *entityId);
bool entityIdHasDomain(const char *entityId, const char *domain);
bool parseHomeAssistantUrl(const char *rawUrl, ParsedUrl &parsed);
String joinBasePathAndSuffix(const String &basePath, const String &suffix);
String getHomeAssistantBaseUrl(const ParsedUrl &parsed);
String getHomeAssistantApiUrl(const ParsedUrl &parsed, const String &suffix);
String getHomeAssistantWebSocketPath(const ParsedUrl &parsed);
