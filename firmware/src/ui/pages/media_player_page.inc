#if UI_MEDIA_COVER_AVAILABLE
static bool pointInsideRoundedRect(int localX, int localY, int width, int height, int radius)
{
  if (radius <= 0)
  {
    return true;
  }
  if (localX < 0 || localY < 0 || localX >= width || localY >= height)
  {
    return false;
  }

  const int clampedRadius = clampInt(radius, 1, width / 2 < height / 2 ? width / 2 : height / 2);
  if ((localX >= clampedRadius && localX < (width - clampedRadius)) ||
      (localY >= clampedRadius && localY < (height - clampedRadius)))
  {
    return true;
  }

  const int circleRadius = clampedRadius - 1;
  if (circleRadius <= 0)
  {
    return true;
  }

  int centerX = localX < clampedRadius ? circleRadius : width - clampedRadius;
  int centerY = localY < clampedRadius ? circleRadius : height - clampedRadius;
  const int dx = localX - centerX;
  const int dy = localY - centerY;
  return (dx * dx) + (dy * dy) <= (circleRadius * circleRadius);
}

static void drawMediaCover4bppRaw(const BB_RECT &rect, int radius)
{
  const MediaCoverAsset *cover = &MEDIA_COVER_ASSET_BLACK;
  const int pitch = (cover->width + 1) / 2;

  for (int yy = 0; yy < rect.h; yy++)
  {
    const int destY = rect.y + yy;
    if (destY < 0 || destY >= display.height())
    {
      continue;
    }
    const int srcY = (yy * cover->height) / rect.h;
    for (int xx = 0; xx < rect.w; xx++)
    {
      if (!pointInsideRoundedRect(xx, yy, rect.w, rect.h, radius))
      {
        continue;
      }
      const int destX = rect.x + xx;
      if (destX < 0 || destX >= display.width())
      {
        continue;
      }
      const int srcX = (xx * cover->width) / rect.w;
      const uint8_t packed = pgm_read_byte(cover->pixels + (srcY * pitch) + (srcX / 2));
      const uint8_t gray = (srcX & 1) == 0 ? ((packed >> 4) & 0x0F) : (packed & 0x0F);
      display.drawPixelFast(destX, destY, uiGrayValue(gray));
    }
  }
}
#endif

static void formatMediaTime(int seconds, char *out, size_t outLen)
{
  const int clamped = seconds < 0 ? 0 : seconds;
  const int minutes = clamped / 60;
  const int remainder = clamped % 60;
  snprintf(out, outLen, "%02d:%02d", minutes, remainder);
}

static void drawMediaPlayerBody()
{
  static const char *MEDIA_TITLE = "Welcome To The Black";
  static const char *MEDIA_ARTIST = "My Chemical Romance";
  static const int MEDIA_ELAPSED_SECONDS = 102;
  static const int MEDIA_DURATION_SECONDS = 237;
  const int coverRadius = 38;
  const int coverBottom = mediaPlayerCoverRect.y + mediaPlayerCoverRect.h;
  const int artistTop = coverBottom + 18;
  const int titleTop = coverBottom + 50;
  const int timeTop = mediaPlayerProgressRect.y + 28;
  const int mediaTitleMaxWidth = mediaPlayerContentRect.w - 32;
  char mediaTitle[48];
  const void *mediaTitleFont = getUiMediaTitleFont();

  display.fillRect(
      mediaPlayerContentRect.x,
      mediaPlayerContentRect.y,
      mediaPlayerContentRect.w,
      mediaPlayerContentRect.h,
      uiGrayPaper());

#if UI_MEDIA_COVER_AVAILABLE
  drawMediaCover4bppRaw(mediaPlayerCoverRect, coverRadius);
#else
  display.fillRoundRect(mediaPlayerCoverRect.x, mediaPlayerCoverRect.y, mediaPlayerCoverRect.w, mediaPlayerCoverRect.h, coverRadius, uiGrayValue(12));
  display.drawRoundRect(mediaPlayerCoverRect.x, mediaPlayerCoverRect.y, mediaPlayerCoverRect.w, mediaPlayerCoverRect.h, coverRadius, uiGrayValue(1));
  display.drawLine(mediaPlayerCoverRect.x + 24, mediaPlayerCoverRect.y + 24, mediaPlayerCoverRect.x + mediaPlayerCoverRect.w - 24, mediaPlayerCoverRect.y + mediaPlayerCoverRect.h - 24, uiGrayValue(2));
  display.drawLine(mediaPlayerCoverRect.x + mediaPlayerCoverRect.w - 24, mediaPlayerCoverRect.y + 24, mediaPlayerCoverRect.x + 24, mediaPlayerCoverRect.y + mediaPlayerCoverRect.h - 24, uiGrayValue(2));
#endif

  display.drawRoundRect(mediaPlayerCoverRect.x, mediaPlayerCoverRect.y, mediaPlayerCoverRect.w, mediaPlayerCoverRect.h, coverRadius, uiGrayValue(2));

  const void *artistFont = getUiMediaArtistFont();
  setThemeGrayText(7, 15);
  if (artistFont != nullptr)
  {
    const int artistWidth = customFontTextWidth(artistFont, MEDIA_ARTIST);
    drawCustomTextAtTopAA(artistFont, MEDIA_ARTIST, mediaPlayerBodyRect.x + ((mediaPlayerBodyRect.w - artistWidth) / 2), artistTop);
  }
  else
  {
    selectTextFont(UI_TEXT_BODY);
    display.setCursor(0, 0);
    BB_RECT artistBounds;
    display.getStringBox(MEDIA_ARTIST, &artistBounds);
    const int artistWidth = artistBounds.w;
    display.setCursor(
        mediaPlayerBodyRect.x + ((mediaPlayerBodyRect.w - artistWidth) / 2),
        artistTop - artistBounds.y);
    display.print(MEDIA_ARTIST);
    display.setItalic(false);
  }

  truncateTextToWidth(
      MEDIA_TITLE,
      mediaTitle,
      sizeof(mediaTitle),
      mediaTitleMaxWidth,
      mediaTitleFont,
      UI_TEXT_TITLE,
      getUiFontProfile() == UI_FONT_PROFILE_MONO ? 22 : 30);

  if (mediaTitleFont != nullptr)
  {
    setThemeGrayText(1, 15);
    const int titleWidth = customFontTextWidth(mediaTitleFont, mediaTitle);
    drawCustomTextAtTopAA(mediaTitleFont, mediaTitle, mediaPlayerContentRect.x + ((mediaPlayerContentRect.w - titleWidth) / 2), titleTop);
  }
  else
  {
    display.setCursor(0, 0);
    selectTextFont(UI_TEXT_TITLE);
    BB_RECT titleBounds;
    display.getStringBox(mediaTitle, &titleBounds);
    setThemeGrayText(1, 15);
    printTextAt(
        mediaTitle,
        mediaPlayerContentRect.x + ((mediaPlayerContentRect.w - titleBounds.w) / 2),
        titleTop - titleBounds.y);
    display.setItalic(false);
  }

  display.fillRoundRect(mediaPlayerProgressRect.x, mediaPlayerProgressRect.y, mediaPlayerProgressRect.w, mediaPlayerProgressRect.h, mediaPlayerProgressRect.h / 2, uiGrayValue(13));
  const int fillWidth = (mediaPlayerProgressRect.w * MEDIA_ELAPSED_SECONDS) / MEDIA_DURATION_SECONDS;
  display.fillRoundRect(mediaPlayerProgressRect.x, mediaPlayerProgressRect.y, fillWidth, mediaPlayerProgressRect.h, mediaPlayerProgressRect.h / 2, uiGrayValue(2));

  char elapsedText[8];
  char durationText[8];
  formatMediaTime(MEDIA_ELAPSED_SECONDS, elapsedText, sizeof(elapsedText));
  formatMediaTime(MEDIA_DURATION_SECONDS, durationText, sizeof(durationText));
  setThemeGrayText(4, 15);
  display.setFont(FONT_12x16);
  printTextAt(elapsedText, mediaPlayerProgressRect.x, timeTop);
  const int durationWidth = textWidthForRole(durationText, UI_TEXT_BODY);
  printTextAt(durationText, mediaPlayerProgressRect.x + mediaPlayerProgressRect.w - durationWidth, timeTop);
}
