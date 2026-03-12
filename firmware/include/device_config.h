#pragma once

// Optional fallback Wi-Fi credentials.
// Leave empty to enforce USB serial provisioning from the web UI.
#define WIFI_SSID ""
#define WIFI_PASSWORD ""

// Partial refresh strategy
#define PARTIAL_REFRESH_MS 30000
#define FULL_REFRESH_EVERY_N_PARTIALS 20
