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

#if UI_MEDIA_COVER_AVAILABLE
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

static bool mediaStateIndicatesNoRenderableMedia(const char *stateLabel)
{
  if (stateLabel == nullptr || stateLabel[0] == '\0')
  {
    return false;
  }

  return strcmp(stateLabel, "idle") == 0 ||
         strcmp(stateLabel, "off") == 0 ||
         strcmp(stateLabel, "standby") == 0 ||
         strcmp(stateLabel, "unknown") == 0 ||
         strcmp(stateLabel, "unavailable") == 0;
}

static bool mediaStateHasRenderableMedia(const MediaPageRuntimeState &state)
{
  if (!state.available)
  {
    return false;
  }

  if (strcmp(state.stateLabel, "playing") == 0 ||
      strcmp(state.stateLabel, "paused") == 0 ||
      strcmp(state.stateLabel, "buffering") == 0)
  {
    return true;
  }

  if (mediaStateIndicatesNoRenderableMedia(state.stateLabel))
  {
    return false;
  }

  return state.title[0] != '\0' ||
         state.coverUrl[0] != '\0' ||
         state.coverAvailable ||
         state.durationSeconds > 0 ||
         state.elapsedSeconds > 0;
}

static bool mediaPageHasRenderableMedia(int pageIndex)
{
  if (pageIndex < 0 || pageIndex >= UI_PAGE_COUNT)
  {
    return false;
  }
  if (!pageHasHomeAssistantBinding(pageIndex))
  {
    return true;
  }
  return mediaStateHasRenderableMedia(mediaPageStates[pageIndex]);
}

static BB_RECT mediaPlayerPlaybackRect()
{
  const int top = mediaPlayerProgressRect.y - 2;
  return BB_RECT{
      mediaPlayerProgressRect.x,
      top,
      mediaPlayerProgressRect.w,
      mediaPlayerProgressRect.h + 4,
  };
}

static BB_RECT mediaPlayerControlsRect()
{
  const int left = mediaPlayerPrevButtonRect.x;
  const int right = mediaPlayerNextButtonRect.x + mediaPlayerNextButtonRect.w;
  const int top = mediaPlayerPrevButtonRect.y - 2;
  const int bottom = mediaPlayerPrevButtonRect.y + mediaPlayerPrevButtonRect.h + 2;
  return BB_RECT{
      left,
      top,
      right - left,
      bottom - top,
  };
}

static const MdiMonoIconAsset *mediaPlayerPlayPauseIconAsset()
{
#if UI_MDI_ICONS_AVAILABLE
  const bool usePauseIcon = activeMediaPageUsesHomeAssistant() &&
                            mediaPageStates[currentPageIndex].available &&
                            mediaPageStates[currentPageIndex].playing;
  return usePauseIcon ? &MDI_ICON_ASSET_MEDIA_PAUSE : &MDI_ICON_ASSET_MEDIA_PLAY;
#else
  return nullptr;
#endif
}

static void drawMediaControlButton(const BB_RECT &rect, const MdiMonoIconAsset *icon, const char *fallbackLabel, bool emphasized)
{
  const uint8_t fillShade = emphasized ? uiGrayInk() : uiGrayPaper();
  const uint8_t strokeShade = uiGrayInk();
  const int radius = rect.w < rect.h ? rect.w / 2 : rect.h / 2;
  display.fillRoundRect(rect.x, rect.y, rect.w, rect.h, radius, fillShade);
  display.drawRoundRect(rect.x, rect.y, rect.w, rect.h, radius, strokeShade);

#if UI_MDI_ICONS_AVAILABLE
  if (icon != nullptr)
  {
    drawMdiMonoIconScaledColor(rect, icon, emphasized ? uiGrayPaper() : uiGrayInk(), emphasized ? 11 : 12);
    return;
  }
#endif

  display.setCursor(0, 0);
  selectTextFont(UI_TEXT_META);
  BB_RECT textBounds;
  getDisplayStringBox(fallbackLabel, &textBounds);
  const int textX = rect.x + ((rect.w - textBounds.w) / 2);
  const int textY = rect.y + ((rect.h - textBounds.h) / 2) - textBounds.y;
  setThemeGrayText(emphasized ? 15 : 0, emphasized ? 0 : 15);
  printTextAt(fallbackLabel, textX, textY);
  display.setItalic(false);
}

static void drawMediaPlayerPlaybackStatus()
{
  const BB_RECT playbackRect = mediaPlayerPlaybackRect();
  display.fillRect(playbackRect.x, playbackRect.y, playbackRect.w, playbackRect.h, uiGrayPaper());
  if (!mediaPageHasRenderableMedia(currentPageIndex))
  {
    return;
  }

  const bool useHomeAssistant = pageHasHomeAssistantBinding(currentPageIndex) && mediaPageStates[currentPageIndex].available;
  const int progress = useHomeAssistant
                           ? mediaPageStates[currentPageIndex].progress
                           : 43;
  display.fillRoundRect(
      mediaPlayerProgressRect.x,
      mediaPlayerProgressRect.y,
      mediaPlayerProgressRect.w,
      mediaPlayerProgressRect.h,
      mediaPlayerProgressRect.h / 2,
      uiGrayPaper());
  display.drawRoundRect(
      mediaPlayerProgressRect.x,
      mediaPlayerProgressRect.y,
      mediaPlayerProgressRect.w,
      mediaPlayerProgressRect.h,
      mediaPlayerProgressRect.h / 2,
      uiGrayValue(0));
  const int fillWidth = (mediaPlayerProgressRect.w * clampInt(progress, 0, 100)) / 100;
  if (fillWidth > 0)
  {
    display.fillRoundRect(
        mediaPlayerProgressRect.x,
        mediaPlayerProgressRect.y,
        fillWidth,
        mediaPlayerProgressRect.h,
        mediaPlayerProgressRect.h / 2,
        uiGrayValue(0));
  }
}

static void drawMediaPlayerTransportControls()
{
  const BB_RECT controlsRect = mediaPlayerControlsRect();
  display.fillRect(controlsRect.x, controlsRect.y, controlsRect.w, controlsRect.h, uiGrayPaper());
  if (!mediaPageHasRenderableMedia(currentPageIndex))
  {
    return;
  }

  drawMediaControlButton(mediaPlayerPrevButtonRect,
#if UI_MDI_ICONS_AVAILABLE
                         &MDI_ICON_ASSET_MEDIA_SKIP_PREVIOUS,
#else
                         nullptr,
#endif
                         "PREV",
                         false);
  drawMediaControlButton(mediaPlayerPlayPauseButtonRect, mediaPlayerPlayPauseIconAsset(), "PLAY", true);
  drawMediaControlButton(mediaPlayerNextButtonRect,
#if UI_MDI_ICONS_AVAILABLE
                         &MDI_ICON_ASSET_MEDIA_SKIP_NEXT,
#else
                         nullptr,
#endif
                         "NEXT",
                         false);
}

static void refreshMediaPlayerPlaybackRegion()
{
  if (!displayReady || !activePageIsMediaPlayer())
  {
    return;
  }

  BB_RECT playbackRect = mediaPlayerPlaybackRect();
  BB_RECT updateRect = grayUpdateBandRect(playbackRect);
  display.setMode(BB_MODE_4BPP);
  setThemeGrayText();
  drawMediaPlayerPlaybackStatus();
#ifdef CLEAR_NONE
  display.fullUpdate(CLEAR_NONE, false, &updateRect);
#else
  display.fullUpdate(1, false, &updateRect);
#endif
  partialCounter++;
  lastPartialRefresh = millis();
}

static void refreshMediaPlayerControlsRegion()
{
  if (!displayReady || !activePageIsMediaPlayer())
  {
    return;
  }

  BB_RECT controlsRect = mediaPlayerControlsRect();
  BB_RECT updateRect = grayUpdateBandRect(controlsRect);
  display.setMode(BB_MODE_4BPP);
  setThemeGrayText();
  drawMediaPlayerTransportControls();
#ifdef CLEAR_NONE
  display.fullUpdate(CLEAR_NONE, false, &updateRect);
#else
  display.fullUpdate(1, false, &updateRect);
#endif
  partialCounter++;
  lastPartialRefresh = millis();
}

static void drawMediaPlayerEmptyCover(int radius)
{
  display.fillRoundRect(
      mediaPlayerCoverRect.x,
      mediaPlayerCoverRect.y,
      mediaPlayerCoverRect.w,
      mediaPlayerCoverRect.h,
      radius,
      uiGrayValue(12));
  display.drawRoundRect(
      mediaPlayerCoverRect.x,
      mediaPlayerCoverRect.y,
      mediaPlayerCoverRect.w,
      mediaPlayerCoverRect.h,
      radius,
      uiGrayValue(3));

#if UI_MDI_ICONS_AVAILABLE
  drawMdiMonoIconScaledGray(mediaPlayerCoverRect, &MDI_ICON_ASSET_MEDIA_MUSIC_NOTE, 4, 88);
#else
  display.drawLine(
      mediaPlayerCoverRect.x + 24,
      mediaPlayerCoverRect.y + 24,
      mediaPlayerCoverRect.x + mediaPlayerCoverRect.w - 24,
      mediaPlayerCoverRect.y + mediaPlayerCoverRect.h - 24,
      uiGrayValue(2));
  display.drawLine(
      mediaPlayerCoverRect.x + mediaPlayerCoverRect.w - 24,
      mediaPlayerCoverRect.y + 24,
      mediaPlayerCoverRect.x + 24,
      mediaPlayerCoverRect.y + mediaPlayerCoverRect.h - 24,
      uiGrayValue(2));
#endif
}

static void drawMediaPlayerEmptyState()
{
  const int coverRadius = 38;
  const int coverBottom = mediaPlayerCoverRect.y + mediaPlayerCoverRect.h;
  const int titleTop = coverBottom + 36;
  const char *emptyLabel = mediaPageStates[currentPageIndex].available ? "Nothing Playing" : "Waiting For Media";
  const void *emptyTitleFont = getUiMediaTitleFont();

  drawMediaPlayerEmptyCover(coverRadius);

  if (emptyTitleFont != nullptr)
  {
    setThemeGrayText(5, 15);
    const int labelWidth = customFontTextWidth(emptyTitleFont, emptyLabel);
    drawCustomTextAtTopAA(emptyTitleFont, emptyLabel, mediaPlayerContentRect.x + ((mediaPlayerContentRect.w - labelWidth) / 2), titleTop);
    return;
  }

  selectTextFont(UI_TEXT_TITLE);
  display.setCursor(0, 0);
  BB_RECT titleBounds;
  getDisplayStringBox(emptyLabel, &titleBounds);
  setThemeGrayText(5, 15);
  printTextAt(
      emptyLabel,
      mediaPlayerContentRect.x + ((mediaPlayerContentRect.w - titleBounds.w) / 2),
      titleTop - titleBounds.y);
  display.setItalic(false);
}

static void drawMediaPlayerBody()
{
  const bool useHomeAssistant = pageHasHomeAssistantBinding(currentPageIndex) && mediaPageStates[currentPageIndex].available;
  const bool hasRenderableMedia = mediaPageHasRenderableMedia(currentPageIndex);
  const char *mediaTitleRaw = useHomeAssistant
                                  ? (mediaPageStates[currentPageIndex].title[0] != '\0' ? mediaPageStates[currentPageIndex].title : UI_PAGES[currentPageIndex].name)
                                  : "Welcome To The Black";
  const char *mediaArtistRaw = useHomeAssistant
                                   ? (mediaPageStates[currentPageIndex].artist[0] != '\0' ? mediaPageStates[currentPageIndex].artist : mediaPageStates[currentPageIndex].stateLabel)
                                   : "My Chemical Romance";
  const int coverRadius = 38;
  const int coverBottom = mediaPlayerCoverRect.y + mediaPlayerCoverRect.h;
  const int artistTop = coverBottom + 18;
  const bool showArtist = mediaArtistRaw[0] != '\0';
  const int titleTop = coverBottom + (showArtist ? 50 : 30);
  const int mediaTitleMaxWidth = mediaPlayerContentRect.w - 32;
  char mediaTitle[48];
  const void *mediaTitleFont = getUiMediaTitleFont();

  display.fillRect(
      mediaPlayerContentRect.x,
      mediaPlayerContentRect.y,
      mediaPlayerContentRect.w,
      mediaPlayerContentRect.h,
      uiGrayPaper());

  if (pageHasHomeAssistantBinding(currentPageIndex) && !hasRenderableMedia)
  {
    drawMediaPlayerEmptyState();
    return;
  }

  const bool drewDynamicCover = drawCachedMediaCover(currentPageIndex, mediaPlayerCoverRect, coverRadius);
#if UI_MEDIA_COVER_AVAILABLE
  if (!drewDynamicCover)
  {
    drawMediaCover4bppRaw(mediaPlayerCoverRect, coverRadius);
  }
#else
  if (!drewDynamicCover)
  {
    display.fillRoundRect(mediaPlayerCoverRect.x, mediaPlayerCoverRect.y, mediaPlayerCoverRect.w, mediaPlayerCoverRect.h, coverRadius, uiGrayValue(12));
    display.drawRoundRect(mediaPlayerCoverRect.x, mediaPlayerCoverRect.y, mediaPlayerCoverRect.w, mediaPlayerCoverRect.h, coverRadius, uiGrayValue(1));
    display.drawLine(mediaPlayerCoverRect.x + 24, mediaPlayerCoverRect.y + 24, mediaPlayerCoverRect.x + mediaPlayerCoverRect.w - 24, mediaPlayerCoverRect.y + mediaPlayerCoverRect.h - 24, uiGrayValue(2));
    display.drawLine(mediaPlayerCoverRect.x + mediaPlayerCoverRect.w - 24, mediaPlayerCoverRect.y + 24, mediaPlayerCoverRect.x + 24, mediaPlayerCoverRect.y + mediaPlayerCoverRect.h - 24, uiGrayValue(2));
  }
#endif

  display.drawRoundRect(mediaPlayerCoverRect.x, mediaPlayerCoverRect.y, mediaPlayerCoverRect.w, mediaPlayerCoverRect.h, coverRadius, uiGrayValue(2));

  const void *artistFont = getUiMediaArtistFont();
  if (showArtist)
  {
    setThemeGrayText(7, 15);
    if (artistFont != nullptr)
    {
      const int artistWidth = customFontTextWidth(artistFont, mediaArtistRaw);
      drawCustomTextAtTopAA(artistFont, mediaArtistRaw, mediaPlayerBodyRect.x + ((mediaPlayerBodyRect.w - artistWidth) / 2), artistTop);
    }
    else
    {
      selectTextFont(UI_TEXT_BODY);
      display.setCursor(0, 0);
      BB_RECT artistBounds;
      getDisplayStringBox(mediaArtistRaw, &artistBounds);
      const int artistWidth = artistBounds.w;
      display.setCursor(
          mediaPlayerBodyRect.x + ((mediaPlayerBodyRect.w - artistWidth) / 2),
          artistTop - artistBounds.y);
      printTextAt(mediaArtistRaw, mediaPlayerBodyRect.x + ((mediaPlayerBodyRect.w - artistWidth) / 2), artistTop - artistBounds.y);
      display.setItalic(false);
    }
  }

  truncateTextToWidth(
      mediaTitleRaw,
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
    getDisplayStringBox(mediaTitle, &titleBounds);
    setThemeGrayText(1, 15);
    printTextAt(
        mediaTitle,
        mediaPlayerContentRect.x + ((mediaPlayerContentRect.w - titleBounds.w) / 2),
        titleTop - titleBounds.y);
    display.setItalic(false);
  }
  drawMediaPlayerPlaybackStatus();
  drawMediaPlayerTransportControls();
}
