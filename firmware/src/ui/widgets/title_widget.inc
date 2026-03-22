static int titleSeparatorTextWidth(const char *text)
{
  const void *font = getUiTextFont(UI_TEXT_BODY);
  return font != nullptr ? customFontTextWidth(font, text) : textWidthForRole(text, UI_TEXT_BODY);
}

static void drawTitleSeparatorText(const char *text, int x, int topY)
{
  const void *font = getUiTextFont(UI_TEXT_BODY);
  if (font != nullptr)
  {
    drawCustomTextAtTop(font, text, x, topY);
    return;
  }

  drawTextRole(text, x, baselineForTopAlignedText(text, UI_TEXT_BODY, topY), UI_TEXT_BODY);
}

static void drawTitleSeparatorWidget(int widgetIndex, bool pushPartial)
{
  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  WidgetRuntimeState &state = getWidgetState(currentPageIndex, widgetIndex);
  if (state.cardRect.w <= 0 || state.cardRect.h <= 0)
  {
    return;
  }

  const char *title = widget.label[0] != '\0' ? widget.label : "Section";
  const int textWidth = titleSeparatorTextWidth(title);
  const int textX = state.cardRect.x + ((state.cardRect.w - textWidth) / 2);
  const int centerY = state.cardRect.y + (state.cardRect.h / 2);
  const int textTop = state.cardRect.y + ((state.cardRect.h - 18) / 2) - 1;
  const int lineInset = 6;
  const int lineGap = 14;
  const int maskPadding = 8;
  const int leftStart = state.cardRect.x + lineInset;
  const int leftEnd = textX - lineGap;
  const int rightStart = textX + textWidth + lineGap;
  const int rightEnd = state.cardRect.x + state.cardRect.w - lineInset;

  display.setMode(BB_MODE_1BPP);
  setThemeMonoText();
  display.fillRect(state.cardRect.x, state.cardRect.y, state.cardRect.w, state.cardRect.h, uiMonoPaper());

  if (leftEnd > leftStart)
  {
    display.drawLine(leftStart, centerY, leftEnd, centerY, uiMonoInk());
  }
  if (rightEnd > rightStart)
  {
    display.drawLine(rightStart, centerY, rightEnd, centerY, uiMonoInk());
  }

  display.fillRect(textX - maskPadding, centerY - 12, textWidth + (maskPadding * 2), 24, uiMonoPaper());
  drawTitleSeparatorText(title, textX, textTop);

  if (pushPartial)
  {
    display.partialUpdate(false);
    partialCounter++;
    lastPartialRefresh = millis();
  }
}
