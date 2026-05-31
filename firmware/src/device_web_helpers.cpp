#include "device_web_helpers.h"

String extractJsonString(const String &json, const char *key)
{
  const String keyPattern = String("\"") + key + "\"";
  const int keyPos = json.indexOf(keyPattern);
  if (keyPos < 0)
  {
    return "";
  }

  const int colonPos = json.indexOf(':', keyPos + keyPattern.length());
  if (colonPos < 0)
  {
    return "";
  }

  const int valueStart = json.indexOf('"', colonPos + 1);
  if (valueStart < 0)
  {
    return "";
  }

  int valueEnd = valueStart + 1;
  bool escaped = false;
  while (valueEnd < json.length())
  {
    const char ch = json[valueEnd];
    if (ch == '\\' && !escaped)
    {
      escaped = true;
      valueEnd++;
      continue;
    }
    if (ch == '"' && !escaped)
    {
      break;
    }
    escaped = false;
    valueEnd++;
  }

  if (valueEnd >= json.length())
  {
    return "";
  }

  String parsed = json.substring(valueStart + 1, valueEnd);
  parsed.replace("\\/", "/");
  parsed.replace("\\\"", "\"");
  parsed.replace("\\\\", "\\");
  return parsed;
}

String htmlEscape(const String &value)
{
  String escaped;
  escaped.reserve(value.length() + 16);
  for (size_t index = 0; index < value.length(); index++)
  {
    const char ch = value[index];
    switch (ch)
    {
    case '&':
      escaped += "&amp;";
      break;
    case '<':
      escaped += "&lt;";
      break;
    case '>':
      escaped += "&gt;";
      break;
    case '"':
      escaped += "&quot;";
      break;
    case '\'':
      escaped += "&#39;";
      break;
    default:
      escaped += ch;
      break;
    }
  }
  return escaped;
}

String renderDeviceRootPage(const DeviceRootPageContext &context)
{
  String html = "<!doctype html><html><head><meta charset=\"utf-8\">";
  html += "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">";
  html += "<title>M5PaperS3</title>";
  html += "<style>";
  html += "body{font-family:system-ui,sans-serif;background:#f5f5f4;color:#18181b;margin:0;padding:24px;}";
  html += ".wrap{max-width:860px;margin:0 auto;display:grid;gap:18px;}";
  html += ".card{background:#fff;border:1px solid #d4d4d8;border-radius:18px;padding:24px;box-shadow:0 8px 24px rgba(0,0,0,.04);}";
  html += ".grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));}";
  html += ".stack{display:grid;gap:12px;}";
  html += "h1,h2,h3{margin:0 0 10px;}p{line-height:1.5;margin:0 0 10px;}small,.muted{color:#52525b;}";
  html += "code{background:#f4f4f5;padding:2px 6px;border-radius:6px;word-break:break-all;}";
  html += "label{display:grid;gap:6px;font-size:14px;color:#27272a;}";
  html += "input,select{width:100%;padding:10px 12px;border:1px solid #d4d4d8;border-radius:10px;font:inherit;box-sizing:border-box;}";
  html += "button{padding:10px 14px;border-radius:10px;border:0;background:#18181b;color:#fff;font:inherit;cursor:pointer;}";
  html += ".secondary{background:#e4e4e7;color:#18181b;}";
  html += ".row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;}";
  html += ".badge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;background:#e4e4e7;color:#18181b;}";
  html += ".ok{background:#dcfce7;color:#166534;}.warn{background:#fef3c7;color:#92400e;}.err{background:#fee2e2;color:#991b1b;}";
  html += ".notice{padding:12px 14px;border-radius:12px;background:#dcfce7;color:#166534;}";
  html += ".error{padding:12px 14px;border-radius:12px;background:#fee2e2;color:#991b1b;}";
  html += "ul{margin:10px 0 0;padding-left:20px;}hr{border:0;border-top:1px solid #e4e4e7;margin:18px 0;}";
  html += "@media (max-width:640px){body{padding:16px;}.card{padding:18px;}}";
  html += "</style></head><body><div class=\"wrap\">";

  if (context.currentNotice.length() > 0)
  {
    html += "<div class=\"notice\">";
    html += htmlEscape(context.currentNotice);
    html += "</div>";
  }

  if (context.currentError.length() > 0)
  {
    html += "<div class=\"error\">";
    html += htmlEscape(context.currentError);
    html += "</div>";
  }

  html += "<section class=\"card stack\"><div class=\"row\" style=\"justify-content:space-between;align-items:flex-start;\">";
  html += "<div><h1>M5PaperS3 is online</h1><p class=\"muted\">Configure MQTT directly on the device and use the topics below from Home Assistant.</p></div>";
  html += "<span class=\"badge ";
  html += context.wifiConnected ? "ok" : "err";
  html += "\">Wi-Fi ";
  html += context.wifiConnected ? "connected" : "offline";
  html += "</span></div><div class=\"grid\">";
  html += "<div><strong>IP</strong><p><code>";
  html += htmlEscape(context.ipAddress);
  html += "</code></p></div>";
  html += "<div><strong>Firmware</strong><p>";
  html += htmlEscape(context.firmwareDisplayName);
  html += "</p></div>";
  html += "<div><strong>Version</strong><p>";
  html += htmlEscape(context.firmwareVersionName);
  html += "</p></div>";
  html += "<div><strong>MQTT</strong><p><span class=\"badge ";
  if (!context.mqttConfigured)
  {
    html += "warn\">disabled";
  }
  else if (context.mqttConnected)
  {
    html += "ok\">connected";
  }
  else
  {
    html += "err\">disconnected";
  }
  html += "</span></p></div></div></section>";

  html += "<section class=\"card stack\"><h2>Display</h2><div class=\"grid\">";
  html += "<div><strong>Current page</strong><p>";
  html += htmlEscape(context.currentPageName);
  html += " <span class=\"muted\">(index ";
  html += context.currentPageIndex;
  html += ")</span></p></div>";
  html += "<div><strong>Dark mode</strong><p>";
  html += context.darkModeEnabled ? "Enabled" : "Disabled";
  html += "</p></div></div>";
  html += "<div class=\"row\"><form method=\"post\" action=\"/api/page\"><button class=\"secondary\" type=\"submit\" name=\"action\" value=\"previous\">Previous Page</button></form>";
  html += "<form method=\"post\" action=\"/api/page\"><button class=\"secondary\" type=\"submit\" name=\"action\" value=\"next\">Next Page</button></form>";
  html += "<form method=\"post\" action=\"/api/dark-mode\"><button type=\"submit\" name=\"action\" value=\"toggle\">Toggle Dark Mode</button></form></div>";
  html += "<form method=\"post\" action=\"/api/page\" class=\"stack\"><label>Open page<select name=\"page\">";
  html += context.pageOptionsHtml;
  html += "</select></label><div class=\"row\"><button type=\"submit\">Show Page</button></div></form></section>";

  html += "<section class=\"card stack\"><h2>MQTT Settings</h2>";
  html += "<p class=\"muted\">Home Assistant discovery creates an MQTT select for page changes and an MQTT switch for dark mode.</p>";
  html += "<form method=\"post\" action=\"/api/mqtt\" class=\"stack\">";
  html += "<label><span>Enable MQTT</span><input type=\"checkbox\" name=\"enabled\" value=\"1\"";
  if (context.mqttEnabled)
  {
    html += " checked";
  }
  html += "></label>";
  html += "<div class=\"grid\">";
  html += "<label><span>Broker host</span><input name=\"host\" placeholder=\"192.168.1.10\" value=\"";
  html += htmlEscape(context.mqttHost);
  html += "\"></label>";
  html += "<label><span>Port</span><input name=\"port\" type=\"number\" min=\"1\" max=\"65535\" value=\"";
  html += context.mqttPort;
  html += "\"></label></div>";
  html += "<div class=\"grid\">";
  html += "<label><span>Username</span><input name=\"username\" autocomplete=\"username\" value=\"";
  html += htmlEscape(context.mqttUsername);
  html += "\"></label>";
  html += "<label><span>Password</span><input name=\"password\" type=\"password\" autocomplete=\"current-password\" value=\"";
  html += htmlEscape(context.mqttPassword);
  html += "\"></label></div>";
  html += "<div class=\"grid\">";
  html += "<label><span>Topic prefix</span><input name=\"topic_prefix\" placeholder=\"m5papers3/my-frame\" value=\"";
  html += htmlEscape(context.mqttConfiguredTopicPrefix);
  html += "\"></label>";
  html += "<label><span>Discovery prefix</span><input name=\"discovery_prefix\" placeholder=\"homeassistant\" value=\"";
  html += htmlEscape(context.mqttConfiguredDiscoveryPrefix);
  html += "\"></label></div>";
  html += "<label><span>Enable Home Assistant discovery</span><input type=\"checkbox\" name=\"discovery_enabled\" value=\"1\"";
  if (context.mqttDiscoveryEnabled)
  {
    html += " checked";
  }
  html += "></label>";
  html += "<div class=\"row\"><button type=\"submit\">Save MQTT Settings</button></div></form>";
  if (context.lastMqttError != nullptr && context.lastMqttError[0] != '\0')
  {
    html += "<p class=\"muted\">Last MQTT status: <code>";
    html += htmlEscape(context.lastMqttError);
    html += "</code></p>";
  }
  html += "</section>";

  html += "<section class=\"card stack\"><h2>Topics</h2>";
  html += "<p><strong>Base topic:</strong> <code>";
  html += htmlEscape(context.mqttTopicPrefix);
  html += "</code></p><ul>";
  html += "<li><code>";
  html += htmlEscape(context.mqttTopicPrefix + "/page/set");
  html += "</code> accepts page name, page number, <code>next</code>, or <code>previous</code>.</li>";
  html += "<li><code>";
  html += htmlEscape(context.mqttTopicPrefix + "/page/state");
  html += "</code> publishes the current page name.</li>";
  html += "<li><code>";
  html += htmlEscape(context.mqttTopicPrefix + "/page/index");
  html += "</code> publishes the zero-based current page index.</li>";
  html += "<li><code>";
  html += htmlEscape(context.mqttTopicPrefix + "/dark_mode/set");
  html += "</code> accepts <code>ON</code>, <code>OFF</code>, or <code>TOGGLE</code>.</li>";
  html += "<li><code>";
  html += htmlEscape(context.mqttTopicPrefix + "/dark_mode/state");
  html += "</code> publishes <code>ON</code> or <code>OFF</code>.</li>";
  html += "<li><code>";
  html += htmlEscape(context.mqttTopicPrefix + "/availability");
  html += "</code> publishes device availability.</li></ul>";
  html += "<p><strong>Discovery prefix:</strong> <code>";
  html += htmlEscape(context.discoveryPrefix);
  html += "</code></p></section>";

  html += "<section class=\"card stack\"><h2>OTA</h2><p>Use this IP in the web app to save the device for OTA updates.</p>";
  html += "<p class=\"muted\">Firmware uploads are still available at <code>/api/ota</code> and <code>/api/ota/upload</code>.</p></section>";
  html += "</div></body></html>";
  return html;
}
