#include "media_cover_helpers.h"

#if __has_include(<esp_heap_caps.h>)
#include <esp_heap_caps.h>
#endif

#include "firmware_utils.h"

uint8_t *allocateMediaCoverBuffer(size_t size)
{
#if __has_include(<esp_heap_caps.h>)
  void *buffer = heap_caps_malloc(size, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
  if (buffer == nullptr)
  {
    buffer = heap_caps_malloc(size, MALLOC_CAP_8BIT);
  }
  return static_cast<uint8_t *>(buffer);
#else
  return static_cast<uint8_t *>(malloc(size));
#endif
}

void fillPackedGrayBuffer(uint8_t *buffer, size_t byteCount, uint8_t gray)
{
  if (buffer == nullptr || byteCount == 0)
  {
    return;
  }

  const uint8_t packed = static_cast<uint8_t>(((gray & 0x0F) << 4) | (gray & 0x0F));
  memset(buffer, packed, byteCount);
}

uint8_t quantizeGrayTo4bppOrdered(uint8_t gray8, int x, int y)
{
  static const uint8_t bayer4x4[4][4] = {
      {0, 8, 2, 10},
      {12, 4, 14, 6},
      {3, 11, 1, 9},
      {15, 7, 13, 5},
  };

  int adjusted = static_cast<int>(gray8) + static_cast<int>(bayer4x4[y & 0x03][x & 0x03]) - 8;
  adjusted = clampInt(adjusted, 0, 255);
  return static_cast<uint8_t>(adjusted >> 4);
}

void setPackedGrayPixel(uint8_t *buffer, int width, int x, int y, uint8_t gray)
{
  if (buffer == nullptr || width <= 0 || x < 0 || y < 0 || x >= width)
  {
    return;
  }

  const int pitch = (width + 1) / 2;
  const int offset = (y * pitch) + (x / 2);
  if ((x & 1) == 0)
  {
    buffer[offset] = static_cast<uint8_t>((buffer[offset] & 0x0F) | ((gray & 0x0F) << 4));
  }
  else
  {
    buffer[offset] = static_cast<uint8_t>((buffer[offset] & 0xF0) | (gray & 0x0F));
  }
}

bool isJpegImageData(const uint8_t *data, size_t length)
{
  return data != nullptr &&
         length >= 3 &&
         data[0] == 0xFF &&
         data[1] == 0xD8 &&
         data[2] == 0xFF;
}
