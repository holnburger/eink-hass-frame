static void drawWidgetByType(int widgetIndex, bool pushPartial)
{
  if (!widgetShouldBeVisible(currentPageIndex, widgetIndex))
  {
    return;
  }

  const UiWidgetConfig widget = getWidgetConfig(currentPageIndex, widgetIndex);
  switch (widget.type)
  {
  case UI_WIDGET_CLOCK:
    drawClockWidget(widgetIndex, pushPartial);
    break;
  case UI_WIDGET_WEATHER:
    drawWeatherWidget(widgetIndex, pushPartial);
    break;
  case UI_WIDGET_PROGRESS:
    drawProgressWidget(widgetIndex, pushPartial);
    break;
  case UI_WIDGET_SWITCH:
    drawSwitchWidget(widgetIndex, pushPartial);
    break;
  case UI_WIDGET_SLIDER:
    drawSliderWidget(widgetIndex, pushPartial);
    break;
  case UI_WIDGET_THERMOSTAT:
    drawThermostatWidget(widgetIndex, pushPartial);
    break;
  case UI_WIDGET_TEXT:
    drawTextWidget(widgetIndex, pushPartial);
    break;
  default:
    break;
  }
}
