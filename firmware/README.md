# Firmware (M5PaperS3 + FastEPD)

This folder contains a PlatformIO firmware starter for M5PaperS3 with FastEPD.

## Goals

- Grayscale rendering
- Touch-enabled UI pages
- Partial updates for dynamic regions (clock, weather, progress)
- USB first-flash from web UI (Web Serial)
- OTA updates after initial provisioning

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
