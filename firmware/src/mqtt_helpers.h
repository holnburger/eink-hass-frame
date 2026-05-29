#pragma once

#include <Arduino.h>

String getMqttTextWidgetDiscoveryObjectSuffix(const String &component, const String &name);
String getMqttTextWidgetDiscoveryRegistryEntry(const String &component, const String &name);
bool parseMqttTextDiscoveryRegistryEntry(const String &entry, String &component, String &name);
bool mqttTextDiscoveryRegistryContains(const String &registry, const String &component, const String &name);
void appendMqttTextDiscoveryRegistryName(String &registry, const String &component, const String &name);
String normalizeMqttTextWidgetCommandPayload(const String &payload);
