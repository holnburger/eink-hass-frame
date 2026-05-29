#include "mqtt_helpers.h"

#include <ArduinoJson.h>

String getMqttTextWidgetDiscoveryObjectSuffix(const String &component, const String &name)
{
  return component + "_" + name;
}

String getMqttTextWidgetDiscoveryRegistryEntry(const String &component, const String &name)
{
  return component + ":" + name;
}

bool parseMqttTextDiscoveryRegistryEntry(
    const String &entry,
    String &component,
    String &name)
{
  const int separator = entry.indexOf(':');
  if (separator < 0)
  {
    component = "text";
    name = entry;
  }
  else
  {
    component = entry.substring(0, separator);
    name = entry.substring(separator + 1);
  }

  component.trim();
  name.trim();
  if (component != "text" && component != "notify")
  {
    component = "text";
  }
  return name.length() > 0;
}

bool mqttTextDiscoveryRegistryContains(const String &registry, const String &component, const String &name)
{
  if (name.length() == 0)
  {
    return false;
  }

  const String expectedEntry = getMqttTextWidgetDiscoveryRegistryEntry(component, name);
  int start = 0;
  while (start <= registry.length())
  {
    int end = registry.indexOf('\n', start);
    if (end < 0)
    {
      end = registry.length();
    }

    String entry = registry.substring(start, end);
    entry.trim();
    if (entry == expectedEntry)
    {
      return true;
    }

    if (end >= registry.length())
    {
      break;
    }
    start = end + 1;
  }

  return false;
}

void appendMqttTextDiscoveryRegistryName(String &registry, const String &component, const String &name)
{
  if (name.length() == 0 || mqttTextDiscoveryRegistryContains(registry, component, name))
  {
    return;
  }

  if (registry.length() > 0 && registry[registry.length() - 1] != '\n')
  {
    registry += '\n';
  }
  registry += getMqttTextWidgetDiscoveryRegistryEntry(component, name);
}

String normalizeMqttTextWidgetCommandPayload(const String &payload)
{
  DynamicJsonDocument document(512);
  const DeserializationError error = deserializeJson(document, payload);
  if (error)
  {
    return payload;
  }

  if (document.is<const char *>())
  {
    return String(document.as<const char *>());
  }

  JsonObjectConst object = document.as<JsonObjectConst>();
  const char *message = object["message"] | "";
  if (message[0] != '\0')
  {
    return String(message);
  }

  const char *nestedMessage = object["data"]["message"] | "";
  return nestedMessage[0] != '\0' ? String(nestedMessage) : payload;
}
