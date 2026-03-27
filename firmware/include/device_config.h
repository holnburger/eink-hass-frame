#pragma once

// Optional fallback Wi-Fi credentials.
// Leave empty to enforce USB serial provisioning from the web UI.
#define WIFI_SSID ""
#define WIFI_PASSWORD ""

// Partial refresh strategy
#define PARTIAL_REFRESH_MS 30000
#define FULL_REFRESH_EVERY_N_PARTIALS 20

// After a touch-driven partial redraw, do a cleanup full refresh once touch
// activity has been idle for this long. Set to 0 to disable.
#define TOUCH_IDLE_FULL_REFRESH_MS 3000
