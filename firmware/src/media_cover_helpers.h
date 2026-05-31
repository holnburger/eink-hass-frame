#pragma once

#include <Arduino.h>

uint8_t *allocateMediaCoverBuffer(size_t size);
void fillPackedGrayBuffer(uint8_t *buffer, size_t byteCount, uint8_t gray);
uint8_t quantizeGrayTo4bppOrdered(uint8_t gray8, int x, int y);
void setPackedGrayPixel(uint8_t *buffer, int width, int x, int y, uint8_t gray);
bool isJpegImageData(const uint8_t *data, size_t length);
