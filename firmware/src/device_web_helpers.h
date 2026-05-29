#pragma once

#include <Arduino.h>

String extractJsonString(const String &json, const char *key);
String htmlEscape(const String &value);
