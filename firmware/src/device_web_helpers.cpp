#include "device_web_helpers.h"

String extractJsonString(const String &json, const char *key)
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

String htmlEscape(const String &value)
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
