#include "firmware_utils.h"

#include <stdlib.h>

String normalizeDisplayText(const char *text)
{
  return text == nullptr ? "" : String(text);
}

size_t utf8CodepointLength(const char *text)
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

size_t utf8CharacterCount(const char *text)
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

size_t copyUtf8Prefix(const char *input, size_t maxChars, char *output, size_t outputLen)
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

void copyUtf8StringToBuffer(const String &input, char *output, size_t outputLen)
{
  if (outputLen == 0)
  {
    return;
  }

  output[0] = '\0';
  const char *raw = input.c_str();
  if (raw == nullptr || raw[0] == '\0')
  {
    return;
  }

  const size_t maxBytes = outputLen - 1;
  size_t bytesWritten = 0;
  while (raw[bytesWritten] != '\0')
  {
    const size_t charLen = utf8CodepointLength(raw + bytesWritten);
    if (charLen == 0 || bytesWritten + charLen > maxBytes)
    {
      break;
    }

    memcpy(output + bytesWritten, raw + bytesWritten, charLen);
    bytesWritten += charLen;
  }
  output[bytesWritten] = '\0';
}

int clampInt(int value, int minValue, int maxValue)
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

void formatTemperatureTenths(int valueTenths, char *out, size_t outLen)
{
  const int absValue = abs(valueTenths);
  const int whole = absValue / 10;
  const int fraction = absValue % 10;
  snprintf(out, outLen, "%s%d.%d", valueTenths < 0 ? "-" : "", whole, fraction);
}

String normalizeTopicPath(const String &rawValue)
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

uint16_t parsePortOrDefault(const String &rawValue, uint16_t fallback)
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

bool parseBooleanPayload(const String &rawPayload, bool currentValue, bool &parsedValue)
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

String normalizeDiagnosticText(const char *value)
{
  return (value != nullptr && value[0] != '\0') ? String(value) : String("ok");
}
