#include "home_assistant_helpers.h"

#include <string.h>

String getEntityDomainString(const char *entityId)
{
  if (entityId == nullptr || entityId[0] == '\0')
  {
    return "";
  }
  String domain = entityId;
  const int separator = domain.indexOf('.');
  return separator > 0 ? domain.substring(0, separator) : "";
}

bool entityIdHasDomain(const char *entityId, const char *domain)
{
  if (entityId == nullptr || domain == nullptr)
  {
    return false;
  }

  const size_t domainLength = strlen(domain);
  return strncmp(entityId, domain, domainLength) == 0 &&
         entityId[domainLength] == '.';
}

bool parseHomeAssistantUrl(const char *rawUrl, ParsedUrl &parsed)
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

String joinBasePathAndSuffix(const String &basePath, const String &suffix)
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

String getHomeAssistantBaseUrl(const ParsedUrl &parsed)
{
  const char *scheme = parsed.secure ? "https://" : "http://";
  String url = String(scheme) + parsed.host;
  const bool usingDefaultPort =
      (parsed.secure && parsed.port == 443) ||
      (!parsed.secure && parsed.port == 80);
  if (!usingDefaultPort)
  {
    url += ":";
    url += parsed.port;
  }
  return url;
}

String getHomeAssistantApiUrl(const ParsedUrl &parsed, const String &suffix)
{
  return getHomeAssistantBaseUrl(parsed) + joinBasePathAndSuffix(parsed.basePath, suffix);
}

String getHomeAssistantWebSocketPath(const ParsedUrl &parsed)
{
  return joinBasePathAndSuffix(parsed.basePath, "/api/websocket");
}
