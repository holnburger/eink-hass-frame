# Firmware (M5PaperS3 + FastEPD)

This folder contains a PlatformIO firmware starter for M5PaperS3 with FastEPD.

## Goals

- Grayscale rendering
- Touch-enabled UI pages
- Partial updates for dynamic regions (clock, weather, progress)
- USB first-flash from web UI (Web Serial)
- OTA updates after initial provisioning
- MQTT page switching and dark-mode control
- On-device MQTT configuration page

## Board profile

The PlatformIO env is configured for ESP32-S3 with 16MB flash + OPI PSRAM (required by PaperS3/FastEPD init path).

## Build

```bash
cd firmware
pio run
```

## Export binaries for web flashing

Preferred flow: use the dashboard `Build Firmware` button. It calls `/api/firmware/build`, compiles with PlatformIO, and stores binaries in backend artifact storage. The flasher reads `/api/firmware/manifest` and `/api/firmware/artifacts/*`.

You can provide Wi-Fi SSID/password in the dashboard before building. These credentials are embedded into generated firmware config for first-boot auto-connect.

## USB flashing from browser

Use Chrome/Edge and open the dashboard. The Web Serial install button is backed by `esp-web-tools`.

## Wi-Fi credentials source

Wi-Fi SSID/password are expected from build-time dashboard inputs and embedded into generated firmware config.
The device prints `WIFI_CONNECTED IP=<device-ip>` on successful connection, and the web UI can read this via serial monitor.

## On-device status messages

When FastEPD initializes successfully, the firmware shows short English status messages on the E-Ink display:

- `Flash successful` after boot
- `Connecting to Wi-Fi` during join
- `Setup complete` with device IP after successful Wi-Fi connection

## OTA contract

The dashboard build step writes fresh artifacts for the currently configured layout, and the OTA route uploads the built `firmware.bin` directly to `http://<device-ip>/api/ota/upload`.

Implement HTTPS verification and secure token validation before production usage.

## On-device MQTT config

After the device joins Wi-Fi, open `http://<device-ip>/` to access the built-in configuration page.

You can configure:

- MQTT broker host, port, username, and password
- MQTT topic prefix
- Home Assistant MQTT discovery prefix
- Whether discovery is enabled

The same page also shows:

- Current page and dark-mode status
- Effective MQTT topics
- Quick buttons for page switching and dark-mode toggling

## MQTT topics

With the default topic prefix, the device publishes and subscribes under:

- `m5papers3/<device-id>/page/set`
- `m5papers3/<device-id>/page/state`
- `m5papers3/<device-id>/page/index`
- `m5papers3/<device-id>/dark_mode/set`
- `m5papers3/<device-id>/dark_mode/state`
- `m5papers3/<device-id>/availability`

`page/set` accepts the page name, a page number, `next`, or `previous`.

`dark_mode/set` accepts `ON`, `OFF`, or `TOGGLE`.

If Home Assistant discovery is enabled, the firmware also publishes discovery payloads for:

- an MQTT `select` entity for page changes
- an MQTT `switch` entity for dark mode
- power entities for plugged-in state and battery percentage
- diagnostic sensors for Wi-Fi, uptime, memory, IP/build info, and last error state

## MQTT diagnostic entities

When MQTT discovery is enabled, Home Assistant will also get diagnostic entities for:

- Plugged in
- Battery level
- Wi-Fi connected
- MQTT connected
- Home Assistant connected
- Wi-Fi RSSI
- Uptime
- Free heap
- Free PSRAM
- IP address
- Firmware version
- Build ID
- Page index
- Last MQTT error
- Last Home Assistant error

Battery level is estimated from the PaperS3 battery-detect ADC input, so treat it as a practical percentage estimate rather than a fuel-gauge reading.
