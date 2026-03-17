static size_t trimTextWidgetTrailingWhitespace(char *text)
{
  if (text == nullptr)
  {
    return 0;
  }

  size_t length = strlen(text);
  while (length > 0 && (text[length - 1] == ' ' || text[length - 1] == '\t'))
  {
    text[length - 1] = '\0';
    length--;
  }
  return length;
}

static const void *getTextWidgetDisplayFont()
{
  switch (getUiFontProfile())
  {
  case UI_FONT_PROFILE_SERIF:
#if UI_IBM_PLEX_SERIF_18_AVAILABLE
    return IBMPlexSerif_18;
#elif UI_IBM_PLEX_SERIF_16_AVAILABLE
    return IBMPlexSerif_16;
#endif
    break;
  case UI_FONT_PROFILE_MONO:
#if UI_IBM_PLEX_MONO_18_AVAILABLE
    return IBMPlexMono_18;
#elif UI_IBM_PLEX_MONO_16_AVAILABLE
    return IBMPlexMono_16;
#endif
    break;
  case UI_FONT_PROFILE_SYSTEM:
  default:
#if UI_INTER_18_AVAILABLE
    return Inter_Regular_18;
#elif UI_INTER_16_AVAILABLE
    return Inter_Regular_16;
#elif UI_ROBOTO_REGULAR_20_AVAILABLE
    return Roboto_Regular_20;
#endif
    break;
  }

  return getUiTextFont(UI_TEXT_BODY);
}

static int textWidgetLineWidth(const char *text)
{
  const void *font = getTextWidgetDisplayFont();
  return font != nullptr ? customFontTextWidth(font, text) : textWidthForRole(text, UI_TEXT_BODY);
}

static void drawTextWidgetLine(const char *text, int x, int topY)
{
  const void *font = getTextWidgetDisplayFont();
  if (font != nullptr)
  {
    drawCustomTextAtTop(font, text, x, topY);
    return;
  }

  drawTextRole(text, x, baselineForTopAlignedText(text, UI_TEXT_BODY, topY), UI_TEXT_BODY);
}

static size_t wrapTextWidgetLine(
    const char *input,
    char *output,
    size_t outputLen,
    int maxWidth,
    bool,
    bool *blankLineOut)
{
  if (blankLineOut != nullptr)
  {
    *blankLineOut = false;
  }
  if (output == nullptr || outputLen == 0)
  {
    return 0;
  }

  output[0] = '\0';
  if (input == nullptr || input[0] == '\0')
  {
    return 0;
  }

  size_t startOffset = 0;
  while (input[startOffset] == ' ' || input[startOffset] == '\t')
  {
    startOffset++;
  }

  if (input[startOffset] == '\0')
  {
    return startOffset;
  }

  if (input[startOffset] == '\n')
  {
    if (blankLineOut != nullptr)
    {
      *blankLineOut = true;
    }
    return startOffset + 1;
  }

  char candidate[160];
  size_t cursor = startOffset;
  size_t lastFitBytes = 0;
  size_t lastWhitespaceBytes = 0;

  while (input[cursor] != '\0' && input[cursor] != '\n')
  {
    const size_t charLen = utf8CodepointLength(input + cursor);
    if (charLen == 0)
    {
      break;
    }

    const size_t candidateBytes = (cursor + charLen) - startOffset;
    if (candidateBytes >= sizeof(candidate) || candidateBytes >= outputLen)
    {
      break;
    }

    memcpy(candidate, input + startOffset, candidateBytes);
    candidate[candidateBytes] = '\0';
    if (textWidgetLineWidth(candidate) > maxWidth)
    {
      break;
    }

    snprintf(output, outputLen, "%s", candidate);
    lastFitBytes = candidateBytes;
    if (input[cursor] == ' ' || input[cursor] == '\t')
    {
      lastWhitespaceBytes = candidateBytes;
    }
    cursor += charLen;
  }

  if (lastFitBytes == 0)
  {
    const size_t charLen = utf8CodepointLength(input + startOffset);
    const size_t copiedBytes = charLen < (outputLen - 1) ? charLen : (outputLen - 1);
    memcpy(output, input + startOffset, copiedBytes);
    output[copiedBytes] = '\0';
    return startOffset + copiedBytes;
  }

  if (input[cursor] == '\0')
  {
    trimTextWidgetTrailingWhitespace(output);
    return cursor;
  }

  if (input[cursor] == '\n')
  {
    trimTextWidgetTrailingWhitespace(output);
    return cursor + 1;
  }

  if (lastWhitespaceBytes > 0)
  {
    memcpy(output, input + startOffset, lastWhitespaceBytes);
    output[lastWhitespaceBytes] = '\0';
    trimTextWidgetTrailingWhitespace(output);
    size_t consumed = startOffset + lastWhitespaceBytes;
    while (input[consumed] == ' ' || input[consumed] == '\t')
    {
      consumed++;
    }
    return consumed;
  }

  trimTextWidgetTrailingWhitespace(output);
  return startOffset + lastFitBytes;
}

static void drawTextWidget(int widgetIndex, bool pushPartial)
{
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  if (state.cardRect.w <= 0 || state.cardRect.h <= 0)
  {
    return;
  }

  display.setMode(BB_MODE_1BPP);
  setThemeMonoText();
  display.fillRect(state.cardRect.x, state.cardRect.y, state.cardRect.w, state.cardRect.h, uiMonoPaper());

  const bool overview = activePageIsOverview();
  const int horizontalPadding = overview ? 18 : 16;
  const int verticalPadding = 8;
  const int lineBoxHeight = 18;
  const int lineAdvance = overview ? 30 : 28;
  const int availableHeight = state.cardRect.h - (verticalPadding * 2);
  const int maxWidth = state.cardRect.w > (horizontalPadding * 2)
                           ? state.cardRect.w - (horizontalPadding * 2)
                           : state.cardRect.w;
  char lines[10][160];
  memset(lines, 0, sizeof(lines));

  int maxLines = 1;
  for (int candidate = 1; candidate <= (int)(sizeof(lines) / sizeof(lines[0])); candidate++)
  {
    const int candidateHeight = lineBoxHeight + ((candidate - 1) * lineAdvance);
    if (candidateHeight <= availableHeight)
    {
      maxLines = candidate;
    }
    else
    {
      break;
    }
  }

  const char *textSource =
      textWidgetUsesMqttInput(widget) && state.textValueInitialized
          ? state.textValue
          : widget.label;
  const char *cursor = textSource;
  int lineCount = 0;
  while (cursor != nullptr && *cursor != '\0' && lineCount < maxLines)
  {
    bool blankLine = false;
    const size_t consumed = wrapTextWidgetLine(
        cursor,
        lines[lineCount],
        sizeof(lines[lineCount]),
        maxWidth,
        overview,
        &blankLine);
    if (consumed == 0)
    {
      break;
    }

    cursor += consumed;
    if (blankLine || lines[lineCount][0] != '\0')
    {
      lineCount++;
    }
  }

  if (lineCount == 0)
  {
    if (pushPartial)
    {
      display.partialUpdate(false);
      partialCounter++;
      lastPartialRefresh = millis();
    }
    return;
  }

  const int totalHeight = lineBoxHeight + ((lineCount - 1) * lineAdvance);
  int top = state.cardRect.y + verticalPadding + ((availableHeight - totalHeight) / 2);
  if (top < state.cardRect.y + verticalPadding)
  {
    top = state.cardRect.y + verticalPadding;
  }

  for (int index = 0; index < lineCount; index++)
  {
    if (lines[index][0] == '\0')
    {
      continue;
    }

    const int lineWidth = textWidgetLineWidth(lines[index]);
    int lineX = state.cardRect.x + ((state.cardRect.w - lineWidth) / 2);
    const int minX = state.cardRect.x + horizontalPadding;
    if (lineX < minX)
    {
      lineX = minX;
    }

    drawTextWidgetLine(lines[index], lineX, top + (index * lineAdvance));
  }

  if (pushPartial)
  {
    display.partialUpdate(false);
    partialCounter++;
    lastPartialRefresh = millis();
  }
}
