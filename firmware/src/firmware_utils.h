#pragma once

#include <Arduino.h>

String normalizeDisplayText(const char *text);
size_t utf8CodepointLength(const char *text);
size_t utf8CharacterCount(const char *text);
size_t copyUtf8Prefix(const char *input, size_t maxChars, char *output, size_t outputLen);
void copyUtf8StringToBuffer(const String &input, char *output, size_t outputLen);

int clampInt(int value, int minValue, int maxValue);
void formatTemperatureTenths(int valueTenths, char *out, size_t outLen);

String normalizeTopicPath(const String &rawValue);
uint16_t parsePortOrDefault(const String &rawValue, uint16_t fallback);
bool parseBooleanPayload(const String &rawPayload, bool currentValue, bool &parsedValue);
String normalizeDiagnosticText(const char *value);
