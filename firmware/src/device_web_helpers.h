#pragma once

#include <Arduino.h>

struct DeviceRootPageContext
{
  bool wifiConnected;
  bool mqttConfigured;
  bool mqttConnected;
  bool mqttEnabled;
  bool mqttDiscoveryEnabled;
  bool darkModeEnabled;
  int currentPageIndex;
  uint16_t mqttPort;
  const char *firmwareDisplayName;
  const char *firmwareVersionName;
  const char *lastMqttError;
  String currentNotice;
  String currentError;
  String ipAddress;
  String currentPageName;
  String mqttTopicPrefix;
  String discoveryPrefix;
  String pageOptionsHtml;
  String mqttHost;
  String mqttUsername;
  String mqttPassword;
  String mqttConfiguredTopicPrefix;
  String mqttConfiguredDiscoveryPrefix;
};

String extractJsonString(const String &json, const char *key);
String htmlEscape(const String &value);
String renderDeviceRootPage(const DeviceRootPageContext &context);
